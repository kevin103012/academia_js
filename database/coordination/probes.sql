-- Defensive functional verification using synthetic identities only.
-- The nested transaction is always rolled back on success; a failed assertion
-- aborts the statement as well. This file can also run in an outer rollback.
DO $$
DECLARE
  prefix text := 'coord-probe-' || gen_random_uuid()::text;
  coord_a text := prefix || '-coord-a';
  coord_a2 text := prefix || '-coord-a2';
  teacher_a text := prefix || '-teacher-a';
  teacher_a2 text := prefix || '-teacher-a2';
  student_a text := prefix || '-student-a';
  student_a2 text := prefix || '-student-a2';
  coord_b text := prefix || '-coord-b';
  teacher_b text := prefix || '-teacher-b';
  admin_a text := prefix || '-admin-a';
  legacy text := prefix || '-legacy';
  inst_a text := prefix || '-a';
  inst_b text := prefix || '-b';
  period_a text := prefix || '-period-a';
  period_b text := prefix || '-period-b';
  course_a text;
  course_b text;
  admin_course text;
  lesson_a text := prefix || '-lesson-a';
  activity_a text := prefix || '-activity-a';
  thread_a text;
  incident_a text;
  group_a text;
  personal_a text;
  individual_a text;
  course_event text;
  block_event text;
  role_event text;
  auth_coord_a uuid := gen_random_uuid();
  auth_coord_a2 uuid := gen_random_uuid();
  auth_teacher_a uuid := gen_random_uuid();
  auth_teacher_a2 uuid := gen_random_uuid();
  auth_student_a uuid := gen_random_uuid();
  auth_student_a2 uuid := gen_random_uuid();
  auth_coord_b uuid := gen_random_uuid();
  auth_teacher_b uuid := gen_random_uuid();
  auth_admin_a uuid := gen_random_uuid();
  auth_legacy uuid := gen_random_uuid();
  args jsonb;
  event_args jsonb;
  snap jsonb;
  inbox jsonb;
  academic jsonb;
  edit_args jsonb;
  mark_args jsonb;
  updated_count bigint;
  denial_expected boolean;
BEGIN
  BEGIN
    IF EXISTS (
      SELECT 1 FROM pg_roles r CROSS JOIN pg_class c
      WHERE r.rolname IN ('anon','authenticated') AND c.relnamespace = 'public'::regnamespace
        AND c.relname IN ('profiles','academic_periods','courses','course_schedules','course_lessons',
          'course_activities','activity_submissions','course_enrollments','course_attendance','direct_threads',
          'direct_messages','community_groups','community_memberships','community_messages','calendar_events','notices')
        AND (has_table_privilege(r.oid,c.oid,'TRUNCATE') OR has_table_privilege(r.oid,c.oid,'TRIGGER'))
    ) THEN
      RAISE EXCEPTION 'An untrusted role retained a table-wide privilege outside RLS';
    END IF;
    -- RESTART is transactional (unlike setval/nextval on the original sequences).
    ALTER SEQUENCE public.course_schedules_id_seq RESTART WITH 900000000000000000;
    ALTER SEQUENCE public.direct_messages_id_seq RESTART WITH 900000000000000000;
    ALTER SEQUENCE public.course_attendance_id_seq RESTART WITH 900000000000000000;
    INSERT INTO auth.users (id) VALUES (auth_coord_a), (auth_coord_a2), (auth_teacher_a), (auth_student_a), (auth_student_a2),
      (auth_teacher_a2), (auth_coord_b), (auth_teacher_b), (auth_admin_a), (auth_legacy);
    INSERT INTO public.profiles (id, auth_user_id, email, password_hash, full_name, initials, role, role_label, academic_block, institution)
    SELECT p, u, p || '@example.invalid', 'synthetic fixture, not a credential', p, 'T', r, r, b, 'Synthetic institution'
    FROM (VALUES (coord_a, auth_coord_a, 'coordinator', 'A1'), (coord_a2, auth_coord_a2, 'coordinator', 'A2'),
      (teacher_a, auth_teacher_a, 'teacher', 'A2'), (student_a, auth_student_a, 'coordinator', 'A1'),
      (teacher_a2, auth_teacher_a2, 'teacher', 'A2'), (admin_a, auth_admin_a, 'student', 'A1'),
      (student_a2, auth_student_a2, 'student', 'A2'), (coord_b, auth_coord_b, 'coordinator', 'A1'),
      (teacher_b, auth_teacher_b, 'teacher', 'A1'), (legacy, auth_legacy, 'coordinator', 'A1')
    ) AS v(p,u,r,b);
    INSERT INTO coordination_private.institutions (id, name) VALUES (inst_a, 'Synthetic A'), (inst_b, 'Synthetic B');
    INSERT INTO coordination_private.memberships (profile_id, auth_user_id, institution_id, role, academic_block)
    VALUES (coord_a, auth_coord_a, inst_a, 'coordinator', 'A1'), (coord_a2, auth_coord_a2, inst_a, 'coordinator', 'A2'),
      (teacher_a, auth_teacher_a, inst_a, 'teacher', 'A2'), (student_a, auth_student_a, inst_a, 'student', 'A1'),
      (teacher_a2, auth_teacher_a2, inst_a, 'teacher', 'A2'), (admin_a, auth_admin_a, inst_a, 'admin', 'A1'),
      (student_a2, auth_student_a2, inst_a, 'student', 'A2'), (coord_b, auth_coord_b, inst_b, 'coordinator', 'A1'),
      (teacher_b, auth_teacher_b, inst_b, 'teacher', 'A1');
    denial_expected := false;
    BEGIN
      -- Even where the legacy path runs with table-owner privileges, bound
      -- identity changes are denied. Do not invoke the old approval API here.
      UPDATE public.profiles SET role = 'admin' WHERE id = student_a;
    EXCEPTION WHEN insufficient_privilege THEN denial_expected := true; END;
    IF NOT denial_expected THEN RAISE EXCEPTION 'The installed profile guard allowed a legacy-owner role change'; END IF;
    INSERT INTO public.academic_periods (id, name, start_date, end_date)
    VALUES (period_a, 'Synthetic A', '2040-01-01', '2040-06-30'), (period_b, 'Synthetic B', '2040-01-01', '2040-06-30');
    INSERT INTO coordination_private.periods (period_id, institution_id) VALUES (period_a, inst_a), (period_b, inst_b);
    INSERT INTO public.courses (id, name, description, category, academic_block, teacher_id, teacher_name, period_id)
    VALUES (legacy, 'Synthetic legacy course', '', 'matematica', 'A1', teacher_a, 'Synthetic Teacher A', period_a);

    args := jsonb_build_object('name','Scoped course','description','','category','matematica','academic_block','A2',
      'teacher_id',teacher_a,'period_id',period_a,'start_date','2040-01-02','end_date','2040-02-15',
      'days',jsonb_build_array(1,7),'start_time','08:30','end_time','10:00');
    event_args := jsonb_build_object('title','Scoped event','event_date','2040-01-20','start_time','12:30','end_time','13:30','location','');

    SET LOCAL ROLE authenticated;
    PERFORM set_config('request.jwt.claim.sub', auth_coord_a::text, true);
    IF public.coordination_identity() ->> 'id' IS DISTINCT FROM coord_a THEN
      RAISE EXCEPTION 'Coordinator identity did not resolve to the provisioned profile';
    END IF;
    denial_expected := false;
    BEGIN
      PERFORM public.coordination_command('course.create', args || jsonb_build_object('teacher_id', teacher_b));
    EXCEPTION WHEN insufficient_privilege THEN denial_expected := true; END;
    IF NOT denial_expected THEN RAISE EXCEPTION 'Cross-institution assignment was allowed'; END IF;
    denial_expected := false;
    BEGIN
      PERFORM public.coordination_command('course.create', args || '{"start_time":"10:00","end_time":"08:30"}');
    EXCEPTION WHEN invalid_parameter_value THEN denial_expected := true; END;
    IF NOT denial_expected THEN RAISE EXCEPTION 'Reversed schedule was allowed'; END IF;
    course_a := public.coordination_command('course.create', args) ->> 'id';
    group_a := public.coordination_command('group.create', jsonb_build_object('name','Scoped group','category','matematica',
      'course_id',course_a,'academic_block','A2','period_id',period_a,'assigned_teacher_id',teacher_a)) ->> 'id';
    thread_a := public.coordination_command('thread.create', jsonb_build_object('subject','Verify incident','course_id',course_a,
      'recipient_id',teacher_a,'content','Please verify the session.','thread_kind','course_inquiry')) ->> 'id';
    personal_a := public.coordination_command('event.create', event_args || '{"visibility_scope":"personal"}') ->> 'id';
    individual_a := public.coordination_command('event.create', event_args || jsonb_build_object('visibility_scope','individual',
      'recipient_ids',jsonb_build_array(student_a))) ->> 'id';
    course_event := public.coordination_command('event.create', event_args || jsonb_build_object('visibility_scope','course',
      'target_course_id',course_a)) ->> 'id';
    block_event := public.coordination_command('event.create', event_args || '{"visibility_scope":"block","target_block":"A1"}') ->> 'id';
    role_event := public.coordination_command('event.create', event_args || '{"visibility_scope":"role","target_role":"teacher"}') ->> 'id';
    PERFORM public.coordination_command('profile.update', '{"full_name":"Synthetic Updated Coordinator","bio":"Synthetic bio",
      "is_profile_public":true,"preferred_language":"en","preferred_theme":"dark"}');

    PERFORM set_config('request.jwt.claim.sub', auth_coord_b::text, true);
    course_b := public.coordination_command('course.create', args ||
      jsonb_build_object('teacher_id',teacher_b,'period_id',period_b)) ->> 'id';
    snap := public.coordination_snapshot();
    IF snap -> 'courses' @> jsonb_build_array(jsonb_build_object('id',course_a))
      OR snap -> 'threads' @> jsonb_build_array(jsonb_build_object('id',thread_a))
      OR snap -> 'groups' @> jsonb_build_array(jsonb_build_object('id',group_a))
      OR snap -> 'people' @> jsonb_build_array(jsonb_build_object('id',coord_a))
      OR NOT (snap -> 'courses' @> jsonb_build_array(jsonb_build_object('id',course_b))) THEN
      RAISE EXCEPTION 'Other-institution data was visible or the own institution was absent';
    END IF;
    denial_expected := false;
    BEGIN
      PERFORM public.coordination_command('thread.reply', jsonb_build_object('thread_id',thread_a,'content','Outside institution'));
    EXCEPTION WHEN insufficient_privilege THEN denial_expected := true; END;
    IF NOT denial_expected THEN RAISE EXCEPTION 'Cross-institution thread mutation was allowed'; END IF;

    RESET ROLE;
    INSERT INTO public.course_lessons (id, course_id, title, summary) VALUES (lesson_a, course_a, 'Synthetic lesson', '');
    INSERT INTO public.course_activities (id, course_id, lesson_id, title, instructions, due_date)
    VALUES (activity_a, course_a, lesson_a, 'Synthetic task','Synthetic instructions','2040-01-05');
    INSERT INTO public.course_enrollments (id, course_id, student_id) OVERRIDING SYSTEM VALUE
    VALUES (-910000000001, course_a, student_a), (-910000000002, course_b, student_a2);
    INSERT INTO public.course_attendance (id, course_id, student_id, session_date, status) OVERRIDING SYSTEM VALUE
    VALUES (-910000000001, course_a, student_a, '2040-01-05', 'Presente'),
      (-910000000002, course_a, student_a2, '2040-01-05', 'Presente'),
      (-910000000003, course_b, student_a2, '2040-01-05', 'Ausente');
    INSERT INTO public.activity_submissions (id, activity_id, student_id, content)
    VALUES (prefix || '-pending', activity_a, student_a, 'Synthetic submission not returned by the RPC');
    -- Institution ownership survives independently of a missing instructor.
    UPDATE public.courses SET teacher_id = NULL WHERE id = course_a;
    SET LOCAL ROLE authenticated;
    PERFORM set_config('request.jwt.claim.sub', auth_coord_a2::text, true);
    snap := public.coordination_snapshot();
    IF NOT (snap -> 'courses' @> jsonb_build_array(jsonb_build_object('id',course_a,'teacher_id',NULL)))
      OR snap -> 'courses' @> jsonb_build_array(jsonb_build_object('id',legacy))
      OR snap -> 'events' @> jsonb_build_array(jsonb_build_object('id',personal_a))
      OR snap -> 'events' @> jsonb_build_array(jsonb_build_object('id',individual_a))
      OR snap -> 'threads' @> jsonb_build_array(jsonb_build_object('id',thread_a))
      OR snap -> 'messages' @> jsonb_build_array(jsonb_build_object('thread_id',thread_a))
      OR jsonb_array_length(snap -> 'attendance') <> 1
      OR NOT (snap -> 'attendance' @> jsonb_build_array(jsonb_build_object('course_id',course_a,'student_id',student_a)))
      OR NOT (snap -> 'submissions' @> jsonb_build_array(jsonb_build_object('id',prefix || '-pending','score',NULL)))
      OR snap::text LIKE '%Synthetic submission not returned%'
      OR snap::text LIKE '%@example.invalid%' OR snap::text LIKE '%password_hash%' THEN
      RAISE EXCEPTION 'Institution scope, private data projection or course attendance failed';
    END IF;
    denial_expected := false;
    BEGIN
      PERFORM public.coordination_command('thread.reply', jsonb_build_object('thread_id',thread_a,'content','Not the coordinator participant'));
    EXCEPTION WHEN insufficient_privilege THEN denial_expected := true; END;
    IF NOT denial_expected THEN RAISE EXCEPTION 'A peer coordinator could reply to a private inquiry'; END IF;
    RESET ROLE;
    UPDATE public.courses SET teacher_id = teacher_a WHERE id = course_a;

    SET LOCAL ROLE authenticated;
    PERFORM set_config('request.jwt.claim.sub', auth_student_a::text, true);
    IF public.coordination_identity() ->> 'role' IS DISTINCT FROM 'student' THEN
      RAISE EXCEPTION 'A mutable public role overrode the provisioned institution role';
    END IF;
    denial_expected := false;
    BEGIN
      PERFORM public.coordination_snapshot();
    EXCEPTION WHEN insufficient_privilege THEN denial_expected := true; END;
    IF NOT denial_expected THEN RAISE EXCEPTION 'Public profile role granted institutional coordination'; END IF;
    denial_expected := false;
    BEGIN
      PERFORM public.coordination_teacher_workspace();
    EXCEPTION WHEN insufficient_privilege THEN denial_expected := true; END;
    IF NOT denial_expected THEN RAISE EXCEPTION 'A student received the instructor workspace'; END IF;
    inbox := public.coordination_recipient_inbox();
    IF NOT (inbox -> 'events' @> jsonb_build_array(jsonb_build_object('id',individual_a,'visibility_scope','individual'),
        jsonb_build_object('id',course_event), jsonb_build_object('id',block_event)))
      OR inbox -> 'events' @> jsonb_build_array(jsonb_build_object('id',personal_a))
      OR inbox -> 'events' @> jsonb_build_array(jsonb_build_object('id',role_event))
      OR inbox -> 'threads' @> jsonb_build_array(jsonb_build_object('id',thread_a))
      OR NOT (inbox -> 'coordinators' @> jsonb_build_array(jsonb_build_object('id',coord_a,'bio','Synthetic bio','academic_block',''))) THEN
      RAISE EXCEPTION 'Selected recipient, event audience, thread privacy or public profile failed';
    END IF;
    incident_a := public.coordination_recipient_command('thread.report', jsonb_build_object('course_id',course_a,
      'content','Synthetic class did not start.')) ->> 'id';
    PERFORM public.coordination_recipient_command('thread.reply', jsonb_build_object('thread_id',incident_a,'content','Synthetic follow-up.'));
    PERFORM set_config('request.jwt.claim.sub', auth_coord_a2::text, true);
    snap := public.coordination_snapshot();
    IF NOT (snap -> 'threads' @> jsonb_build_array(jsonb_build_object('id',incident_a))) THEN
      RAISE EXCEPTION 'The incident was not available to another same-institution coordinator for triage';
    END IF;

    PERFORM set_config('request.jwt.claim.sub', auth_student_a2::text, true);
    inbox := public.coordination_recipient_inbox();
    IF jsonb_array_length(inbox -> 'events') <> 0 OR jsonb_array_length(inbox -> 'courses') <> 0 THEN
      RAISE EXCEPTION 'A non-recipient could see a scoped event or unapproved enrollment';
    END IF;
    denial_expected := false;
    BEGIN
      PERFORM public.coordination_recipient_command('thread.reply', jsonb_build_object('thread_id',incident_a,'content','Not a participant'));
    EXCEPTION WHEN insufficient_privilege THEN denial_expected := true; END;
    IF NOT denial_expected THEN RAISE EXCEPTION 'A non-participant could reply'; END IF;

    PERFORM set_config('request.jwt.claim.sub', auth_teacher_a::text, true);
    inbox := public.coordination_recipient_inbox();
    IF NOT (inbox -> 'events' @> jsonb_build_array(jsonb_build_object('id',course_event),jsonb_build_object('id',role_event)))
      OR NOT (inbox -> 'threads' @> jsonb_build_array(jsonb_build_object('id',thread_a)))
      OR inbox -> 'threads' @> jsonb_build_array(jsonb_build_object('id',incident_a))
      OR inbox -> 'events' @> jsonb_build_array(jsonb_build_object('id',individual_a)) THEN
      RAISE EXCEPTION 'Teacher assignment scope or selected audiences failed';
    END IF;
    PERFORM public.coordination_recipient_command('thread.reply', jsonb_build_object('thread_id',thread_a,'content','Synthetic teacher verification.'));
    PERFORM set_config('request.jwt.claim.sub', auth_admin_a::text, true);
    snap := public.coordination_snapshot();
    IF snap -> 'me' ->> 'role' IS DISTINCT FROM 'admin'
      OR NOT (snap -> 'courses' @> jsonb_build_array(jsonb_build_object('id',course_a)))
      OR snap -> 'courses' @> jsonb_build_array(jsonb_build_object('id',course_b))
      OR jsonb_array_length(snap -> 'threads') <> 0 OR jsonb_array_length(snap -> 'messages') <> 0
      OR jsonb_array_length(snap -> 'events') <> 0 OR jsonb_array_length(snap -> 'groups') <> 0 THEN
      RAISE EXCEPTION 'Institutional administration could not use its academic scope exclusively';
    END IF;
    admin_course := public.coordination_command('course.create', args || jsonb_build_object('teacher_id',teacher_a2)) ->> 'id';
    edit_args := jsonb_build_object('course_id',admin_course,'name','Edited by trusted administration',
      'description','Academic catalog edit','category','matematica','academic_block','A2');
    PERFORM public.coordination_command('course.update', edit_args);
    snap := public.coordination_snapshot();
    IF NOT (snap -> 'courses' @> jsonb_build_array(jsonb_build_object('id',admin_course,
      'name','Edited by trusted administration','teacher_id',teacher_a2,'start_date','2040-01-02')))
      OR NOT (snap -> 'schedules' @> jsonb_build_array(jsonb_build_object('course_id',admin_course,'day_of_week',1))) THEN
      RAISE EXCEPTION 'Trusted course editing did not preserve instructor and schedule';
    END IF;
    denial_expected := false;
    BEGIN
      PERFORM public.coordination_command('course.update', edit_args || jsonb_build_object('course_id',course_b));
    EXCEPTION WHEN insufficient_privilege THEN denial_expected := true; END;
    IF NOT denial_expected THEN RAISE EXCEPTION 'Administration could edit another institution''s course'; END IF;
    denial_expected := false;
    BEGIN
      PERFORM public.coordination_command('thread.status', jsonb_build_object('thread_id',incident_a,'incident_status','resolved'));
    EXCEPTION WHEN insufficient_privilege THEN denial_expected := true; END;
    IF NOT denial_expected THEN RAISE EXCEPTION 'Administration gained private coordinator functions'; END IF;

    PERFORM set_config('request.jwt.claim.sub', auth_teacher_a::text, true);
    academic := public.coordination_teacher_workspace();
    IF NOT (academic -> 'courses' @> jsonb_build_array(jsonb_build_object('id',course_a)))
      OR academic -> 'courses' @> jsonb_build_array(jsonb_build_object('id',admin_course))
      OR academic -> 'courses' @> jsonb_build_array(jsonb_build_object('id',course_b))
      OR NOT (academic -> 'activities' @> jsonb_build_array(jsonb_build_object('id',activity_a)))
      OR NOT (academic -> 'roster' @> jsonb_build_array(jsonb_build_object('course_id',course_a,'student_id',student_a)))
      OR jsonb_array_length(academic -> 'roster') <> 1 THEN
      RAISE EXCEPTION 'Instructor courses, activities or roster were not scoped to assignment and active enrollment';
    END IF;
    edit_args := jsonb_build_object('course_id',course_a,'title','Teacher activity','instructions','Synthetic instructions',
      'due_date','2040-02-01','max_score',20);
    PERFORM public.coordination_teacher_command('activity.create', edit_args);
    denial_expected := false;
    BEGIN
      PERFORM public.coordination_teacher_command('activity.create', edit_args || jsonb_build_object('course_id',admin_course));
    EXCEPTION WHEN insufficient_privilege THEN denial_expected := true; END;
    IF NOT denial_expected THEN RAISE EXCEPTION 'Instructor could write an activity in an unassigned course'; END IF;
    mark_args := jsonb_build_object('course_id',course_a,'student_id',student_a,'session_date','2040-01-05','status','Tardanza');
    PERFORM public.coordination_teacher_command('attendance.mark', mark_args);
    PERFORM public.coordination_teacher_command('attendance.mark', mark_args || '{"session_date":"2040-01-06","status":"Presente"}');
    denial_expected := false;
    BEGIN
      PERFORM public.coordination_teacher_command('attendance.mark', mark_args || jsonb_build_object('student_id',student_a2));
    EXCEPTION WHEN insufficient_privilege THEN denial_expected := true; END;
    IF NOT denial_expected THEN RAISE EXCEPTION 'Instructor could mark a non-enrolled student'; END IF;
    academic := public.coordination_teacher_workspace();
    IF NOT (academic -> 'activities' @> jsonb_build_array(jsonb_build_object('course_id',course_a,'title','Teacher activity')))
      OR NOT (academic -> 'attendance' @> jsonb_build_array(jsonb_build_object('course_id',course_a,'student_id',student_a,
        'session_date','2040-01-05','status','Tardanza'), jsonb_build_object('course_id',course_a,'student_id',student_a,
        'session_date','2040-01-06','status','Presente'))) THEN
      RAISE EXCEPTION 'Instructor activity, attendance insert or attendance correction did not persist';
    END IF;
    PERFORM set_config('request.jwt.claim.sub', auth_coord_a::text, true);
    PERFORM public.coordination_command('thread.status', jsonb_build_object('thread_id',incident_a,'incident_status','resolved'));
    snap := public.coordination_snapshot();
    IF NOT (snap -> 'threads' @> jsonb_build_array(jsonb_build_object('id',incident_a,'incident_status','resolved')))
      OR NOT (snap -> 'messages' @> jsonb_build_array(jsonb_build_object('thread_id',thread_a,'sender_id',teacher_a))) THEN
      RAISE EXCEPTION 'Incident triage or instructor reply did not persist';
    END IF;
    PERFORM public.coordination_command('profile.update', '{"full_name":"Synthetic Updated Coordinator","bio":"Private synthetic bio",
      "is_profile_public":false,"preferred_language":"en","preferred_theme":"dark"}');

    PERFORM set_config('request.jwt.claim.sub', auth_legacy::text, true);
    IF public.coordination_identity() IS NOT NULL THEN
      RAISE EXCEPTION 'An unbound public coordinator profile received institutional identity';
    END IF;
    denial_expected := false;
    BEGIN
      PERFORM public.coordination_snapshot();
    EXCEPTION WHEN insufficient_privilege THEN denial_expected := true; END;
    IF NOT denial_expected THEN RAISE EXCEPTION 'An unbound account could read coordination'; END IF;
    IF EXISTS (SELECT 1 FROM public.courses WHERE id IN (course_a,course_b))
      OR EXISTS (SELECT 1 FROM public.profiles WHERE id IN (coord_a,student_a))
      OR EXISTS (SELECT 1 FROM public.v_course_analytics WHERE course_id IN (course_a,course_b))
      OR EXISTS (SELECT 1 FROM public.course_activities WHERE id = activity_a)
      OR EXISTS (SELECT 1 FROM public.course_attendance WHERE course_id = course_a)
      OR EXISTS (SELECT 1 FROM public.activity_submissions WHERE activity_id = activity_a)
      OR EXISTS (SELECT 1 FROM public.course_lessons WHERE id = lesson_a)
      OR EXISTS (SELECT 1 FROM public.course_schedules WHERE course_id = course_a)
      OR EXISTS (SELECT 1 FROM public.direct_threads WHERE id = thread_a)
      OR EXISTS (SELECT 1 FROM public.direct_messages WHERE thread_id = thread_a)
      OR EXISTS (SELECT 1 FROM public.community_groups WHERE id = group_a)
      OR EXISTS (SELECT 1 FROM public.calendar_events WHERE id = individual_a)
      OR NOT EXISTS (SELECT 1 FROM public.courses WHERE id = legacy)
      OR NOT EXISTS (SELECT 1 FROM public.v_course_analytics WHERE course_id = legacy) THEN
      RAISE EXCEPTION 'Direct access did not preserve legacy rows while hiding managed rows';
    END IF;
    UPDATE public.courses SET name = 'Unexpected update' WHERE id = course_a;
    GET DIAGNOSTICS updated_count = ROW_COUNT;
    IF updated_count <> 0 THEN RAISE EXCEPTION 'A managed course was writable directly'; END IF;

    PERFORM set_config('request.jwt.claim.sub', auth_student_a::text, true);
    inbox := public.coordination_recipient_inbox();
    IF inbox -> 'coordinators' @> jsonb_build_array(jsonb_build_object('id',coord_a)) THEN
      RAISE EXCEPTION 'A private coordinator profile was listed';
    END IF;
    RESET ROLE;
    UPDATE coordination_private.memberships SET enabled = false WHERE profile_id = student_a;
    SET LOCAL ROLE authenticated;
    IF public.coordination_identity() IS NOT NULL THEN RAISE EXCEPTION 'Revoked membership still identifies its former caller'; END IF;
    denial_expected := false;
    BEGIN
      PERFORM public.coordination_recipient_inbox();
    EXCEPTION WHEN insufficient_privilege THEN denial_expected := true; END;
    IF NOT denial_expected THEN RAISE EXCEPTION 'Revoked membership still had an inbox'; END IF;
    RESET ROLE;

    SET LOCAL ROLE anon;
    PERFORM set_config('request.jwt.claim.sub', '', true);
    IF EXISTS (SELECT 1 FROM public.calendar_events WHERE id IN (personal_a,individual_a))
      OR EXISTS (SELECT 1 FROM public.profiles WHERE id = coord_a)
      OR EXISTS (SELECT 1 FROM public.v_course_analytics WHERE course_id = course_a) THEN
      RAISE EXCEPTION 'Anonymous direct access could see managed data';
    END IF;
    denial_expected := false;
    BEGIN
      PERFORM public.coordination_identity();
    EXCEPTION WHEN insufficient_privilege THEN denial_expected := true; END;
    IF NOT denial_expected THEN RAISE EXCEPTION 'Anonymous identity RPC execution was allowed'; END IF;
    RESET ROLE;

    RAISE EXCEPTION USING ERRCODE = 'ZP001', MESSAGE = 'Roll back successful Coordination fixture';
  EXCEPTION WHEN SQLSTATE 'ZP001' THEN
    RAISE NOTICE 'Coordination authorization and application probes passed; fixtures rolled back.';
  END;
END;
$$;
SELECT 'coordination probes passed; fixtures rolled back' AS result;
