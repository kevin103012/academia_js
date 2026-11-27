# Coordination integration contract
The parent owns contract.ts, routing, sign-in, sandbox adapter, and integration. One isolated coordinator shell, never mount the old WorkspaceProvider for this role. UI modules receive ModuleProps; await run() and handle errors. All array keys always present. SQL functions public.coordination_snapshot() and public.coordination_command(op text, payload jsonb). Rows and IDs as in contract.ts; snapshot excludes emails, hashes, submissions content. Day of week uses ISO 1–7. No pending score is a zero.
Commands accept only these fields (generated IDs, actors and institution supplied by service):
- course.create: name, description, category, academic_block, teacher_id, period_id, start_date, end_date, days:number[], start_time, end_time
- thread.create: subject, course_id, recipient_id, content, thread_kind (incident_report or course_inquiry)
- thread.reply: thread_id, content
- thread.status: thread_id, incident_status (open, verifying_with_instructor, resolved)
- group.create: name, category, course_id, academic_block, period_id, assigned_teacher_id
- event.create: title, event_date, start_time, end_time, location, visibility_scope (personal, course, block, role, individual), target_course_id?, target_block?, target_role?, recipient_ids?:string[]. Explicit audience selection.
- profile.update: full_name, bio, is_profile_public, preferred_language (es/en), preferred_theme (original/light/dark).
Live source of truth is hosted. Truly isolated example data can use separate local-only keys. Never send hosted academic records to third parties. Pre-existing unassigned records preserved, not implicitly visible.
