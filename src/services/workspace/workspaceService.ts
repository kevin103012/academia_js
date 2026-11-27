import { env } from '../../config/env'
import { createInitialWorkspace } from '../../data/workspaceSeed'
import type { DemoRole, DemoUser } from '../../types/auth'
import type { LearningProgress } from '../../types/learning'
import type {
  AcademicPeriod,
  AccessRequest,
  Activity,
  Attendance,
  AuditRecord,
  CalendarCategory,
  CalendarEvent,
  CalendarScope,
  Course,
  CourseCategoryId,
  Notice,
  NoticeScope,
  Student,
  Submission,
  Workspace,
} from '../../types/workspace'
import { dateKey } from '../../utils/date'
import { apiClient } from '../http/apiClient'
import { localStore } from '../storage/localStore'
import { getSupabaseClient } from '../supabase/supabaseClient'
import { DEMO_WORKSPACE_KEY } from '../auth/authService'

export interface WorkspaceService {
  load(): Promise<Workspace>
  save(workspace: Workspace): Promise<boolean>
  approveAccessRequest(requestId: string, reviewerName: string, tempPassword?: string): Promise<AccessRequest>
  rejectAccessRequest(requestId: string, reviewerName: string): Promise<void>
}

const SESSION_KEY = 'juniors-sparks:session-user:v2'

let lastSynced: Workspace | undefined

function changedRows<T>(before: T[], after: T[], key: (item: T) => string) {
  const previous = new Map(before.map((item) => [key(item), item]))
  return after.filter((item) => previous.get(key(item)) !== item)
}

function removedIds<T extends { id: string }>(before: T[], after: T[]) {
  const current = new Set(after.map(({ id }) => id))
  return before.filter(({ id }) => !current.has(id)).map(({ id }) => id)
}

function getActiveSessionUser(): DemoUser | null {
  return localStore.getJson<DemoUser>(SESSION_KEY)
}

function isValidWorkspace(candidate: Partial<Workspace> | null, defaults: Workspace): candidate is Workspace {
  if (!candidate) return false
  return Object.keys(defaults).every((key) => {
    const field = key as keyof Workspace
    return Array.isArray(defaults[field])
      ? Array.isArray(candidate[field])
      : typeof candidate[field] === 'object' && candidate[field] !== null
  })
}

function toInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (!parts.length) return 'US'
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return `${parts[0][0]}${parts[1][0]}`.toUpperCase()
}

const supabaseWorkspaceService: WorkspaceService = {
  async load() {
    const supabase = getSupabaseClient()
    if (!supabase) return localWorkspaceService.load()
    lastSynced = undefined

    const sessionUser = getActiveSessionUser()
    const enrollmentOwnerId = sessionUser?.id ?? 'student'
    const enrollmentQuery = supabase.from('course_enrollments').select('*')

    const [
      periodsRes,
      coursesRes,
      activitiesRes,
      submissionsRes,
      noticesRes,
      eventsRes,
      attendanceRes,
      studentsRes,
      requestsRes,
      enrollmentsRes,
      auditRes,
    ] = await Promise.all([
      supabase.from('academic_periods').select('*').order('start_date', { ascending: false }),
      supabase.from('courses').select('*').order('created_at', { ascending: true }),
      supabase.from('course_activities').select('*').order('due_date', { ascending: true }),
      supabase.from('activity_submissions').select('*'),
      supabase.from('notices').select('*').order('published_date', { ascending: false }),
      supabase.from('calendar_events').select('*').order('event_date', { ascending: true }),
      supabase.from('course_attendance').select('*').order('session_date', { ascending: false }),
      supabase.from('profiles').select('id, full_name, academic_block').eq('role', 'student').order('full_name'),
      sessionUser?.role === 'admin' ? supabase.from('access_requests')
        .select('id,full_name,email,requested_role,role_label,academic_block,motivation,status,issued_email,approved_profile_id,requested_at').order('requested_at', { ascending: false })
        : Promise.resolve({ data: [], error: null }),
      sessionUser?.role === 'student' ? enrollmentQuery.eq('student_id', enrollmentOwnerId) : enrollmentQuery,
      supabase.from('audit_logs').select('*').order('created_at', { ascending: false }).limit(50),
    ])

    const anyError =
      periodsRes.error ||
      coursesRes.error ||
      activitiesRes.error ||
      submissionsRes.error ||
      noticesRes.error ||
      eventsRes.error ||
      attendanceRes.error ||
      studentsRes.error ||
      requestsRes.error ||
      enrollmentsRes.error ||
      auditRes.error

    if (anyError) {
      throw new Error('No se pudo conectar con los datos del campus.')
    }

    const courses: Course[] = (coursesRes.data ?? []).map((row) => ({
      id: row.id,
      category: row.category as CourseCategoryId,
      name: row.name,
      group: row.academic_block,
      teacher: row.teacher_name,
      teacherId: row.teacher_id ?? undefined,
      color: row.color as Course['color'],
      description: row.description,
      period: row.period_id,
      startDate: row.start_date,
      endDate: row.end_date,
      durationWeeks: row.duration_weeks,
      evaluationMethod: row.evaluation_method,
      scheduleSummary: row.schedule_summary,
      nextEvaluationDate: row.next_evaluation_date ?? undefined,
    }))

    const activities: Activity[] = (activitiesRes.data ?? []).map((row) => ({
      id: row.id,
      courseId: row.course_id,
      title: row.title,
      instructions: row.instructions,
      due: row.due_date,
      activityType: row.activity_type as Activity['activityType'],
    }))

    const submissions: Submission[] = (submissionsRes.data ?? []).map((row) => ({
      id: row.id,
      activityId: row.activity_id,
      studentId: row.student_id,
      content: row.content,
      submittedAt: row.submitted_at,
      score: row.score !== null && row.score !== undefined ? Number(row.score) : undefined,
      feedback: row.feedback ?? undefined,
    }))

    const notices: Notice[] = (noticesRes.data ?? []).map((row) => ({
      id: row.id,
      title: row.title,
      content: row.content,
      author: row.author_name,
      authorId: row.author_id ?? undefined,
      date: row.published_date,
      scope: row.scope as NoticeScope,
      courseId: row.course_id ?? undefined,
      isPinned: Boolean(row.is_pinned),
    }))

    const events: CalendarEvent[] = (eventsRes.data ?? []).map((row) => ({
      id: row.id,
      title: row.title,
      date: row.event_date,
      time: row.start_time,
      endTime: row.end_time,
      location: row.location,
      category: row.category as CalendarCategory,
      audience: row.audience,
      visibility: row.visibility_scope as CalendarScope | undefined,
      ownerId: row.owner_id ?? undefined,
      targetCourseId: row.target_course_id ?? undefined,
      targetBlock: row.target_block ?? undefined,
      targetRole: row.target_role as DemoRole | undefined,
    }))

    const attendance: Attendance[] = (attendanceRes.data ?? []).map((row) => ({
      courseId: row.course_id,
      studentId: row.student_id,
      date: row.session_date,
      status: row.status as Attendance['status'],
    }))

    const students: Student[] = (studentsRes.data ?? []).map((row) => ({
      id: row.id,
      name: row.full_name,
      group: row.academic_block,
    }))

    const accessRequests: AccessRequest[] = (requestsRes.data ?? []).map((row) => ({
      id: String(row.id),
      name: row.full_name,
      email: row.email,
      requestedRole: row.requested_role as DemoRole,
      roleLabel: row.role_label,
      group: row.academic_block,
      motivation: row.motivation ?? '',
      status: row.status as AccessRequest['status'],
      requestedAt: String(row.requested_at).slice(0, 10),
      credentialsIssued: row.status === 'approved' && Boolean(row.issued_email),
      issuedEmail: row.issued_email ?? undefined,
      approvedProfileId: row.approved_profile_id ?? undefined,
    }))

    const periods: AcademicPeriod[] = (periodsRes.data ?? []).map((row) => ({
      id: row.id,
      name: row.name,
      startDate: row.start_date,
      endDate: row.end_date,
      status: row.status as AcademicPeriod['status'],
    }))

    const progress: LearningProgress = {}
    const courseRoster: Record<string, string[]> = Object.create(null)
    for (const row of enrollmentsRes.data ?? []) {
      if (row.enrolled) (courseRoster[row.course_id] ??= []).push(row.student_id)
      if (row.student_id !== enrollmentOwnerId) continue
      progress[row.course_id] = {
        enrolled: Boolean(row.enrolled),
        lessons: Array.isArray(row.completed_lesson_ids) ? row.completed_lesson_ids : [],
        watchedVideos: Array.isArray(row.watched_video_lesson_ids) ? row.watched_video_lesson_ids : [],
        score: row.score !== null && row.score !== undefined ? Number(row.score) : undefined,
        certifiedAt: row.certified_at ?? undefined,
      }
    }

    const audit: AuditRecord[] = (auditRes.data ?? []).map((row) => ({
      id: row.id,
      actor: row.actor_name,
      action: row.action,
      date: row.event_date,
    }))

    const loaded: Workspace = {
      courses,
      activities,
      submissions,
      notices,
      events,
      attendance,
      students,
      accessRequests,
      periods,
      progress,
      courseRoster,
      audit,
    }
    lastSynced = loaded
    return loaded
  },

  async save(workspace) {
    const supabase = getSupabaseClient()
    if (!supabase) return true
    const previous = lastSynced
    if (!previous) return false

    const sessionUser = getActiveSessionUser()
    const enrollmentOwnerId = sessionUser?.id ?? 'student'

    const removedCourses = removedIds(previous.courses, workspace.courses)
    const removedActivities = removedIds(previous.activities, workspace.activities)
    const removedNotices = removedIds(previous.notices, workspace.notices)
    const removedEvents = removedIds(previous.events, workspace.events)
    const periods = changedRows(previous.periods, workspace.periods, (item) => item.id)
    const courses = changedRows(previous.courses, workspace.courses, (item) => item.id)
    const activities = changedRows(previous.activities, workspace.activities, (item) => item.id)
    const submissions = changedRows(previous.submissions, workspace.submissions, (item) => item.id)
    const notices = changedRows(previous.notices, workspace.notices, (item) => item.id)
    const events = changedRows(previous.events, workspace.events, (item) => item.id)

    const tasks: PromiseLike<unknown>[] = []

    if (periods.length) {
      tasks.push(
        supabase.from('academic_periods').upsert(
          periods.map((period) => ({
            id: period.id,
            name: period.name,
            start_date: period.startDate,
            end_date: period.endDate,
            status: period.status,
          })),
          { onConflict: 'id' },
        ),
      )
    }

    if (courses.length && sessionUser?.role === 'teacher') {
      for (const course of courses) tasks.push(supabase.rpc('set_course_evaluation', {
        course: course.id, due_date: course.nextEvaluationDate ?? null, method: course.evaluationMethod ?? null,
      }))
    } else if (courses.length) {
      tasks.push(
        supabase.from('courses').upsert(
          courses.map((course) => ({
            id: course.id,
            period_id: course.period || workspace.periods[0]?.id || '2026-II',
            category: course.category,
            name: course.name,
            description: course.description,
            academic_block: course.group,
            teacher_name: course.teacher,
            teacher_id: course.teacherId ?? null,
            color: course.color,
            duration_weeks: course.durationWeeks ?? 16,
            evaluation_method:
              course.evaluationMethod ?? 'Continua: Laboratorios (40%) + Proyecto (35%) + Examen (25%)',
            schedule_summary: course.scheduleSummary ?? 'Mar y Jue · 08:30 - 10:45 · Lab 204',
            start_date: course.startDate || dateKey(),
            end_date: course.endDate || dateKey(),
            next_evaluation_date: course.nextEvaluationDate ?? null,
          })),
          { onConflict: 'id' },
        ),
      )
    }

    if (removedCourses.length) {
      tasks.push(supabase.from('courses').delete().in('id', removedCourses))
    }

    if (activities.length) {
      tasks.push(
        supabase.from('course_activities').upsert(
          activities.map((act) => ({
            id: act.id,
            course_id: act.courseId,
            title: act.title,
            instructions: act.instructions,
            activity_type: act.activityType ?? 'practica',
            due_date: act.due,
          })),
          { onConflict: 'id' },
        ),
      )
    }

    if (removedActivities.length) {
      tasks.push(supabase.from('course_activities').delete().in('id', removedActivities))
    }

    if (submissions.length && sessionUser?.role !== 'student') {
      for (const sub of submissions) tasks.push(supabase.from('activity_submissions')
        .update({ score: sub.score ?? null, feedback: sub.feedback ?? null }).eq('id', sub.id))
    } else if (submissions.length) {
      const existingIds = new Set(previous.submissions.map((submission) => submission.id))
      for (const submission of submissions) {
        const data = { content: submission.content, submitted_at: submission.submittedAt }
        tasks.push(existingIds.has(submission.id)
          ? supabase.from('activity_submissions').update(data).eq('id', submission.id).select('id').single()
          : supabase.from('activity_submissions').upsert({
              ...data, id: submission.id, activity_id: submission.activityId, student_id: submission.studentId,
            }, { onConflict: 'id', ignoreDuplicates: true }))
      }
    }

    if (notices.length) {
      tasks.push(
        supabase.from('notices').upsert(
          notices.map((notice) => ({
            id: notice.id,
            scope: notice.scope ?? 'general',
            course_id: notice.courseId ?? null,
            title: notice.title,
            content: notice.content,
            author_name: notice.author,
            author_id: notice.authorId ?? null,
            is_pinned: Boolean(notice.isPinned),
            published_date: notice.date,
          })),
          { onConflict: 'id' },
        ),
      )
    }

    if (removedNotices.length) {
      tasks.push(supabase.from('notices').delete().in('id', removedNotices))
    }

    if (events.length) {
      tasks.push(
        supabase.from('calendar_events').upsert(
          events.map((ev) => ({
            id: ev.id,
            title: ev.title,
            category: ev.category ?? 'clase',
            location: ev.location,
            event_date: ev.date,
            start_time: ev.time,
            end_time: ev.endTime ?? ev.time,
            audience: ev.audience ?? 'Todos los estudiantes',
            visibility_scope: ev.visibility ?? 'global',
            owner_id: ev.ownerId ?? null,
            target_course_id: ev.targetCourseId ?? null,
            target_block: ev.targetBlock ?? null,
            target_role: ev.targetRole ?? null,
          })),
          { onConflict: 'id' },
        ),
      )
    }

    if (removedEvents.length) {
      tasks.push(supabase.from('calendar_events').delete().in('id', removedEvents))
    }

    const enrollmentsPayload = Object.entries(workspace.progress)
      .filter(([courseId, entry]) => workspace.progress[courseId] !== previous.progress[courseId] && entry.enrolled)
      .map(([courseId, entry]) => ({
      course_id: courseId,
      student_id: enrollmentOwnerId,
      enrolled: entry.enrolled,
      status: entry.certifiedAt ? 'completed' : 'active',
      completed_lesson_ids: entry.lessons,
      watched_video_lesson_ids: entry.watchedVideos ?? [],
      score: entry.score ?? null,
      certified_at: entry.certifiedAt ?? null,
    }))
    if (enrollmentsPayload.length) {
      tasks.push(
        supabase
          .from('course_enrollments')
          .upsert(enrollmentsPayload, { onConflict: 'course_id,student_id' }),
      )
    }

    const attendanceRows = changedRows(previous.attendance, workspace.attendance, (item) => [item.courseId, item.studentId, item.date].join(':'))
      .filter((att) => Boolean(att.courseId && att.studentId && att.date))
      .map((att) => ({
        course_id: att.courseId!,
        student_id: att.studentId,
        session_date: att.date,
        status: att.status,
      }))
    if (attendanceRows.length) {
      tasks.push(
        supabase
          .from('course_attendance')
          .upsert(attendanceRows, { onConflict: 'course_id,student_id,session_date' }),
      )
    }

    const audit = changedRows(previous.audit, workspace.audit, (item) => item.id)
    if (audit.length) {
      tasks.push(
        supabase.from('audit_logs').upsert(
          audit.map((record) => ({
            id: record.id,
            actor_name: record.actor,
            actor_id: sessionUser?.id ?? null,
            action: record.action,
            event_date: record.date,
          })),
          { onConflict: 'id', ignoreDuplicates: true },
        ),
      )
    }

    const results = (await Promise.all(tasks)) as Array<{ error?: { message: string } | null }>
    const failed = results.find((res) => res?.error)
    if (failed?.error) {
      console.error('Supabase workspace save error:', failed.error.message)
      return false
    }

    lastSynced = workspace

    return true
  },

  async approveAccessRequest(requestId, reviewerName, tempPassword) {
    const supabase = getSupabaseClient()
    if (!supabase) return localWorkspaceService.approveAccessRequest(requestId, reviewerName, tempPassword)

    const { data, error } = await supabase.functions.invoke<AccessRequest>('campus-approve', { body: { requestId } })
    if (error || !data) throw new Error('No se pudo enviar la invitación. Comprueba la configuración de correo del campus.')
    return data
  },

  async rejectAccessRequest(requestId, reviewerName) {
    const supabase = getSupabaseClient()
    if (!supabase) return localWorkspaceService.rejectAccessRequest(requestId, reviewerName)

    const { error } = await supabase.rpc('reject_campus_request', { request_id: requestId })
    if (error) {
      throw new Error(error.message)
    }
  },
}

const localWorkspaceService: WorkspaceService = {
  async load() {
    const defaults = createInitialWorkspace()
    const saved = localStore.getJson<Partial<Workspace>>(DEMO_WORKSPACE_KEY)
    return isValidWorkspace(saved, defaults) ? saved : defaults
  },

  async save(workspace) {
    return localStore.setJson(DEMO_WORKSPACE_KEY, workspace)
  },

  async approveAccessRequest(requestId, _reviewerName, tempPassword) {
    const current = await this.load()
    const found = current.accessRequests.find((r) => r.id === requestId)
    if (!found || found.status !== 'pending') throw new Error('Solicitud no disponible')
    const issuedTempPassword = tempPassword || ('Sparks-' + globalThis.crypto.randomUUID().slice(0, 12))
    const updated: AccessRequest = {
      ...found,
      status: 'approved',
      credentialsIssued: true,
      issuedEmail: found.email,
      issuedTempPassword,
    }
    const next: Workspace = {
      ...current,
      accessRequests: current.accessRequests.map((r) => (r.id === requestId ? updated : r)),
      students:
        found.requestedRole === 'student' && !current.students.some((s) => s.email === found.email)
          ? [...current.students, { id: `usr-${requestId}`, name: found.name, group: found.group, email: found.email }]
          : current.students,
    }
    await this.save(next)
    void toInitials(found.name)
    return updated
  },

  async rejectAccessRequest(requestId) {
    const current = await this.load()
    const next: Workspace = {
      ...current,
      accessRequests: current.accessRequests.map((r) => (r.id === requestId ? { ...r, status: 'rejected' } : r)),
    }
    await this.save(next)
  },
}

const httpWorkspaceService: WorkspaceService = {
  load: () => apiClient.get<Workspace>('/workspace'),
  save: async (workspace) => {
    await apiClient.put<void>('/workspace', workspace)
    return true
  },
  approveAccessRequest: (requestId, reviewerName, tempPassword) =>
    apiClient.post<AccessRequest>(`/access-requests/${requestId}/approve`, { reviewerName, tempPassword }),
  rejectAccessRequest: (requestId, reviewerName) =>
    apiClient.post<void>(`/access-requests/${requestId}/reject`, { reviewerName }),
}

export const workspaceService: WorkspaceService = env.hasSupabase
  ? supabaseWorkspaceService
  : env.apiUrl
    ? httpWorkspaceService
    : localWorkspaceService
