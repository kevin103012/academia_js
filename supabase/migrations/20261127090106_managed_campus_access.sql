-- Upgrade the existing campus schema and keep existing profile IDs.
begin;
create schema campus_private;
revoke all on schema campus_private from public;
grant usage on schema campus_private to anon, authenticated;

create unique index campus_profiles_auth_identity
  on public.profiles (auth_user_id) where auth_user_id is not null;
alter table public.tutor_messages add column client_id text;
create unique index campus_tutor_client_message on public.tutor_messages (session_id, client_id);
create unique index campus_group_course_period_block on public.community_groups (course_id, period_id, academic_block)
  where group_kind='course' and course_id is not null;

create function campus_private.me() returns text
language sql stable security definer set search_path = ''
as $$ select p.id from public.profiles p join auth.users u on u.id=p.auth_user_id
      where u.id=auth.uid() and u.email_confirmed_at is not null $$;
create function campus_private.role() returns text
language sql stable security definer set search_path = ''
as $$ select role from public.profiles where id=campus_private.me() $$;
create function campus_private.block() returns text
language sql stable security definer set search_path = ''
as $$ select academic_block from public.profiles where id=campus_private.me() $$;
create function campus_private.staff() returns boolean
language sql stable set search_path = ''
as $$ select coalesce(campus_private.role() in ('admin','coordinator'),false) $$;
create function campus_private.admin() returns boolean
language sql stable set search_path = ''
as $$ select coalesce(campus_private.role()='admin',false) $$;
create function campus_private.teaches(course text) returns boolean
language sql stable security definer set search_path = ''
as $$ select coalesce(campus_private.role()='teacher',false) and exists
      (select 1 from public.courses where id=course and teacher_id=campus_private.me()) $$;
create function campus_private.enrolled(course text) returns boolean
language sql stable security definer set search_path = ''
as $$ select exists (select 1 from public.course_enrollments where course_id=course
      and student_id=campus_private.me() and enrolled) $$;
create function campus_private.course_manager(course text) returns boolean
language sql stable set search_path = ''
as $$ select campus_private.staff() or campus_private.teaches(course) $$;
create function campus_private.course_member(course text) returns boolean
language sql stable set search_path = ''
as $$ select campus_private.course_manager(course) or campus_private.enrolled(course) $$;
create function campus_private.activity_access(activity text, editing boolean) returns boolean
language sql stable security definer set search_path = ''
as $$ select exists (select 1 from public.course_activities where id=activity and
      case when editing then campus_private.course_manager(course_id) else campus_private.enrolled(course_id) end) $$;
create function campus_private.teacher_roster(student text) returns boolean
language sql stable security definer set search_path = ''
as $$ select exists (select 1 from public.course_enrollments where student_id=student and enrolled
      and campus_private.teaches(course_id)) $$;
create function campus_private.group_visible(group_key text) returns boolean
language sql stable security definer set search_path = ''
as $$ select exists (select 1 from public.community_groups where id=group_key and
      (group_kind is distinct from 'course' or campus_private.course_member(course_id)
        or assigned_teacher_id=campus_private.me())) $$;
create function campus_private.group_history(group_key text, stamp timestamptz) returns boolean
language sql stable security definer set search_path = ''
as $$ select campus_private.group_visible(group_key) and exists (select 1 from public.community_memberships
      where group_id=group_key and user_id=campus_private.me() and joined_at<=stamp) $$;
create function campus_private.tutor_owner(conversation text) returns boolean
language sql stable security definer set search_path = ''
as $$ select exists (select 1 from public.tutor_sessions where id=conversation and user_id=campus_private.me()) $$;
create function campus_private.thread_visible(thread text) returns boolean
language sql stable security definer set search_path = ''
as $$ select exists (
      select 1 from public.direct_threads where id=thread and
      (created_by=campus_private.me() or recipient_id=campus_private.me()
        or (thread_kind in ('incident_report','urgent_admin') and target_role=campus_private.role()))
      ) $$;

do $$
declare entry record;
declare campus_tables text[] := array[
  'profiles','access_requests','custom_themes','academic_periods','courses','course_schedules',
  'course_lessons','course_enrollments','course_attendance','course_activities','activity_submissions',
  'ai_models','ai_guardrails','tutor_sessions','tutor_messages','community_groups','community_memberships',
  'community_messages','direct_threads','direct_messages','calendar_events','notices','audit_logs'
];
declare table_name text;
begin
  for entry in select tablename,policyname from pg_policies where schemaname='public' and tablename=any(campus_tables)
  loop execute format('drop policy %I on public.%I',entry.policyname,entry.tablename); end loop;
  foreach table_name in array campus_tables loop
    execute format('revoke all on public.%I from public, anon, authenticated',table_name);
    execute format('alter table public.%I enable row level security',table_name);
  end loop;
end $$;

revoke execute on function public.authenticate_campus_user(text,text), public.submit_access_request(text,text,text,text,text),
  public.approve_access_request(bigint,text,text), public.reject_access_request(bigint,text) from public, anon, authenticated;

grant select (id,full_name,initials,role,role_label,academic_block,institution,bio,social_links,public_activities,
  is_profile_public,preferred_theme,preferred_language) on public.profiles to authenticated;
grant update (full_name,institution,bio,social_links,public_activities,is_profile_public,preferred_theme,preferred_language,
  updated_at) on public.profiles to authenticated;
create policy profile_read on public.profiles for select to authenticated using (
  id=(select campus_private.me()) or ((select campus_private.me()) is not null and (
    role='teacher' or (role='student' and (is_profile_public or campus_private.staff() or campus_private.teacher_roster(id)))
  ))
);
create policy profile_edit on public.profiles for update to authenticated
  using (id=(select campus_private.me())) with check (id=(select campus_private.me()));
grant select (id,full_name,email,requested_role,role_label,academic_block,motivation,status,issued_email,approved_profile_id,
  reviewed_by,requested_at,reviewed_at) on public.access_requests to authenticated;
create policy request_read on public.access_requests for select to authenticated using ((select campus_private.admin()));

grant select,insert,update on public.academic_periods to authenticated;
create policy period_read on public.academic_periods for select to authenticated using ((select campus_private.me()) is not null);
create policy period_edit on public.academic_periods for all to authenticated
  using ((select campus_private.admin())) with check ((select campus_private.admin()));
grant select,insert,update,delete on public.courses to authenticated;
create policy course_read on public.courses for select to authenticated using ((select campus_private.me()) is not null);
create policy course_create on public.courses for insert to authenticated with check ((select campus_private.staff()));
create policy course_edit on public.courses for update to authenticated using ((select campus_private.staff())) with check ((select campus_private.staff()));
create policy course_remove on public.courses for delete to authenticated using ((select campus_private.admin()));
grant select on public.course_schedules to authenticated;
create policy schedule_read on public.course_schedules for select to authenticated using ((select campus_private.me()) is not null);
grant select,insert,update on public.course_lessons to authenticated;
create policy lesson_read on public.course_lessons for select to authenticated using (campus_private.course_member(course_id));
create policy lesson_edit on public.course_lessons for all to authenticated
  using (campus_private.teaches(course_id) or (select campus_private.admin()))
  with check (campus_private.teaches(course_id) or (select campus_private.admin()));

grant select,insert,update on public.course_enrollments,public.course_attendance to authenticated;
create policy enrollment_read on public.course_enrollments for select to authenticated using (
  student_id=(select campus_private.me()) or campus_private.course_manager(course_id)
);
create policy enrollment_create on public.course_enrollments for insert to authenticated with check (
  student_id=(select campus_private.me()) and (select campus_private.role())='student'
);
create policy enrollment_edit on public.course_enrollments for update to authenticated
  using (student_id=(select campus_private.me())) with check (student_id=(select campus_private.me()));
create policy attendance_read on public.course_attendance for select to authenticated using (
  student_id=(select campus_private.me()) or campus_private.course_manager(course_id)
);
create policy attendance_edit on public.course_attendance for all to authenticated
  using (campus_private.teaches(course_id) or (select campus_private.admin()))
  with check (campus_private.teaches(course_id) or (select campus_private.admin()));

grant select,insert,update,delete on public.course_activities to authenticated;
create policy activity_read on public.course_activities for select to authenticated using (campus_private.course_member(course_id));
create policy activity_edit on public.course_activities for all to authenticated
  using (campus_private.course_manager(course_id)) with check (campus_private.course_manager(course_id));
grant select,insert on public.activity_submissions to authenticated;
grant update (content,submitted_at,score,feedback) on public.activity_submissions to authenticated;
create policy submission_read on public.activity_submissions for select to authenticated using (
  student_id=(select campus_private.me()) or campus_private.activity_access(activity_id,true)
);
create policy submission_create on public.activity_submissions for insert to authenticated with check (
  student_id=(select campus_private.me()) and campus_private.activity_access(activity_id,false)
  and score is null and feedback is null and graded_by is null
);
create policy submission_grade on public.activity_submissions for update to authenticated
  using (campus_private.activity_access(activity_id,true)) with check (campus_private.activity_access(activity_id,true));
create policy submission_revise on public.activity_submissions for update to authenticated
  using (student_id=(select campus_private.me()) and score is null and feedback is null and campus_private.activity_access(activity_id,false))
  with check (student_id=(select campus_private.me()) and score is null and feedback is null and graded_by is null
    and campus_private.activity_access(activity_id,false));

grant select,insert,update on public.custom_themes,public.ai_models,public.ai_guardrails to authenticated;
create policy theme_read on public.custom_themes for select to authenticated using ((select campus_private.me()) is not null);
create policy theme_edit on public.custom_themes for all to authenticated
  using ((select campus_private.staff())) with check ((select campus_private.staff()));
create policy model_read on public.ai_models for select to authenticated using (
  (select campus_private.admin()) or (is_active and (select campus_private.role())=any(allowed_roles))
);
create policy model_edit on public.ai_models for all to authenticated
  using ((select campus_private.admin())) with check ((select campus_private.admin()));
create policy ai_config_read on public.ai_guardrails for select to authenticated using ((select campus_private.me()) is not null);
create policy ai_config_edit on public.ai_guardrails for all to authenticated
  using ((select campus_private.admin())) with check ((select campus_private.admin()));

grant select,insert,update,delete on public.tutor_sessions to authenticated;
grant select,insert,update on public.tutor_messages to authenticated;
create policy tutor_sessions_owner on public.tutor_sessions for all to authenticated
  using (user_id=(select campus_private.me())) with check (user_id=(select campus_private.me()));
create policy tutor_message_owner on public.tutor_messages for all to authenticated
  using (campus_private.tutor_owner(session_id)) with check (campus_private.tutor_owner(session_id));

grant select,insert,update,delete on public.community_groups to authenticated;
grant select,delete on public.community_memberships to authenticated;
grant insert (group_id,user_id) on public.community_memberships to authenticated;
grant select on public.community_messages to authenticated;
grant insert (id,group_id,author_id,author_name,author_role,initials,content,sent_label) on public.community_messages to authenticated;
create policy group_read on public.community_groups for select to authenticated
  using ((select campus_private.me()) is not null and campus_private.group_visible(id));
create policy group_create on public.community_groups for insert to authenticated with check (
  created_by=(select campus_private.me()) and (
    campus_private.staff() or ((select campus_private.role())='teacher' and assigned_teacher_id=(select campus_private.me()) and (
      group_kind='study' or (group_kind='course' and campus_private.teaches(course_id) and exists (
        select 1 from public.courses c where c.id=course_id and c.period_id=community_groups.period_id
          and c.academic_block=community_groups.academic_block
      ))
    ))
  )
);
create function campus_private.guard_teacher_group() returns trigger
language plpgsql set search_path = ''
as $$
begin
  if campus_private.role()='teacher' and (
    old.course_id is distinct from new.course_id or old.period_id is distinct from new.period_id
    or old.academic_block is distinct from new.academic_block or old.group_kind is distinct from new.group_kind
    or old.assigned_teacher_id is distinct from new.assigned_teacher_id or old.created_by is distinct from new.created_by
  ) then raise exception 'Solo coordinación o administración pueden cambiar la asignación del grupo'; end if;
  return new;
end $$;
create trigger campus_group_assignment before update on public.community_groups for each row execute function campus_private.guard_teacher_group();
create policy group_edit on public.community_groups for update to authenticated
  using (campus_private.staff() or ((select campus_private.role())='teacher'
    and (created_by=(select campus_private.me()) or assigned_teacher_id=(select campus_private.me()))))
  with check (campus_private.staff() or ((select campus_private.role())='teacher'
    and (created_by=(select campus_private.me()) or assigned_teacher_id=(select campus_private.me()))));
create policy group_delete on public.community_groups for delete to authenticated using ((select campus_private.admin()));
create policy group_membership_read on public.community_memberships for select to authenticated
  using (user_id=(select campus_private.me()));
create policy group_join on public.community_memberships for insert to authenticated
  with check (user_id=(select campus_private.me()) and campus_private.group_visible(group_id));
create policy group_leave on public.community_memberships for delete to authenticated using (user_id=(select campus_private.me()));
create policy group_message_read on public.community_messages for select to authenticated using (campus_private.group_history(group_id,sent_at));
create policy group_message_send on public.community_messages for insert to authenticated
  with check (author_id=(select campus_private.me()) and campus_private.group_history(group_id,sent_at));

grant select on public.direct_threads,public.direct_messages to authenticated;
create policy thread_read on public.direct_threads for select to authenticated using (campus_private.thread_visible(id));
create policy direct_message_read on public.direct_messages for select to authenticated using (campus_private.thread_visible(thread_id));

grant select,insert,update,delete on public.calendar_events to authenticated;
create policy calendar_read on public.calendar_events for select to authenticated using (
  (select campus_private.me()) is not null and (
    owner_id=(select campus_private.me()) or coalesce(visibility_scope,'global')='global'
    or (visibility_scope='course' and campus_private.course_member(target_course_id))
    or (visibility_scope='block' and target_block=(select campus_private.block()))
    or (visibility_scope='role' and target_role=(select campus_private.role()))
  )
);
create policy calendar_edit on public.calendar_events for all to authenticated
  using (owner_id=(select campus_private.me()))
  with check (owner_id=(select campus_private.me()) and (
    visibility_scope='personal' or campus_private.staff()
    or (visibility_scope='course' and campus_private.teaches(target_course_id))
  ));
grant select,insert,update,delete on public.notices to authenticated;
create policy notice_read on public.notices for select to authenticated using ((select campus_private.me()) is not null and (
  scope is distinct from 'course' or campus_private.course_member(course_id)
));
create policy notice_edit on public.notices for all to authenticated
  using (author_id=(select campus_private.me()) or (select campus_private.admin()))
  with check (author_id=(select campus_private.me()) and (
    (scope='system_persistent' and campus_private.admin())
    or (scope='general' and (select campus_private.role()) in ('admin','coordinator','teacher') and not is_pinned)
    or (scope='course' and campus_private.course_manager(course_id) and not is_pinned)
  ));
grant select,insert on public.audit_logs to authenticated;
create policy audit_read on public.audit_logs for select to authenticated
  using (actor_id=(select campus_private.me()) or (select campus_private.staff()));
create policy audit_create on public.audit_logs for insert to authenticated with check (actor_id=(select campus_private.me()));

create function campus_private.profile() returns jsonb
language sql stable security definer set search_path = ''
as $$
  select jsonb_build_object('id',id,'name',full_name,'email',email,'role',role,'roleLabel',role_label,
    'initials',initials,'academicBlock',academic_block) from public.profiles where id=campus_private.me()
$$;
create function public.current_campus_profile() returns jsonb
language sql stable set search_path = '' as $$ select campus_private.profile() $$;

create function campus_private.register_request(person text, address text, requested text, block_name text, note text)
returns jsonb language plpgsql security definer set search_path = ''
as $$
declare request public.access_requests%rowtype;
declare normalized text := lower(btrim(address));
declare label text;
begin
  if person is null or length(btrim(person)) not between 2 and 100 or normalized is null or length(normalized)>254
    or normalized !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' or requested is null
    or requested not in ('student','teacher','coordinator') or length(coalesce(block_name,''))>120
    or length(coalesce(note,''))>1000 then raise exception 'Solicitud inválida'; end if;
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(normalized,0));
  if exists (select 1 from public.profiles where lower(email)=normalized)
    or exists (select 1 from public.access_requests where lower(email)=normalized and status in ('pending','approved')) then
    return jsonb_build_object('status','already_registered','message','Ya existe una cuenta o solicitud con ese correo.');
  end if;
  label := case requested when 'teacher' then 'Docente' when 'coordinator' then 'Coordinación' else 'Estudiante' end;
  insert into public.access_requests(full_name,email,requested_role,role_label,academic_block,motivation,status)
    values(btrim(person),normalized,requested,label,coalesce(btrim(block_name),''),coalesce(btrim(note),''),'pending')
  on conflict (email) do update set full_name=excluded.full_name, requested_role=excluded.requested_role,
    role_label=excluded.role_label, academic_block=excluded.academic_block, motivation=excluded.motivation,
    status='pending', requested_at=now(), reviewed_at=null, reviewed_by=null
    where access_requests.status='rejected'
  returning * into request;
  return jsonb_build_object('status','submitted','request',jsonb_build_object(
    'id',request.id::text,'name',request.full_name,'email',request.email,'requestedRole',requested,'roleLabel',label,
    'group',request.academic_block,'motivation',request.motivation,'status',request.status,'requestedAt',request.requested_at));
end $$;
create function public.register_campus_request(p_full_name text,p_email text,p_requested_role text,p_academic_block text,p_motivation text)
returns jsonb language sql set search_path = ''
as $$ select campus_private.register_request(p_full_name,p_email,p_requested_role,p_academic_block,p_motivation) $$;

create function campus_private.finalize_request(request_key bigint, invited uuid) returns jsonb
language plpgsql security definer set search_path = ''
as $$
declare request public.access_requests%rowtype;
declare profile_id text;
begin
  if not campus_private.admin() then raise exception 'Sin autorización' using errcode='42501'; end if;
  select * into request from public.access_requests where id=request_key for update;
  if not found or request.status not in ('pending','approved') then raise exception 'Solicitud no disponible'; end if;
  if not exists (select 1 from auth.users where id=invited and lower(email)=lower(request.email) and invited_at is not null) then
    raise exception 'Invitación no vinculada a la solicitud';
  end if;
  profile_id := request.approved_profile_id;
  if request.status='pending' then
    if request.requested_role not in ('student','teacher','coordinator') then raise exception 'Rol no disponible'; end if;
    if exists (select 1 from public.profiles where auth_user_id=invited or lower(email)=lower(request.email)) then
      raise exception 'Ya existe un perfil para este correo';
    end if;
    profile_id := 'campus-' || invited::text;
    insert into public.profiles(id,auth_user_id,email,password_hash,full_name,initials,role,role_label,academic_block,is_profile_public)
      values(profile_id,invited,request.email,'managed-by-auth',request.full_name,upper(left(request.full_name,2)),
        request.requested_role,request.role_label,request.academic_block,false);
    update public.access_requests set status='approved',approved_profile_id=profile_id,issued_email=request.email,
      issued_temp_password=null,reviewed_at=now(),reviewed_by=(select full_name from public.profiles where id=campus_private.me())
      where id=request_key;
  end if;
  return jsonb_build_object('id',request.id::text,'name',request.full_name,'email',request.email,
    'requestedRole',request.requested_role,'roleLabel',request.role_label,'group',request.academic_block,
    'status','approved','issuedEmail',request.email,'requestedAt',request.requested_at,'approvedProfileId',profile_id,'credentialsIssued',true);
end $$;
create function public.finalize_campus_request(request_id bigint,invited_user uuid) returns jsonb
language sql set search_path = '' as $$ select campus_private.finalize_request(request_id,invited_user) $$;
create function public.campus_invited_identity(request_id bigint) returns uuid
language sql stable set search_path = ''
as $$ select u.id from auth.users u join public.access_requests r on lower(u.email)=lower(r.email)
      where r.id=request_id and r.status in ('pending','approved') and u.invited_at is not null
      order by u.created_at limit 1 $$;

create function campus_private.reject_request(request_key bigint) returns void
language plpgsql security definer set search_path = ''
as $$
begin
  if not campus_private.admin() then raise exception 'Sin autorización' using errcode='42501'; end if;
  update public.access_requests set status='rejected',reviewed_at=now(),
    reviewed_by=(select full_name from public.profiles where id=campus_private.me()) where id=request_key and status='pending';
  if not found then raise exception 'Solicitud no disponible'; end if;
end $$;
create function public.reject_campus_request(request_id bigint) returns void
language sql set search_path = '' as $$ select campus_private.reject_request(request_id) $$;

create function campus_private.evaluation(course text,due_date date,method text) returns void
language plpgsql security definer set search_path = ''
as $$
begin
  if not campus_private.teaches(course) then raise exception 'Curso sin asignación' using errcode='42501'; end if;
  update public.courses set next_evaluation_date=due_date,evaluation_method=coalesce(nullif(btrim(method),''),evaluation_method)
    where id=course;
end $$;
create function public.set_course_evaluation(course text,due_date date,method text) returns void
language sql set search_path = '' as $$ select campus_private.evaluation(course,due_date,method) $$;

create function public.save_tutor_conversation(conversation_id text,conversation_title text,specialty text,transcript jsonb)
returns void language plpgsql security invoker set search_path = ''
as $$
declare owner_id text := campus_private.me();
begin
  if owner_id is null or length(btrim(conversation_title)) not between 1 and 120
    or jsonb_typeof(transcript) is distinct from 'array' or jsonb_array_length(transcript)>500 then
    raise exception 'Conversación inválida';
  end if;
  insert into public.tutor_sessions(id,user_id,title,specialty_domain,updated_at)
    values(conversation_id,owner_id,conversation_title,specialty,now())
  on conflict(id) do update set title=excluded.title,specialty_domain=excluded.specialty_domain,updated_at=now();
  insert into public.tutor_messages(session_id,client_id,sender_role,model_used,content,helpful)
    select conversation_id,item->>'id',item->>'role',item->>'model',item->>'text',coalesce((item->>'helpful')::boolean,false)
    from jsonb_array_elements(transcript) with ordinality as message(item,position) order by position
  on conflict(session_id,client_id) do update set helpful=excluded.helpful;
end $$;

create function campus_private.start_thread(thread_key text,kind text,course text,title text,recipient text,body text)
returns void language plpgsql security definer set search_path = ''
as $$
declare sender public.profiles%rowtype;
declare destination text;
begin
  select * into sender from public.profiles where id=campus_private.me();
  if sender.id is null or title is null or length(btrim(title)) not between 1 and 100
    or body is null or length(btrim(body)) not between 1 and 2000 then raise exception 'Mensaje inválido'; end if;
  case kind
    when 'course_inquiry' then
      if not (campus_private.staff() or campus_private.enrolled(course)) or recipient is null
        or not exists(select 1 from public.courses where id=course and teacher_id=recipient) then
        raise exception 'Instructor o curso sin acceso' using errcode='42501';
      end if;
    when 'incident_report' then
      if not (campus_private.enrolled(course) or campus_private.teaches(course)) then
        raise exception 'Curso sin acceso' using errcode='42501';
      end if;
      destination := 'coordinator'; recipient := null;
    when 'urgent_admin' then
      destination := 'admin'; recipient := null; course := null;
    else raise exception 'Tipo de mensaje inválido';
  end case;
  insert into public.direct_threads(id,thread_kind,course_id,subject,created_by,recipient_id,target_role,incident_status)
    values(thread_key,kind,course,btrim(title),sender.id,recipient,destination,'open');
  insert into public.direct_messages(thread_id,sender_id,sender_name,sender_role,content)
    values(thread_key,sender.id,sender.full_name,sender.role,btrim(body));
end $$;
create function public.start_campus_thread(thread_id text,kind text,course text,title text,recipient text,body text)
returns void language sql set search_path = ''
as $$ select campus_private.start_thread(thread_id,kind,course,title,recipient,body) $$;

create function campus_private.reply_thread(thread_key text,body text) returns void
language plpgsql security definer set search_path = ''
as $$
declare sender public.profiles%rowtype;
begin
  select * into sender from public.profiles where id=campus_private.me();
  if sender.id is null or not campus_private.thread_visible(thread_key) then raise exception 'Hilo sin acceso' using errcode='42501'; end if;
  if body is null or length(btrim(body)) not between 1 and 2000 then raise exception 'Mensaje inválido'; end if;
  insert into public.direct_messages(thread_id,sender_id,sender_name,sender_role,content)
    values(thread_key,sender.id,sender.full_name,sender.role,btrim(body));
  update public.direct_threads set updated_at=now() where id=thread_key;
end $$;
create function public.reply_campus_thread(thread_id text,body text) returns void
language sql set search_path = '' as $$ select campus_private.reply_thread(thread_id,body) $$;

create function campus_private.review_thread(thread_key text,next_status text) returns void
language plpgsql security definer set search_path = ''
as $$
begin
  if not (campus_private.staff() and campus_private.thread_visible(thread_key)) then raise exception 'Hilo sin acceso' using errcode='42501'; end if;
  if next_status is null or next_status not in ('open','verifying_with_instructor','resolved') then raise exception 'Estado inválido'; end if;
  update public.direct_threads set incident_status=next_status,updated_at=now()
  where id=thread_key and thread_kind in ('incident_report','urgent_admin');
  if not found then raise exception 'Incidencia no disponible'; end if;
end $$;
create function public.review_campus_thread(thread_id text,next_status text) returns void
language sql set search_path = '' as $$ select campus_private.review_thread(thread_id,next_status) $$;

create function campus_private.course_history()
returns table (student_id text,course_id text,status text,certified_at date)
language sql stable security definer set search_path = ''
as $$
  select e.student_id,e.course_id,e.status,e.certified_at
  from public.course_enrollments e join public.profiles p on p.id=e.student_id
  where campus_private.me() is not null and e.enrolled and p.role='student' and p.is_profile_public
$$;
create function public.public_campus_course_history()
returns table (student_id text,course_id text,status text,certified_at date)
language sql stable security invoker set search_path = ''
as $$ select * from campus_private.course_history() $$;

revoke execute on all functions in schema campus_private from public, anon, authenticated;
grant execute on all functions in schema campus_private to authenticated;
grant execute on function campus_private.register_request(text,text,text,text,text) to anon;
revoke execute on function public.current_campus_profile(), public.register_campus_request(text,text,text,text,text),
  public.finalize_campus_request(bigint,uuid),public.campus_invited_identity(bigint),public.reject_campus_request(bigint),
  public.set_course_evaluation(text,date,text),public.save_tutor_conversation(text,text,text,jsonb),
  public.start_campus_thread(text,text,text,text,text,text),public.reply_campus_thread(text,text),public.review_campus_thread(text,text),
  public.public_campus_course_history()
  from public, anon, authenticated;
grant execute on function public.current_campus_profile(),public.finalize_campus_request(bigint,uuid),public.reject_campus_request(bigint),
  public.set_course_evaluation(text,date,text),public.save_tutor_conversation(text,text,text,jsonb),
  public.start_campus_thread(text,text,text,text,text,text), public.reply_campus_thread(text,text),public.review_campus_thread(text,text),
  public.public_campus_course_history() to authenticated;
grant execute on function public.register_campus_request(text,text,text,text,text) to anon,authenticated;
grant execute on function public.campus_invited_identity(bigint) to service_role;

do $$
declare table_name text;
declare sequence_name text;
begin
  foreach table_name in array array['course_enrollments','course_attendance','tutor_messages'] loop
    sequence_name := pg_get_serial_sequence('public.' || table_name,'id');
    if sequence_name is not null then execute format('grant usage,select on sequence %s to authenticated',sequence_name); end if;
  end loop;
end $$;
commit;
