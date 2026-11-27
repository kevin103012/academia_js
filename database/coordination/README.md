# Institutional Coordination database

The deployment reuses the existing public campus tables. It does not create
users, infer institutional ownership, change existing data, or copy password
hashes. It adds a private authorization mapping and explicit institutional
markers. An instructor change, or the absence of an instructor, does not change
which institution owns a course.

**Rollout gate:** verify the scoped admin and instructor academic flows
end-to-end with trusted institutional sessions before releasing. The
browser-local/whole-workspace legacy adapter does not provide managed academic
access, and should not be changed to use direct table grants.

## Deploy and verify

- Use the existing database-owner session for the authorized project. Before
  applying, confirm that the Data API does not expose the
  `coordination_private` schema. The public entry points are security-invoker
  functions; only `authenticated` may execute them. The no-login private
  runtime has narrowly granted privileges and does not have `BYPASSRLS`.
- Run `BEGIN;`, the entire `deploy.sql`, the entire `probes.sql`, then
  `ROLLBACK;` in the same database session for preflight. The probes identify
  their own fixtures using random identifiers and roll back their fixture
  subtransaction, including identity sequence restarts. Run them on a
  disposable database when possible; transactional DDL and sequence restarts
  take locks until the corresponding transaction ends.
- After a passing preflight, deploy `deploy.sql` once inside its own
  transaction and commit through the approved migration process. It has no
  internal transaction boundary. It is intentionally not rerunnable over an
  existing deployment.
- Run the authorized rollout checks after deployment: inspect the functions'
  grants, verify the PostgREST schema cache loaded the new RPCs, run the
  rollback-isolated probes, review Supabase Security Advisors, and verify
  browser sign-in with real operator-provisioned memberships. The probes
  exercise SQL authorization; they do not verify credentials or the HTTP edge.

## Provision with a trusted operator

1. Create or verify the user in Supabase Auth via the existing approved Auth
   administration flow. Verify its live Auth UUID and the intended existing
   campus profile ID independently. If necessary, arrange a trusted existing
   profile through the established flow before binding it. Do not assign
   memberships from editable public profile fields, public login results, user
   metadata, inferred teacher associations, or matching institution names.
2. Insert an explicitly approved stable institutional ID and display name in
   `coordination_private.institutions`. For every approved participant insert
   the independently verified profile ID and UUID, that institutional ID, the
   approved role (`coordinator`, `admin`, `teacher`, or `student`), and the approved
   academic block into `coordination_private.memberships`. SQL authorization
   requires both an enabled record and a current non-guest Auth identity. There
   is no client-facing provisioning endpoint. Review Auth/legacy compatibility
   before binding any existing user: a bound profile is no longer exposed as
   a raw public table row, even to a legacy application session. Protected
   profile preferences remain editable through the coordinator RPC, not the
   older approval workflow.
3. Explicitly associate institutional periods using
   `coordination_private.periods`. Managed periods remain readable as legacy
   metadata, but legacy clients cannot change or delete them. Period IDs may
   be mapped to only one institution; provision distinct records if a legacy
   period label is used by multiple institutions.
4. Do not backfill legacy courses until each specific course and its
   relationships have been approved for that institution. Review the course's
   period and instructor, and align approved enrollments and any children
   before setting `courses.coordination_institution_id`. An unmapped legacy
   row stays in the legacy workspace and is not inferred from its teacher,
   academic block, or period. Courses created by Coordination are marked in
   the same write as the course and its schedule.
5. To revoke access, set the private membership's `enabled` to false and
   revoke the Auth session through the approved process as appropriate. Do not
   delete its private mapping to revoke access: the retained mapping keeps the
   public profile protected. Do not change an existing profile's institutional
   assignment or point the binding at a different person's Auth account; use
   a separately approved transfer/deprovisioning plan so old records retain
   their intended scope.

## Data and compatibility boundaries

- Public RPCs: `coordination_identity()`, `coordination_snapshot()`,
  `coordination_command(op, payload)`, `coordination_recipient_inbox()`,
  `coordination_recipient_command(op, payload)`,
  `coordination_teacher_workspace()`, and
  `coordination_teacher_command(op, payload)`. Students and instructors do
  not have the institutional staff snapshot or its mutations.
- Trusted institutional administrators may read the academic portion of the
  institutional snapshot for their institution. They receive empty
  nonacademic arrays and do not have coordinator-only commands. They may
  create a course or update its catalog metadata (`course.update`:
  `course_id`, `name`, `description`, `category`, `academic_block`), not
  rewrite the instructor, schedule, dates, or institutional ownership on
  existing courses through that operation.
- Institutional instructors may list assigned courses, their activities and
  active roster and attendance using the instructor workspace. They may
  create an activity (`course_id`, `title`, `instructions`, `due_date`,
  `max_score`) or insert/correct one course attendance mark (`course_id`,
  `student_id`, `session_date`, `status`). The database binds the attendance
  author and requires a current, same-institution enrolled student, an
  assigned instructor, and a date within that course.
- Selected individuals receive events only through their private recipient
  association. Course recipients are the assigned teacher and active enrolled
  students; role and block audiences require the caller's active membership
  in the same institution. Personal events appear only for their owner.
  Private recipient lists are not returned by the RPCs.
- A valid student or instructor can report an incident for a currently
  available course. The report is placed in the institutional coordinator
  queue; the coordinator can open a separate private verification thread with
  the instructor without disclosing the student's conversation. Participants
  can reply only in their own threads while their course access is active.
  Non-participating coordinators may triage incidents, but cannot read or
  reply to private course inquiries. The participant directory does not
  disclose a coordinator's academic block.
- Managed academic inputs are **not** writable through the legacy browser API.
  Beyond the narrow staff commands above, trusted course workflows must
  provide lessons, enrollments, submissions and grading as appropriate. Use matching
  course/student enrollment relationships, and matching course/lesson
  relationships. Reports exclude attendance without a qualifying enrollment
  in that same course and return ungraded submissions as null, not zero.
  Existing browser enrollment/teacher/admin behavior for unmapped academic
  records is unchanged; this deployment does not authorize legacy sessions
  to read or modify the newly protected records. Direct loose policies on
  unrelated legacy data are outside this change.
- The legacy workspace loads browser-local state, or calls
  `GET /workspace` and writes the entire workspace with `PUT /workspace`
  when a backend is configured. This preserves the existing non-managed
  workflows; neither whole-workspace operation is an appropriate interface
  for managed academics. Student registration is not a managed course
  enrollment, and the old attendance payload omits the course identifier.
  No broad administration, enrollment, or grading interface is introduced
  by these database changes.
- The existing analytics view now evaluates its source RLS as the caller, to
  prevent it exposing managed courses and their children. No broad legacy
  policy, unrelated RPC, or raw data was removed. The untrusted SQL roles
  no longer have `TRUNCATE` and `TRIGGER` privileges on managed tables and
  their public ancestors; PostgreSQL RLS does not restrict those privileges.
