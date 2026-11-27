-- Apply as the database owner, in an outer transaction. No existing row is backfilled.
CREATE SCHEMA coordination_private;
REVOKE ALL ON SCHEMA coordination_private FROM PUBLIC, anon, authenticated;
CREATE ROLE coordination_runtime NOLOGIN NOINHERIT NOCREATEDB NOCREATEROLE;
DO $$ BEGIN
  EXECUTE format('GRANT coordination_runtime TO %I WITH INHERIT FALSE', current_user);
END $$;
GRANT USAGE, CREATE ON SCHEMA coordination_private TO coordination_runtime;
GRANT USAGE ON SCHEMA public TO coordination_runtime;

CREATE TABLE coordination_private.institutions (
  id text PRIMARY KEY CHECK (length(btrim(id)) BETWEEN 1 AND 100),
  name text NOT NULL CHECK (length(btrim(name)) BETWEEN 1 AND 200)
);
CREATE TABLE coordination_private.memberships (
  profile_id text PRIMARY KEY REFERENCES public.profiles(id) ON DELETE RESTRICT,
  auth_user_id uuid UNIQUE NOT NULL,
  institution_id text NOT NULL REFERENCES coordination_private.institutions(id),
  role text NOT NULL CHECK (role IN ('coordinator', 'teacher', 'student', 'admin')),
  academic_block text NOT NULL CHECK (length(btrim(academic_block)) BETWEEN 1 AND 90),
  enabled boolean NOT NULL DEFAULT true
);
CREATE INDEX coordination_memberships_directory ON coordination_private.memberships (institution_id, role, profile_id) WHERE enabled;
CREATE TABLE coordination_private.periods (
  period_id text PRIMARY KEY REFERENCES public.academic_periods(id) ON DELETE RESTRICT ON UPDATE RESTRICT,
  institution_id text NOT NULL REFERENCES coordination_private.institutions(id)
);

DO $$
DECLARE relation text;
BEGIN
  FOREACH relation IN ARRAY ARRAY['courses', 'direct_threads', 'community_groups', 'calendar_events', 'notices'] LOOP
    EXECUTE format('ALTER TABLE public.%I ADD COLUMN coordination_institution_id text REFERENCES coordination_private.institutions(id)', relation);
    EXECUTE format('CREATE INDEX %I ON public.%I (coordination_institution_id) WHERE coordination_institution_id IS NOT NULL',
      relation || '_coordination_institution', relation);
  END LOOP;
END $$;
CREATE TABLE coordination_private.event_recipients (
  event_id text NOT NULL REFERENCES public.calendar_events(id) ON DELETE CASCADE,
  profile_id text NOT NULL REFERENCES coordination_private.memberships(profile_id),
  PRIMARY KEY (event_id, profile_id)
);
CREATE INDEX coordination_event_recipients_profile ON coordination_private.event_recipients (profile_id, event_id);

DO $$
DECLARE relation text;
BEGIN
  FOREACH relation IN ARRAY ARRAY['institutions', 'memberships', 'periods', 'event_recipients'] LOOP
    EXECUTE format('REVOKE ALL ON coordination_private.%I FROM PUBLIC, anon, authenticated', relation);
    EXECUTE format('ALTER TABLE coordination_private.%I ENABLE ROW LEVEL SECURITY', relation);
    EXECUTE format('CREATE POLICY coordination_runtime_read ON coordination_private.%I FOR SELECT TO coordination_runtime USING (true)', relation);
    EXECUTE format('GRANT SELECT ON coordination_private.%I TO coordination_runtime', relation);
  END LOOP;
  FOREACH relation IN ARRAY ARRAY[
    'profiles', 'academic_periods', 'courses', 'course_schedules', 'course_lessons', 'course_activities',
    'activity_submissions', 'course_enrollments', 'course_attendance', 'direct_threads', 'direct_messages',
    'community_groups', 'calendar_events', 'notices'
  ] LOOP
    EXECUTE format('CREATE POLICY coordination_runtime_read ON public.%I FOR SELECT TO coordination_runtime USING (true)', relation);
    IF relation <> 'profiles' THEN
      EXECUTE format('GRANT SELECT ON public.%I TO coordination_runtime', relation);
    END IF;
  END LOOP;
  FOREACH relation IN ARRAY ARRAY['courses', 'course_schedules', 'course_activities', 'course_attendance',
    'direct_threads', 'direct_messages', 'community_groups', 'calendar_events'] LOOP
    EXECUTE format('CREATE POLICY coordination_runtime_insert ON public.%I FOR INSERT TO coordination_runtime WITH CHECK (true)', relation);
    EXECUTE format('GRANT INSERT ON public.%I TO coordination_runtime', relation);
  END LOOP;
END $$;
GRANT SELECT (id, full_name, bio, is_profile_public, preferred_language, preferred_theme) ON public.profiles TO coordination_runtime;
GRANT UPDATE (full_name, initials, bio, is_profile_public, preferred_language, preferred_theme, updated_at) ON public.profiles TO coordination_runtime;
GRANT UPDATE (name, description, category, academic_block) ON public.courses TO coordination_runtime;
GRANT UPDATE (status, recorded_by) ON public.course_attendance TO coordination_runtime;
GRANT UPDATE (incident_status, updated_at) ON public.direct_threads TO coordination_runtime;
CREATE POLICY coordination_runtime_update ON public.profiles FOR UPDATE TO coordination_runtime USING (true) WITH CHECK (true);
CREATE POLICY coordination_runtime_update ON public.courses FOR UPDATE TO coordination_runtime USING (coordination_institution_id IS NOT NULL) WITH CHECK (coordination_institution_id IS NOT NULL);
CREATE POLICY coordination_runtime_update ON public.course_attendance FOR UPDATE TO coordination_runtime
USING (EXISTS (SELECT 1 FROM public.courses c WHERE c.id = course_id AND c.coordination_institution_id IS NOT NULL))
WITH CHECK (EXISTS (SELECT 1 FROM public.courses c WHERE c.id = course_id AND c.coordination_institution_id IS NOT NULL));
CREATE POLICY coordination_runtime_update ON public.direct_threads FOR UPDATE TO coordination_runtime USING (coordination_institution_id IS NOT NULL) WITH CHECK (coordination_institution_id IS NOT NULL);
GRANT INSERT ON coordination_private.event_recipients TO coordination_runtime;
CREATE POLICY coordination_runtime_insert ON coordination_private.event_recipients FOR INSERT TO coordination_runtime WITH CHECK (true);
GRANT USAGE ON SEQUENCE public.course_schedules_id_seq, public.course_attendance_id_seq, public.direct_messages_id_seq TO coordination_runtime;

-- RLS does not cover table-wide TRUNCATE or the ability to register triggers.
-- Remove those legacy grants only on relations holding or anchoring managed data.
REVOKE TRUNCATE, TRIGGER ON TABLE public.profiles, public.academic_periods, public.courses,
  public.course_schedules, public.course_lessons, public.course_activities,
  public.activity_submissions, public.course_enrollments, public.course_attendance,
  public.direct_threads, public.direct_messages, public.community_groups, public.community_memberships,
  public.community_messages, public.calendar_events, public.notices FROM PUBLIC, anon, authenticated;

-- The hosted owner can read Auth, but cannot delegate Auth-schema privileges. This
-- isolated bridge returns only the caller's own, still-live non-guest subject.
CREATE FUNCTION coordination_private.auth_subject() RETURNS uuid
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
  SELECT u.id FROM auth.users AS u
  WHERE u.id = auth.uid() AND NOT u.is_anonymous AND u.deleted_at IS NULL;
$$;

-- These predicates run as a private read-only SQL surface over the marked rows,
-- including when the caller cannot see the parent row due to RLS.
CREATE FUNCTION coordination_private.legacy_unmanaged(kind text, object_id text) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
  SELECT object_id IS NULL OR CASE kind
    WHEN 'profile' THEN NOT EXISTS (SELECT 1 FROM coordination_private.memberships m WHERE m.profile_id = object_id)
    WHEN 'period' THEN NOT EXISTS (SELECT 1 FROM coordination_private.periods p WHERE p.period_id = object_id)
    WHEN 'course' THEN NOT EXISTS (SELECT 1 FROM public.courses c WHERE c.id = object_id AND c.coordination_institution_id IS NOT NULL)
    WHEN 'lesson' THEN NOT EXISTS (
      SELECT 1 FROM public.course_lessons l JOIN public.courses c ON c.id = l.course_id
      WHERE l.id = object_id AND c.coordination_institution_id IS NOT NULL)
    WHEN 'activity' THEN NOT EXISTS (
      SELECT 1 FROM public.course_activities a JOIN public.courses c ON c.id = a.course_id
      LEFT JOIN public.course_lessons l ON l.id = a.lesson_id
      LEFT JOIN public.courses lc ON lc.id = l.course_id
      WHERE a.id = object_id AND (c.coordination_institution_id IS NOT NULL OR lc.coordination_institution_id IS NOT NULL))
    WHEN 'thread' THEN NOT EXISTS (
      SELECT 1 FROM public.direct_threads t LEFT JOIN public.courses c ON c.id = t.course_id
      WHERE t.id = object_id AND (t.coordination_institution_id IS NOT NULL OR c.coordination_institution_id IS NOT NULL))
    WHEN 'group' THEN NOT EXISTS (
      SELECT 1 FROM public.community_groups g LEFT JOIN public.courses c ON c.id = g.course_id
      WHERE g.id = object_id AND (g.coordination_institution_id IS NOT NULL OR c.coordination_institution_id IS NOT NULL))
    ELSE false END;
$$;

CREATE POLICY coordination_legacy_scope ON public.profiles AS RESTRICTIVE FOR ALL TO anon, authenticated
USING (coordination_private.legacy_unmanaged('profile', id))
WITH CHECK (coordination_private.legacy_unmanaged('profile', id));

-- Period metadata remains readable to preserve legacy views of any shared period.
CREATE POLICY coordination_legacy_period_update ON public.academic_periods AS RESTRICTIVE FOR UPDATE TO anon, authenticated
USING (coordination_private.legacy_unmanaged('period', id))
WITH CHECK (coordination_private.legacy_unmanaged('period', id));
CREATE POLICY coordination_legacy_period_delete ON public.academic_periods AS RESTRICTIVE FOR DELETE TO anon, authenticated
USING (coordination_private.legacy_unmanaged('period', id));

DO $$
DECLARE relation text;
DECLARE parent_ref text;
DECLARE checks text;
BEGIN
  FOR relation, parent_ref IN SELECT * FROM (VALUES
    ('courses', NULL), ('direct_threads', 'course_id'), ('community_groups', 'course_id'),
    ('calendar_events', 'target_course_id'), ('notices', 'course_id')
  ) AS targets(name, key) LOOP
    checks := 'coordination_institution_id IS NULL';
    IF parent_ref IS NOT NULL THEN
      checks := checks || format(' AND coordination_private.legacy_unmanaged(''course'', %I)', parent_ref);
    END IF;
    EXECUTE format('CREATE POLICY coordination_legacy_scope ON public.%I AS RESTRICTIVE FOR ALL TO anon, authenticated USING (%s) WITH CHECK (%s)',
      relation, checks, checks);
  END LOOP;
  FOR relation, checks IN SELECT * FROM (VALUES
    ('course_schedules', 'coordination_private.legacy_unmanaged(''course'', course_id)'),
    ('course_lessons', 'coordination_private.legacy_unmanaged(''course'', course_id)'),
    ('course_activities', 'coordination_private.legacy_unmanaged(''course'', course_id) AND coordination_private.legacy_unmanaged(''lesson'', lesson_id)'),
    ('course_enrollments', 'coordination_private.legacy_unmanaged(''course'', course_id)'),
    ('course_attendance', 'coordination_private.legacy_unmanaged(''course'', course_id)'),
    ('activity_submissions', 'coordination_private.legacy_unmanaged(''activity'', activity_id)'),
    ('direct_messages', 'coordination_private.legacy_unmanaged(''thread'', thread_id)'),
    ('community_memberships', 'coordination_private.legacy_unmanaged(''group'', group_id)'),
    ('community_messages', 'coordination_private.legacy_unmanaged(''group'', group_id)')
  ) AS targets(name, scope_check) LOOP
    EXECUTE format('CREATE POLICY coordination_legacy_scope ON public.%I AS RESTRICTIVE FOR ALL TO anon, authenticated USING (%s) WITH CHECK (%s)',
      relation, checks, checks);
  END LOOP;
END $$;

-- The previous owner-running view otherwise bypasses the new table guards.
ALTER VIEW public.v_course_analytics SET (security_invoker = true);

-- The older profile-approval RPC runs as postgres (outside RLS). Prevent its
-- conflict-update path from altering an explicitly bound profile. Only the
-- private runtime can update the safe profile columns granted above.
CREATE FUNCTION coordination_private.guard_profile_write() RETURNS trigger
LANGUAGE plpgsql SECURITY INVOKER SET search_path = '' AS $$
BEGIN
  IF current_user <> 'coordination_runtime' AND NOT coordination_private.legacy_unmanaged('profile', OLD.id) THEN
    RAISE EXCEPTION 'A managed profile cannot be edited through the legacy path' USING ERRCODE = '42501';
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER coordination_profile_write
BEFORE UPDATE OF email, password_hash, full_name, initials, role, role_label, academic_block,
  institution, bio, social_links, public_activities, is_profile_public, preferred_theme, preferred_language
ON public.profiles FOR EACH ROW EXECUTE FUNCTION coordination_private.guard_profile_write();

CREATE FUNCTION coordination_private.actor() RETURNS coordination_private.memberships
LANGUAGE sql STABLE SET search_path = '' AS $$
  SELECT m.* FROM coordination_private.memberships m
  WHERE m.auth_user_id = (SELECT coordination_private.auth_subject()) AND m.enabled;
$$;

CREATE FUNCTION coordination_private.identity() RETURNS jsonb
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
  SELECT jsonb_build_object('id', m.profile_id, 'full_name', p.full_name, 'role', m.role, 'institution', i.name)
  FROM coordination_private.actor() m JOIN public.profiles p ON p.id = m.profile_id
  JOIN coordination_private.institutions i ON i.id = m.institution_id;
$$;

CREATE FUNCTION coordination_private.course_access(course_key text, m coordination_private.memberships) RETURNS boolean
LANGUAGE sql STABLE SET search_path = '' AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.courses c
    WHERE c.id = course_key AND c.coordination_institution_id = m.institution_id
      AND (m.role = 'coordinator' OR (m.role = 'teacher' AND c.teacher_id = m.profile_id)
        OR (m.role = 'student' AND EXISTS (
          SELECT 1 FROM public.course_enrollments e
          WHERE e.course_id = c.id AND e.student_id = m.profile_id AND e.enrolled AND e.status = 'active'
        )))
  );
$$;

CREATE FUNCTION coordination_private.snapshot() RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = '' AS $$
DECLARE m coordination_private.memberships := coordination_private.actor();
BEGIN
  IF m.role IS NULL OR m.role NOT IN ('coordinator', 'admin') THEN
    RAISE EXCEPTION 'Institutional staff membership required' USING ERRCODE = '42501';
  END IF;
  RETURN (
    WITH
    scoped_courses AS (
      SELECT id, name, description, category, academic_block, teacher_id, teacher_name, period_id, start_date, end_date
      FROM public.courses WHERE coordination_institution_id = m.institution_id
    ),
    scoped_people AS (
      SELECT d.profile_id AS id, p.full_name, d.role, d.academic_block,
        CASE WHEN d.profile_id = m.profile_id OR (m.role = 'coordinator' AND p.is_profile_public) THEN p.bio END AS bio,
        p.is_profile_public
      FROM coordination_private.memberships d JOIN public.profiles p ON p.id = d.profile_id
      WHERE d.enabled AND d.institution_id = m.institution_id
        AND (m.role = 'coordinator' OR d.role IN ('teacher','student') OR d.profile_id = m.profile_id)
    ),
    scoped_enrollments AS (
      SELECT e.course_id, e.student_id, e.enrolled, e.enrolled_at, e.status
      FROM public.course_enrollments e JOIN scoped_courses c ON c.id = e.course_id
      JOIN scoped_people p ON p.id = e.student_id AND p.role = 'student'
    ),
    scoped_activities AS (
      SELECT a.id, a.course_id, a.title, a.instructions, a.due_date, a.max_score
      FROM public.course_activities a JOIN scoped_courses c ON c.id = a.course_id
    ),
    scoped_threads AS (
      SELECT id, course_id, subject, created_by, recipient_id, incident_status, thread_kind
      FROM public.direct_threads WHERE coordination_institution_id = m.institution_id AND m.role = 'coordinator'
        AND (thread_kind = 'incident_report' OR m.profile_id IN (created_by, recipient_id))
    )
    SELECT jsonb_build_object(
      'me', (SELECT to_jsonb(p) || jsonb_build_object('institution', i.name,
        'preferred_language', f.preferred_language, 'preferred_theme', f.preferred_theme)
        FROM scoped_people p JOIN public.profiles f ON f.id = p.id
        JOIN coordination_private.institutions i ON i.id = m.institution_id WHERE p.id = m.profile_id),
      'people', COALESCE((SELECT jsonb_agg(p ORDER BY p.full_name, p.id) FROM scoped_people p), '[]'),
      'periods', COALESCE((SELECT jsonb_agg(p ORDER BY p.start_date, p.id) FROM (
        SELECT a.id, a.name, a.start_date, a.end_date FROM public.academic_periods a
        JOIN coordination_private.periods d ON d.period_id = a.id WHERE d.institution_id = m.institution_id
      ) p), '[]'),
      'courses', COALESCE((SELECT jsonb_agg(c ORDER BY c.name, c.id) FROM scoped_courses c), '[]'),
      'schedules', COALESCE((SELECT jsonb_agg(s ORDER BY s.course_id, s.day_of_week, s.start_time) FROM (
        SELECT s.course_id, s.day_of_week, s.start_time, s.end_time
        FROM public.course_schedules s JOIN scoped_courses c ON c.id = s.course_id
      ) s), '[]'),
      'lessons', COALESCE((SELECT jsonb_agg(l ORDER BY l.course_id, l.position, l.id) FROM (
        SELECT l.id, l.course_id, l.title, l.position
        FROM public.course_lessons l JOIN scoped_courses c ON c.id = l.course_id
      ) l), '[]'),
      'activities', COALESCE((SELECT jsonb_agg(a ORDER BY a.due_date, a.id) FROM scoped_activities a), '[]'),
      'submissions', COALESCE((SELECT jsonb_agg(s ORDER BY s.submitted_at, s.id) FROM (
        SELECT s.id, s.activity_id, s.student_id, s.submitted_at, s.score
        FROM public.activity_submissions s JOIN scoped_activities a ON a.id = s.activity_id
        JOIN scoped_enrollments e ON (e.course_id, e.student_id) = (a.course_id, s.student_id) AND e.enrolled
      ) s), '[]'),
      'enrollments', COALESCE((SELECT jsonb_agg(e ORDER BY e.course_id, e.student_id) FROM scoped_enrollments e), '[]'),
      'attendance', COALESCE((SELECT jsonb_agg(a ORDER BY a.session_date, a.course_id, a.student_id) FROM (
        SELECT a.course_id, a.student_id, a.session_date, a.status
        FROM public.course_attendance a JOIN scoped_enrollments e USING (course_id, student_id)
        WHERE e.enrolled AND e.status IN ('active', 'completed')
      ) a), '[]'),
      'threads', COALESCE((SELECT jsonb_agg(t ORDER BY t.id) FROM scoped_threads t), '[]'),
      'messages', COALESCE((SELECT jsonb_agg(d ORDER BY d.sent_at, d.id) FROM (
        SELECT d.id, d.thread_id, d.sender_id, d.sender_name, d.content, d.sent_at
        FROM public.direct_messages d JOIN scoped_threads t ON t.id = d.thread_id
      ) d), '[]'),
      'groups', COALESCE((SELECT jsonb_agg(g ORDER BY g.name, g.id) FROM (
        SELECT id, name, category, course_id, academic_block, period_id, assigned_teacher_id
        FROM public.community_groups WHERE coordination_institution_id = m.institution_id AND m.role = 'coordinator'
      ) g), '[]'),
      'events', COALESCE((SELECT jsonb_agg(e ORDER BY e.event_date, e.start_time, e.id) FROM (
        SELECT e.id, e.title, e.event_date, e.start_time, e.end_time, e.location,
          CASE WHEN EXISTS (SELECT 1 FROM coordination_private.event_recipients r WHERE r.event_id = e.id)
            THEN 'individual' ELSE e.visibility_scope END AS visibility_scope,
          e.target_role, e.target_course_id, e.target_block, e.owner_id
        FROM public.calendar_events e WHERE e.coordination_institution_id = m.institution_id AND m.role = 'coordinator'
        AND (e.visibility_scope <> 'personal' OR e.owner_id = m.profile_id)
      ) e), '[]'),
      'notices', COALESCE((SELECT jsonb_agg(n ORDER BY n.published_date DESC, n.id) FROM (
        SELECT id, title, content, published_date, course_id
        FROM public.notices WHERE coordination_institution_id = m.institution_id AND m.role = 'coordinator'
      ) n), '[]')
    )
  );
END;
$$;

CREATE FUNCTION coordination_private.validate_payload(data jsonb, allowed text[]) RETURNS void
LANGUAGE plpgsql IMMUTABLE SET search_path = '' AS $$
BEGIN
  IF jsonb_typeof(data) IS DISTINCT FROM 'object' OR pg_column_size(data) > 32000 THEN
    RAISE EXCEPTION 'A bounded object payload is required' USING ERRCODE = '22023';
  END IF;
  IF EXISTS (SELECT 1 FROM jsonb_object_keys(data) k WHERE NOT k = ANY(allowed)) THEN
    RAISE EXCEPTION 'The payload contains an unsupported field' USING ERRCODE = '22023';
  END IF;
END;
$$;

CREATE FUNCTION coordination_private.field(data jsonb, name text, max_length int, allow_empty boolean DEFAULT false) RETURNS text
LANGUAGE plpgsql IMMUTABLE SET search_path = '' AS $$
DECLARE value text := regexp_replace(data ->> name, '^[[:space:]]+|[[:space:]]+$', '', 'g');
BEGIN
  IF jsonb_typeof(data -> name) IS DISTINCT FROM 'string'
    OR length(value) > max_length OR (value = '' AND NOT allow_empty) THEN
    RAISE EXCEPTION 'Invalid field: %', name USING ERRCODE = '22023';
  END IF;
  RETURN value;
END;
$$;

CREATE FUNCTION coordination_private.date_field(data jsonb, name text) RETURNS date
LANGUAGE plpgsql IMMUTABLE SET search_path = '' AS $$
DECLARE value text := coordination_private.field(data, name, 10);
BEGIN
  IF value !~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$' THEN
    RAISE EXCEPTION 'Invalid date: %', name USING ERRCODE = '22023';
  END IF;
  RETURN value::date;
END;
$$;

CREATE FUNCTION coordination_private.time_field(data jsonb, name text) RETURNS time
LANGUAGE plpgsql IMMUTABLE SET search_path = '' AS $$
DECLARE value text := coordination_private.field(data, name, 5);
BEGIN
  IF value !~ '^([01][0-9]|2[0-3]):[0-5][0-9]$' THEN
    RAISE EXCEPTION 'Invalid time: %', name USING ERRCODE = '22023';
  END IF;
  RETURN value::time;
END;
$$;

CREATE FUNCTION coordination_private.send(m coordination_private.memberships, thread_key text, body text) RETURNS void
LANGUAGE plpgsql SET search_path = '' AS $$
BEGIN
  INSERT INTO public.direct_messages (thread_id, sender_id, sender_name, sender_role, content)
    SELECT thread_key, m.profile_id, p.full_name, m.role, body FROM public.profiles p WHERE p.id = m.profile_id;
  UPDATE public.direct_threads SET updated_at = now() WHERE id = thread_key;
END;
$$;

CREATE FUNCTION coordination_private.command(op text, data jsonb) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  m coordination_private.memberships := coordination_private.actor();
  person coordination_private.memberships;
  period public.academic_periods;
  course public.courses;
  object_key text := 'coord-' || gen_random_uuid()::text;
  course_key text;
  start_day date;
  end_day date;
  time_from time;
  time_until time;
  entry text;
  teacher_key text;
  teacher_name text;
  block_name text;
  period_key text;
  scope text;
  target_role text;
  category text;
  title text;
  day_count integer;
BEGIN
  IF m.role IS DISTINCT FROM 'coordinator'
    AND (m.role IS DISTINCT FROM 'admin' OR op IS NULL OR op NOT IN ('course.create','course.update')) THEN
    RAISE EXCEPTION 'Institutional permission required for this operation' USING ERRCODE = '42501';
  END IF;
  CASE op
    WHEN 'course.create' THEN
      PERFORM coordination_private.validate_payload(data, ARRAY['name','description','category','academic_block','teacher_id','period_id','start_date','end_date','days','start_time','end_time']);
      title := coordination_private.field(data, 'name', 100);
      category := coordination_private.field(data, 'category', 40);
      block_name := coordination_private.field(data, 'academic_block', 90);
      teacher_key := coordination_private.field(data, 'teacher_id', 200);
      period_key := coordination_private.field(data, 'period_id', 200);
      SELECT p.full_name INTO teacher_name FROM coordination_private.memberships d
        JOIN public.profiles p ON p.id = d.profile_id
        WHERE d.profile_id = teacher_key AND d.institution_id = m.institution_id AND d.role = 'teacher' AND d.enabled;
      SELECT a.* INTO period FROM public.academic_periods a JOIN coordination_private.periods d ON d.period_id = a.id
        WHERE a.id = period_key AND d.institution_id = m.institution_id;
      IF teacher_name IS NULL OR period.id IS NULL THEN
        RAISE EXCEPTION 'The instructor and period must belong to this institution' USING ERRCODE = '42501';
      END IF;
      start_day := coordination_private.date_field(data, 'start_date');
      end_day := coordination_private.date_field(data, 'end_date');
      time_from := coordination_private.time_field(data, 'start_time');
      time_until := coordination_private.time_field(data, 'end_time');
      IF start_day > end_day OR start_day < period.start_date OR end_day > period.end_date OR time_from >= time_until
        OR jsonb_typeof(data -> 'days') IS DISTINCT FROM 'array' THEN
        RAISE EXCEPTION 'Invalid dates or schedule for the selected period' USING ERRCODE = '22023';
      END IF;
      IF jsonb_array_length(data -> 'days') NOT BETWEEN 1 AND 7
        OR EXISTS (SELECT 1 FROM jsonb_array_elements(data -> 'days') d WHERE jsonb_typeof(d) <> 'number' OR d::text !~ '^[1-7]$') THEN
        RAISE EXCEPTION 'Use ISO weekdays 1 through 7' USING ERRCODE = '22023';
      END IF;
      SELECT count(DISTINCT d) INTO day_count FROM jsonb_array_elements_text(data -> 'days') d;
      IF day_count <> jsonb_array_length(data -> 'days') THEN
        RAISE EXCEPTION 'Schedule contains duplicate weekdays' USING ERRCODE = '22023';
      END IF;
      IF EXISTS (SELECT 1 FROM jsonb_array_elements_text(data -> 'days') d
        WHERE (d::int - extract(isodow FROM start_day)::int + 7) % 7 > end_day - start_day) THEN
        RAISE EXCEPTION 'A scheduled weekday does not occur during the course' USING ERRCODE = '22023';
      END IF;
      INSERT INTO public.courses (id, name, description, category, academic_block, teacher_id, teacher_name, period_id,
        start_date, end_date, duration_weeks, total_hours, schedule_summary, coordination_institution_id)
      VALUES (object_key, title, coordination_private.field(data, 'description', 4000, true), category, block_name,
        teacher_key, teacher_name, period_key, start_day, end_day, (end_day - start_day) / 7 + 1,
        ceil(extract(epoch FROM (time_until - time_from)) / 3600 * (
          SELECT sum(1 + ((end_day - start_day) - (d::int - extract(isodow FROM start_day)::int + 7) % 7) / 7)
          FROM jsonb_array_elements_text(data -> 'days') d
        ))::int, time_from::text || ' - ' || time_until::text, m.institution_id);
      INSERT INTO public.course_schedules (course_id, day_of_week, day_label, start_time, end_time, room)
      SELECT object_key, d::int, (ARRAY['Mon','Tue','Wed','Thu','Fri','Sat','Sun'])[d::int], time_from, time_until, ''
        FROM jsonb_array_elements_text(data -> 'days') d ORDER BY d::int;

    WHEN 'course.update' THEN
      IF m.role <> 'admin' THEN
        RAISE EXCEPTION 'Institutional administration required for this operation' USING ERRCODE = '42501';
      END IF;
      PERFORM coordination_private.validate_payload(data, ARRAY['course_id','name','description','category','academic_block']);
      object_key := coordination_private.field(data, 'course_id', 200);
      UPDATE public.courses AS c SET name = coordination_private.field(data, 'name', 100),
        description = coordination_private.field(data, 'description', 4000, true),
        category = coordination_private.field(data, 'category', 40),
        academic_block = coordination_private.field(data, 'academic_block', 90)
      WHERE c.id = object_key AND c.coordination_institution_id = m.institution_id;
      IF NOT FOUND THEN RAISE EXCEPTION 'Course unavailable' USING ERRCODE = '42501'; END IF;

    WHEN 'thread.create' THEN
      PERFORM coordination_private.validate_payload(data, ARRAY['subject','course_id','recipient_id','content','thread_kind']);
      course_key := coordination_private.field(data, 'course_id', 200);
      SELECT * INTO person FROM coordination_private.memberships d WHERE d.profile_id = coordination_private.field(data, 'recipient_id', 200)
        AND d.role IN ('student', 'teacher') AND d.institution_id = m.institution_id AND d.enabled;
      entry := coordination_private.field(data, 'thread_kind', 40);
      IF entry NOT IN ('incident_report', 'course_inquiry') THEN
        RAISE EXCEPTION 'Invalid thread kind' USING ERRCODE = '22023';
      END IF;
      IF person.profile_id IS NULL OR NOT coordination_private.course_access(course_key, person) THEN
        RAISE EXCEPTION 'The recipient does not participate in this course' USING ERRCODE = '42501';
      END IF;
      INSERT INTO public.direct_threads (id, thread_kind, course_id, subject, created_by, recipient_id, coordination_institution_id)
      VALUES (object_key, entry, course_key, coordination_private.field(data, 'subject', 160),
        m.profile_id, person.profile_id, m.institution_id);
      PERFORM coordination_private.send(m, object_key, coordination_private.field(data, 'content', 4000));

    WHEN 'thread.reply', 'thread.status' THEN
      PERFORM coordination_private.validate_payload(data, CASE op WHEN 'thread.reply' THEN ARRAY['thread_id','content']
        ELSE ARRAY['thread_id','incident_status'] END);
      object_key := coordination_private.field(data, 'thread_id', 200);
      IF NOT EXISTS (SELECT 1 FROM public.direct_threads t WHERE t.id = object_key AND t.coordination_institution_id = m.institution_id
        AND (t.thread_kind = 'incident_report' OR m.profile_id IN (t.created_by, t.recipient_id))
        AND (op = 'thread.reply' OR t.thread_kind = 'incident_report')) THEN
        RAISE EXCEPTION 'Thread unavailable' USING ERRCODE = '42501';
      END IF;
      IF op = 'thread.reply' THEN
        PERFORM coordination_private.send(m, object_key, coordination_private.field(data, 'content', 4000));
      ELSE
        entry := coordination_private.field(data, 'incident_status', 40);
        IF entry NOT IN ('open', 'verifying_with_instructor', 'resolved') THEN
          RAISE EXCEPTION 'Invalid incident status' USING ERRCODE = '22023';
        END IF;
        UPDATE public.direct_threads SET incident_status = entry, updated_at = now() WHERE id = object_key;
      END IF;

    WHEN 'group.create' THEN
      PERFORM coordination_private.validate_payload(data, ARRAY['name','category','course_id','academic_block','period_id','assigned_teacher_id']);
      title := coordination_private.field(data, 'name', 120);
      category := coordination_private.field(data, 'category', 40);
      course_key := coordination_private.field(data, 'course_id', 200);
      block_name := coordination_private.field(data, 'academic_block', 90);
      period_key := coordination_private.field(data, 'period_id', 200);
      teacher_key := coordination_private.field(data, 'assigned_teacher_id', 200);
      SELECT * INTO course FROM public.courses c WHERE c.id = course_key AND c.coordination_institution_id = m.institution_id;
      SELECT p.full_name INTO teacher_name FROM coordination_private.memberships d
        JOIN public.profiles p ON p.id = d.profile_id
        WHERE d.profile_id = teacher_key AND d.institution_id = m.institution_id AND d.role = 'teacher' AND d.enabled;
      IF course.id IS NULL OR teacher_name IS NULL OR (course.category, course.period_id, course.academic_block)
        IS DISTINCT FROM (category, period_key, block_name) THEN
        RAISE EXCEPTION 'The group must match its course, institution and an eligible instructor' USING ERRCODE = '42501';
      END IF;
      INSERT INTO public.community_groups (id, name, description, category, category_label, course_id, period_id, academic_block,
        assigned_teacher_id, mentor_name, created_by, member_count, online_count, coordination_institution_id)
      VALUES (object_key, title, '', category, category, course_key, period_key, block_name, teacher_key,
        teacher_name, m.profile_id, 0, 0, m.institution_id);

    WHEN 'event.create' THEN
      PERFORM coordination_private.validate_payload(data, ARRAY['title','event_date','start_time','end_time','location',
        'visibility_scope','target_course_id','target_block','target_role','recipient_ids']);
      title := coordination_private.field(data, 'title', 160);
      start_day := coordination_private.date_field(data, 'event_date');
      time_from := coordination_private.time_field(data, 'start_time');
      time_until := coordination_private.time_field(data, 'end_time');
      scope := coordination_private.field(data, 'visibility_scope', 40);
      IF time_from >= time_until OR scope NOT IN ('personal', 'course', 'block', 'role', 'individual')
        OR (data ? 'target_course_id') <> (scope = 'course') OR (data ? 'target_block') <> (scope = 'block')
        OR (data ? 'target_role') <> (scope = 'role') OR (data ? 'recipient_ids') <> (scope = 'individual') THEN
        RAISE EXCEPTION 'Invalid time or conflicting event audience' USING ERRCODE = '22023';
      END IF;
      IF scope = 'course' THEN
        course_key := coordination_private.field(data, 'target_course_id', 200);
        IF NOT coordination_private.course_access(course_key, m) THEN
          RAISE EXCEPTION 'Course unavailable' USING ERRCODE = '42501';
        END IF;
      ELSIF scope = 'block' THEN
        block_name := coordination_private.field(data, 'target_block', 90);
        IF NOT EXISTS (SELECT 1 FROM coordination_private.memberships d WHERE d.institution_id = m.institution_id
          AND d.role IN ('student', 'teacher') AND d.academic_block = block_name AND d.enabled) THEN
          RAISE EXCEPTION 'Block unavailable' USING ERRCODE = '42501';
        END IF;
      ELSIF scope = 'role' THEN
        target_role := coordination_private.field(data, 'target_role', 20);
        IF target_role NOT IN ('student', 'teacher') THEN
          RAISE EXCEPTION 'Invalid target role' USING ERRCODE = '22023';
        END IF;
      ELSIF scope = 'individual' THEN
        IF jsonb_typeof(data -> 'recipient_ids') IS DISTINCT FROM 'array' THEN
          RAISE EXCEPTION 'Recipient list required' USING ERRCODE = '22023';
        END IF;
        IF jsonb_array_length(data -> 'recipient_ids') NOT BETWEEN 1 AND 100
          OR EXISTS (SELECT 1 FROM jsonb_array_elements(data -> 'recipient_ids') r WHERE jsonb_typeof(r) <> 'string') THEN
          RAISE EXCEPTION 'Select 1 to 100 recipients' USING ERRCODE = '22023';
        END IF;
        IF EXISTS (
          SELECT 1 FROM jsonb_array_elements_text(data -> 'recipient_ids') AS r(id)
          WHERE NOT EXISTS (SELECT 1 FROM coordination_private.memberships d WHERE d.profile_id = r.id
            AND d.institution_id = m.institution_id AND d.role IN ('student','teacher') AND d.enabled)
        ) THEN
          RAISE EXCEPTION 'An event recipient is unavailable' USING ERRCODE = '42501';
        END IF;
      END IF;
      INSERT INTO public.calendar_events (id, title, category, location, event_date, start_time, end_time, audience,
        visibility_scope, target_course_id, target_block, target_role, owner_id, coordination_institution_id)
      VALUES (object_key, title, CASE scope WHEN 'personal' THEN 'personal' ELSE 'institucional' END,
        coordination_private.field(data, 'location', 200, true), start_day, left(time_from::text, 5), left(time_until::text, 5),
        scope, CASE scope WHEN 'individual' THEN 'personal' ELSE scope END, course_key, block_name, target_role,
        m.profile_id, m.institution_id);
      IF scope = 'individual' THEN
        INSERT INTO coordination_private.event_recipients (event_id, profile_id)
        SELECT DISTINCT object_key, r FROM jsonb_array_elements_text(data -> 'recipient_ids') r;
      END IF;

    WHEN 'profile.update' THEN
      PERFORM coordination_private.validate_payload(data, ARRAY['full_name','bio','is_profile_public','preferred_language','preferred_theme']);
      title := coordination_private.field(data, 'full_name', 120);
      entry := coordination_private.field(data, 'preferred_language', 2);
      scope := coordination_private.field(data, 'preferred_theme', 15);
      IF entry NOT IN ('es', 'en') OR scope NOT IN ('original', 'light', 'dark')
        OR jsonb_typeof(data -> 'is_profile_public') IS DISTINCT FROM 'boolean' THEN
        RAISE EXCEPTION 'Invalid profile preferences' USING ERRCODE = '22023';
      END IF;
      UPDATE public.profiles SET full_name = title, initials = upper(left(title, 1) || left(regexp_replace(title, '^.*[[:space:]]+', ''), 1)),
        bio = coordination_private.field(data, 'bio', 1000, true), is_profile_public = (data ->> 'is_profile_public')::boolean,
        preferred_language = entry, preferred_theme = scope, updated_at = now() WHERE id = m.profile_id;
      object_key := m.profile_id;

    ELSE
      RAISE EXCEPTION 'Unsupported coordination command' USING ERRCODE = '22023';
  END CASE;
  RETURN jsonb_build_object('id', object_key);
END;
$$;

CREATE FUNCTION coordination_private.recipient_inbox() RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = '' AS $$
DECLARE m coordination_private.memberships := coordination_private.actor();
BEGIN
  IF m.role IS NULL OR m.role NOT IN ('teacher', 'student') THEN
    RAISE EXCEPTION 'Institutional participant membership required' USING ERRCODE = '42501';
  END IF;
  RETURN (
    WITH available_courses AS (
      SELECT c.id, c.name, c.teacher_id FROM public.courses c
      WHERE c.coordination_institution_id = m.institution_id AND coordination_private.course_access(c.id, m)
    ), available_threads AS (
      SELECT t.id, t.course_id, t.subject, t.created_by, t.recipient_id, t.incident_status, t.thread_kind
      FROM public.direct_threads t JOIN available_courses c ON c.id = t.course_id
      WHERE t.coordination_institution_id = m.institution_id AND m.profile_id IN (t.created_by, t.recipient_id)
    )
    SELECT jsonb_build_object(
      'courses', COALESCE((SELECT jsonb_agg(c ORDER BY c.name, c.id) FROM available_courses c), '[]'),
      'events', COALESCE((SELECT jsonb_agg(e ORDER BY e.event_date, e.start_time, e.id) FROM (
        SELECT e.id, e.title, e.event_date, e.start_time, e.end_time, e.location,
          CASE WHEN r.event_id IS NOT NULL THEN 'individual' ELSE e.visibility_scope END AS visibility_scope,
          e.target_role, e.target_course_id, e.target_block, e.owner_id
        FROM public.calendar_events e LEFT JOIN coordination_private.event_recipients r
          ON r.event_id = e.id AND r.profile_id = m.profile_id
        WHERE e.coordination_institution_id = m.institution_id AND (
          r.event_id IS NOT NULL
          OR (e.visibility_scope = 'course' AND EXISTS (SELECT 1 FROM available_courses c WHERE c.id = e.target_course_id))
          OR (e.visibility_scope = 'role' AND e.target_role = m.role)
          OR (e.visibility_scope = 'block' AND e.target_block = m.academic_block)
        )
      ) e), '[]'),
      'threads', COALESCE((SELECT jsonb_agg(t ORDER BY t.id) FROM available_threads t), '[]'),
      'messages', COALESCE((SELECT jsonb_agg(d ORDER BY d.sent_at, d.id) FROM (
        SELECT d.id, d.thread_id, d.sender_id, d.sender_name, d.content, d.sent_at
        FROM public.direct_messages d JOIN available_threads t ON t.id = d.thread_id
      ) d), '[]'),
      'coordinators', COALESCE((SELECT jsonb_agg(p ORDER BY p.full_name, p.id) FROM (
        SELECT m2.profile_id AS id, p.full_name, p.bio, p.is_profile_public, m2.role, ''::text AS academic_block
        FROM coordination_private.memberships m2 JOIN public.profiles p ON p.id = m2.profile_id
        WHERE m2.institution_id = m.institution_id AND m2.role = 'coordinator' AND m2.enabled AND p.is_profile_public
      ) p), '[]')
    )
  );
END;
$$;

CREATE FUNCTION coordination_private.recipient_command(op text, data jsonb) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  m coordination_private.memberships := coordination_private.actor();
  thread_key text;
  course_key text;
  coordinator_key text;
  subject text;
BEGIN
  IF m.role IS NULL OR m.role NOT IN ('teacher', 'student') THEN
    RAISE EXCEPTION 'Institutional participant membership required' USING ERRCODE = '42501';
  END IF;
  CASE op
    WHEN 'thread.report' THEN
      PERFORM coordination_private.validate_payload(data, ARRAY['course_id','subject','content']);
      course_key := coordination_private.field(data, 'course_id', 200);
      IF NOT coordination_private.course_access(course_key, m) THEN
        RAISE EXCEPTION 'Course unavailable' USING ERRCODE = '42501';
      END IF;
      SELECT d.profile_id INTO coordinator_key FROM coordination_private.memberships d
      WHERE d.institution_id = m.institution_id AND d.role = 'coordinator' AND d.enabled ORDER BY d.profile_id LIMIT 1;
      IF coordinator_key IS NULL THEN
        RAISE EXCEPTION 'No institutional coordinator is available' USING ERRCODE = '42501';
      END IF;
      thread_key := 'coord-' || gen_random_uuid()::text;
      subject := CASE WHEN data ? 'subject' THEN coordination_private.field(data, 'subject', 160) ELSE 'Course incident' END;
      INSERT INTO public.direct_threads (id, thread_kind, course_id, subject, created_by, recipient_id, coordination_institution_id)
      VALUES (thread_key, 'incident_report', course_key, subject, m.profile_id, coordinator_key, m.institution_id);
    WHEN 'thread.reply' THEN
      PERFORM coordination_private.validate_payload(data, ARRAY['thread_id','content']);
      thread_key := coordination_private.field(data, 'thread_id', 200);
      IF NOT EXISTS (SELECT 1 FROM public.direct_threads t WHERE t.id = thread_key
        AND t.coordination_institution_id = m.institution_id AND m.profile_id IN (t.created_by, t.recipient_id)
        AND coordination_private.course_access(t.course_id, m)) THEN
        RAISE EXCEPTION 'Thread unavailable' USING ERRCODE = '42501';
      END IF;
    ELSE
      RAISE EXCEPTION 'Unsupported participant command' USING ERRCODE = '22023';
  END CASE;
  PERFORM coordination_private.send(m, thread_key, coordination_private.field(data, 'content', 4000));
  RETURN jsonb_build_object('id', thread_key);
END;
$$;

CREATE FUNCTION coordination_private.teacher_workspace() RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = '' AS $$
DECLARE m coordination_private.memberships := coordination_private.actor();
BEGIN
  IF m.role IS DISTINCT FROM 'teacher' THEN
    RAISE EXCEPTION 'Institutional instructor membership required' USING ERRCODE = '42501';
  END IF;
  RETURN (
    WITH assigned AS (
      SELECT id, name, description, category, academic_block, teacher_id, teacher_name, period_id, start_date, end_date
      FROM public.courses c WHERE c.coordination_institution_id = m.institution_id AND c.teacher_id = m.profile_id
    ), roster AS (
      SELECT e.course_id, e.student_id, p.full_name
      FROM public.course_enrollments e JOIN assigned c ON c.id = e.course_id
      JOIN coordination_private.memberships s ON s.profile_id = e.student_id
      JOIN public.profiles p ON p.id = s.profile_id
      WHERE s.institution_id = m.institution_id AND s.enabled AND s.role = 'student' AND e.enrolled AND e.status = 'active'
    )
    SELECT jsonb_build_object(
      'courses', COALESCE((SELECT jsonb_agg(c ORDER BY c.name, c.id) FROM assigned c), '[]'),
      'roster', COALESCE((SELECT jsonb_agg(r ORDER BY r.course_id, r.full_name, r.student_id) FROM roster r), '[]'),
      'activities', COALESCE((SELECT jsonb_agg(a ORDER BY a.due_date, a.id) FROM (
        SELECT a.id, a.course_id, a.title, a.instructions, a.due_date, a.max_score
        FROM public.course_activities a JOIN assigned c ON c.id = a.course_id
      ) a), '[]'),
      'attendance', COALESCE((SELECT jsonb_agg(a ORDER BY a.session_date, a.course_id, a.student_id) FROM (
        SELECT a.course_id, a.student_id, a.session_date, a.status
        FROM public.course_attendance a JOIN roster r USING (course_id, student_id)
      ) a), '[]')
    )
  );
END;
$$;

CREATE FUNCTION coordination_private.teacher_command(op text, data jsonb) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  m coordination_private.memberships := coordination_private.actor();
  assigned public.courses;
  course_key text;
  student_key text;
  row_key text;
  record_date date;
  mark_status text;
  score_limit numeric;
BEGIN
  IF m.role IS DISTINCT FROM 'teacher' THEN
    RAISE EXCEPTION 'Institutional instructor membership required' USING ERRCODE = '42501';
  END IF;
  CASE op
    WHEN 'activity.create' THEN
      PERFORM coordination_private.validate_payload(data, ARRAY['course_id','title','instructions','due_date','max_score']);
    WHEN 'attendance.mark' THEN
      PERFORM coordination_private.validate_payload(data, ARRAY['course_id','student_id','session_date','status']);
    ELSE
      RAISE EXCEPTION 'Unsupported instructor operation' USING ERRCODE = '22023';
  END CASE;
  course_key := coordination_private.field(data, 'course_id', 200);
  -- Prevent trusted concurrent instructor reassignment from crossing this write.
  SELECT c.* INTO assigned FROM public.courses c WHERE c.id = course_key
    AND c.coordination_institution_id = m.institution_id AND c.teacher_id = m.profile_id FOR NO KEY UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Assigned course unavailable' USING ERRCODE = '42501'; END IF;
  record_date := coordination_private.date_field(data, CASE op WHEN 'activity.create' THEN 'due_date' ELSE 'session_date' END);
  IF record_date NOT BETWEEN assigned.start_date AND assigned.end_date THEN
    RAISE EXCEPTION 'Use a date within the selected course' USING ERRCODE = '22023';
  END IF;

  IF op = 'activity.create' THEN
    IF jsonb_typeof(data -> 'max_score') IS DISTINCT FROM 'number' THEN
      RAISE EXCEPTION 'An activity scoring limit is required' USING ERRCODE = '22023';
    END IF;
    score_limit := (data ->> 'max_score')::numeric;
    IF score_limit <= 0 OR score_limit > 99.99 OR scale(score_limit) > 2 THEN
      RAISE EXCEPTION 'Use an activity scoring limit between 0.01 and 99.99' USING ERRCODE = '22023';
    END IF;
    row_key := 'coord-' || gen_random_uuid()::text;
    INSERT INTO public.course_activities (id, course_id, title, instructions, due_date, max_score)
    VALUES (row_key, course_key, coordination_private.field(data, 'title', 160),
      coordination_private.field(data, 'instructions', 4000), record_date, score_limit);
  ELSE
    student_key := coordination_private.field(data, 'student_id', 200);
    mark_status := coordination_private.field(data, 'status', 30);
    IF mark_status NOT IN ('Presente','Tardanza','Ausente','Justificada') THEN
      RAISE EXCEPTION 'Invalid attendance status' USING ERRCODE = '22023';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM public.course_enrollments e JOIN coordination_private.memberships s ON s.profile_id = e.student_id
      WHERE e.course_id = course_key AND e.student_id = student_key AND e.enrolled AND e.status = 'active'
        AND s.institution_id = m.institution_id AND s.enabled AND s.role = 'student') THEN
      RAISE EXCEPTION 'An active student enrollment in this course is required' USING ERRCODE = '42501';
    END IF;
    INSERT INTO public.course_attendance (course_id, student_id, session_date, status, recorded_by)
    VALUES (course_key, student_key, record_date, mark_status, m.profile_id)
    ON CONFLICT (course_id, student_id, session_date) DO UPDATE SET status = excluded.status, recorded_by = excluded.recorded_by
    RETURNING id::text INTO row_key;
  END IF;
  RETURN jsonb_build_object('id', row_key);
END;
$$;

REVOKE ALL ON ALL FUNCTIONS IN SCHEMA coordination_private FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION coordination_private.auth_subject(), coordination_private.legacy_unmanaged(text, text) TO coordination_runtime;
GRANT USAGE ON SCHEMA coordination_private TO anon, authenticated;
GRANT EXECUTE ON FUNCTION coordination_private.legacy_unmanaged(text, text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION coordination_private.identity(), coordination_private.snapshot(), coordination_private.command(text, jsonb),
  coordination_private.recipient_inbox(), coordination_private.recipient_command(text, jsonb),
  coordination_private.teacher_workspace(), coordination_private.teacher_command(text, jsonb) TO authenticated;
DO $$
DECLARE signature regprocedure;
BEGIN
  FOR signature IN SELECT p.oid::regprocedure FROM pg_proc p
    WHERE p.pronamespace = 'coordination_private'::regnamespace AND p.proname NOT IN ('auth_subject', 'legacy_unmanaged') LOOP
    EXECUTE format('ALTER FUNCTION %s OWNER TO coordination_runtime', signature);
  END LOOP;
END $$;
REVOKE CREATE ON SCHEMA coordination_private FROM coordination_runtime;

CREATE FUNCTION public.coordination_identity() RETURNS jsonb
LANGUAGE sql STABLE SECURITY INVOKER SET search_path = ''
RETURN coordination_private.identity();
CREATE FUNCTION public.coordination_snapshot() RETURNS jsonb
LANGUAGE sql STABLE SECURITY INVOKER SET search_path = ''
RETURN coordination_private.snapshot();
CREATE FUNCTION public.coordination_command(op text, payload jsonb) RETURNS jsonb
LANGUAGE sql SECURITY INVOKER SET search_path = ''
RETURN coordination_private.command(op, payload);
CREATE FUNCTION public.coordination_recipient_inbox() RETURNS jsonb
LANGUAGE sql STABLE SECURITY INVOKER SET search_path = ''
RETURN coordination_private.recipient_inbox();
CREATE FUNCTION public.coordination_recipient_command(op text, payload jsonb) RETURNS jsonb
LANGUAGE sql SECURITY INVOKER SET search_path = ''
RETURN coordination_private.recipient_command(op, payload);
CREATE FUNCTION public.coordination_teacher_workspace() RETURNS jsonb
LANGUAGE sql STABLE SECURITY INVOKER SET search_path = ''
RETURN coordination_private.teacher_workspace();
CREATE FUNCTION public.coordination_teacher_command(op text, payload jsonb) RETURNS jsonb
LANGUAGE sql SECURITY INVOKER SET search_path = ''
RETURN coordination_private.teacher_command(op, payload);

REVOKE ALL ON FUNCTION public.coordination_identity(), public.coordination_snapshot(), public.coordination_command(text, jsonb),
  public.coordination_recipient_inbox(), public.coordination_recipient_command(text, jsonb),
  public.coordination_teacher_workspace(), public.coordination_teacher_command(text, jsonb) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.coordination_identity(), public.coordination_snapshot(), public.coordination_command(text, jsonb),
  public.coordination_recipient_inbox(), public.coordination_recipient_command(text, jsonb),
  public.coordination_teacher_workspace(), public.coordination_teacher_command(text, jsonb) TO authenticated;
NOTIFY pgrst, 'reload schema';
