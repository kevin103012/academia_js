import type { Activity, Attendance, Course, Snapshot } from '../contract'

export type AcademicDates = { from?: string; until?: string }
export type AcademicFilters = { block: string; period: string; course: string; from: string; until: string }
export const emptyFilters: AcademicFilters = { block: '', period: '', course: '', from: '', until: '' }

export function withinAcademicDates(value: string | undefined, { from, until }: AcademicDates = {}) {
  if (!from && !until) return true
  const date = value?.slice(0, 10) ?? ''
  return /^\d{4}-\d{2}-\d{2}$/.test(date) && (!from || date >= from) && (!until || date <= until)
}

export function applyAcademicFilters(courses: Course[], { block, period, course }: AcademicFilters) {
  return courses.filter(item => (!block || item.academic_block === block)
    && (!period || item.period_id === period) && (!course || item.id === course))
}

function rowsBy<T>(rows: T[], key: (row: T) => string) {
  const groups = new Map<string, T[]>()
  for (const row of rows) {
    const id = key(row)
    const group = groups.get(id)
    if (group) group.push(row)
    else groups.set(id, [row])
  }
  return groups
}

function* validAttendance(records: Attendance[]) {
  const byStudent = rowsBy(records, record => record.student_id)
  for (const [studentId, rows] of byStudent) {
    for (const [date, sessions] of rowsBy(rows, row => row.session_date)) {
      const marks = new Set(sessions.map(row => row.status))
      // A contradictory duplicate does not establish what happened that day.
      if (marks.size !== 1) continue
      const status = sessions[0].status
      if (status === 'Presente' || status === 'Tardanza' || status === 'Ausente') {
        yield { studentId, date, attended: status !== 'Ausente' }
      }
    }
  }
}

function attendanceCounts(records: Attendance[]) {
  const counts = new Map(records.map(record => [record.student_id, { attended: 0, marked: 0 }]))
  for (const { studentId, attended } of validAttendance(records)) {
    const count = counts.get(studentId)!
    count.marked++
    if (attended) count.attended++
  }
  return counts
}

const rate = (count: number, total: number) => total ? count * 100 / total : null
const percent = (score: number | null, max: number) =>
  score !== null && Number.isFinite(score) && Number.isFinite(max) && max > 0 && score >= 0
    ? score * 100 / max : null

export function attendanceForStudents(data: Snapshot, courseId: string) {
  const counts = attendanceCounts(data.attendance.filter(item => item.course_id === courseId))
  const students = new Set(data.enrollments.filter(item => item.course_id === courseId && item.enrolled).map(item => item.student_id))
  for (const id of counts.keys()) students.add(id)
  return [...students].map(id => {
    const name = data.people.find(person => person.id === id)?.full_name ?? ''
    const { attended, marked } = counts.get(id) ?? { attended: 0, marked: 0 }
    return { id, name, attended, marked, rate: rate(attended, marked) }
  }).sort((a, b) => a.name.localeCompare(b.name) || a.id.localeCompare(b.id))
}

export interface CourseMetrics {
  course: Course
  enrolled: number
  activities: number
  graded: number
  average: number | null
  attended: number
  marked: number
  attendanceRate: number | null
}

export function academicOverview(data: Snapshot, courses: Course[], dates?: AcademicDates): CourseMetrics[] {
  const enrollment = rowsBy(data.enrollments.filter(item => item.enrolled && withinAcademicDates(item.enrolled_at, dates)), item => item.course_id)
  const activities = rowsBy(data.activities, item => item.course_id)
  const submissions = rowsBy(data.submissions.filter(item => withinAcademicDates(item.submitted_at, dates)), item => item.activity_id)
  const attendance = rowsBy(data.attendance.filter(item => withinAcademicDates(item.session_date, dates)), item => item.course_id)

  return courses.map(course => {
    const enrolled = new Set(enrollment.get(course.id)?.map(item => item.student_id)).size
    const assigned = activities.get(course.id) ?? []
    let graded = 0, grades = 0, attended = 0, marked = 0
    for (const activity of assigned) {
      for (const submission of submissions.get(activity.id) ?? []) {
        const score = percent(submission.score, activity.max_score)
        if (score !== null) { graded++; grades += score }
      }
    }
    for (const count of attendanceCounts(attendance.get(course.id) ?? []).values()) {
      attended += count.attended
      marked += count.marked
    }
    return { course, enrolled, activities: assigned.filter(item => withinAcademicDates(item.due_date, dates)).length, graded, average: graded ? grades / graded : null,
      attended, marked, attendanceRate: rate(attended, marked) }
  })
}

export function attendanceTrend(data: Snapshot, courses: Course[], dates?: AcademicDates) {
  const ids = new Set(courses.map(course => course.id))
  const weeks = new Map<string, { date: string; attended: number; marked: number }>()
  for (const records of rowsBy(data.attendance.filter(row => ids.has(row.course_id) && withinAcademicDates(row.session_date, dates)), row => row.course_id).values()) {
    for (const record of validAttendance(records)) {
      const date = new Date(record.date)
      if (!Number.isFinite(date.getTime())) continue
      date.setUTCDate(date.getUTCDate() - ((date.getUTCDay() + 6) % 7))
      const monday = date.toISOString().slice(0, 10)
      const week = weeks.get(monday) ?? { date: monday, attended: 0, marked: 0 }
      week.marked++
      if (record.attended) week.attended++
      weeks.set(monday, week)
    }
  }
  return [...weeks.values()].sort((a, b) => a.date.localeCompare(b.date)).slice(-8)
}

export function urgentFollowup(data: Snapshot, courses: Course[], today: string, dates?: AcademicDates) {
  const ids = new Set(courses.map(course => course.id))
  const overdue = new Set(data.activities.filter(activity => ids.has(activity.course_id) && withinAcademicDates(activity.due_date, dates)
    && activity.due_date && activity.due_date.slice(0, 10) < today).map(activity => activity.id))
  return {
    pendingGrades: data.submissions.filter(row => overdue.has(row.activity_id) && row.score === null).length,
    incidents: data.threads.filter(row => row.course_id && ids.has(row.course_id) && row.thread_kind === 'incident_report'
      && (row.incident_status === 'open' || row.incident_status === 'verifying_with_instructor')).length,
  }
}

export function activityStats(data: Snapshot, activity: Activity, today: string) {
  const submissions = data.submissions.filter(item => item.activity_id === activity.id)
  const grades = submissions.map(item => percent(item.score, activity.max_score)).filter(value => value !== null)
  return {
    submissions: submissions.length,
    graded: grades.length,
    average: grades.length ? grades.reduce((sum, value) => sum + value, 0) / grades.length : null,
    overdue: Boolean(activity.due_date && activity.due_date.slice(0, 10) < today),
    enrolled: new Set(data.enrollments.filter(item => item.course_id === activity.course_id && item.enrolled).map(item => item.student_id)).size,
  }
}

export const reportFields = ['course', 'instructor', 'block', 'period', 'enrolled', 'activities', 'graded', 'average', 'attendanceRate', 'marked'] as const
export type ReportField = (typeof reportFields)[number]
export type ReportCell = string | number | null

export function reportRows(metrics: CourseMetrics[], fields: readonly ReportField[], periods: Snapshot['periods'] = []): ReportCell[][] {
  const round = (value: number | null) => value === null ? null : Number(value.toFixed(2))
  const periodName = new Map(periods.map(item => [item.id, item.name]))
  return metrics.map(row => {
    const values: Record<ReportField, ReportCell> = {
      course: row.course.name, instructor: row.course.teacher_name || null, block: row.course.academic_block || null,
      period: periodName.get(row.course.period_id) ?? null, enrolled: row.enrolled, activities: row.activities,
      graded: row.graded, average: round(row.average), attendanceRate: round(row.attendanceRate), marked: row.marked,
    }
    return fields.map(field => values[field])
  })
}

export function reportChart(fields: readonly ReportField[], rows: ReportCell[][]) {
  const course = fields.indexOf('course')
  if (course < 0) return null
  for (const field of ['average', 'attendanceRate', 'enrolled'] as const) {
    const index = fields.indexOf(field)
    if (index < 0) continue
    const entries = rows.flatMap(row => typeof row[course] === 'string' && typeof row[index] === 'number'
      ? [{ name: row[course], value: row[index] }] : [])
      .sort((a, b) => b.value - a.value).slice(0, 8)
    if (entries.length) return { field, rows: entries }
  }
  return null
}

export function toCsv(headers: string[], rows: ReportCell[][]) {
  const escape = (value: ReportCell) => {
    let field = String(value ?? '')
    if (typeof value === 'string' && (/^\s*[=+@-]/.test(value) || /^[\t\r\n]/.test(value))) field = "'" + field
    return /[",\r\n]/.test(field) ? '"' + field.replaceAll('"', '""') + '"' : field
  }
  return [headers, ...rows].map(row => row.map(escape).join(',')).join('\r\n')
}

type CourseFields = Pick<Course, 'name' | 'description' | 'category' | 'academic_block' | 'period_id' | 'start_date' | 'end_date'> & {
  teacher_id: string; days: number[]; start_time: string; end_time: string
}
export type CourseFieldError = 'name' | 'category' | 'teacher' | 'block' | 'period' | 'dates' | 'schedule' | 'scheduleDates'

export function coursePayload(fields: CourseFields, data: Pick<Snapshot, 'people' | 'periods'>, categories: readonly string[]): { payload: CourseFields } | { error: CourseFieldError } {
  const name = fields.name.trim()
  const academic_block = fields.academic_block.trim()
  if (!name || name.length > 100) return { error: 'name' }
  if (!categories.includes(fields.category)) return { error: 'category' }
  if (!data.people.some(person => person.role === 'teacher' && person.id === fields.teacher_id)) return { error: 'teacher' }
  if (!academic_block || academic_block.length > 90) return { error: 'block' }
  const period = data.periods.find(item => item.id === fields.period_id)
  if (!period) return { error: 'period' }
  const validDate = (value: string) => /^\d{4}-\d{2}-\d{2}$/.test(value)
    && Number.isFinite(Date.parse(value)) && new Date(value).toISOString().startsWith(value)
  if (!validDate(fields.start_date) || !validDate(fields.end_date) || fields.end_date < fields.start_date
    || (period.start_date && fields.start_date < period.start_date) || (period.end_date && fields.end_date > period.end_date)) return { error: 'dates' }
  const validTime = (value: string) => /^([01]\d|2[0-3]):[0-5]\d$/.test(value)
  if (!validTime(fields.start_time) || !validTime(fields.end_time) || fields.start_time >= fields.end_time
    || !fields.days.length || fields.days.some(day => !Number.isInteger(day) || day < 1 || day > 7)) return { error: 'schedule' }
  const start = new Date(fields.start_date)
  const duration = (Date.parse(fields.end_date) - start.getTime()) / 86_400_000
  const startWeekday = start.getUTCDay() || 7
  if (fields.days.some(day => (day - startWeekday + 7) % 7 > duration)) return { error: 'scheduleDates' }
  return { payload: { ...fields, name, academic_block, description: fields.description.trim(), days: [...new Set(fields.days)].sort() } }
}
