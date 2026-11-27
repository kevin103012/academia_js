import assert from 'node:assert/strict'
import test from 'node:test'
import { activityStats, academicOverview, applyAcademicFilters, attendanceForStudents, attendanceTrend, coursePayload, reportChart, reportRows, toCsv, urgentFollowup, withinAcademicDates } from '../src/features/coordination/institutional/academic/academicModel.ts'

const baseCourse = { id: 'c1', name: 'Algorithms', category: 'algoritmos', academic_block: 'A', period_id: 'p1', teacher_id: 't1' }
const courses = [baseCourse, { ...baseCourse, id: 'c2', name: 'Math', category: 'matematica', academic_block: 'B', period_id: 'p2' }, { ...baseCourse, id: 'c3', name: 'Embedded systems', category: 'hardware' }]
const enrollment = (course_id, student_id, enrolled = true) => ({ course_id, student_id, enrolled })
const attendance = (course_id, student_id, session_date, status) => ({ course_id, student_id, session_date, status })
const activity = (id, course_id, max_score, due_date = '2026-10-01') => ({ id, course_id, max_score, due_date })
const submission = (activity_id, student_id, score) => ({ activity_id, student_id, score })
const data = {
  courses,
  people: [{ id: 's1', full_name: 'Alex Student', role: 'student' }, { id: 's2', full_name: 'Bea Student', role: 'student' }, { id: 't1', full_name: 'Adrián Instructor', role: 'teacher', academic_block: 'A' }],
  periods: [{ id: 'p1', start_date: '2026-09-01', end_date: '2026-12-31' }],
  activities: [activity('a1', 'c1', 20), activity('a2', 'c1', 50), activity('a3', 'c2', 20)],
  submissions: [submission('a1', 's1', 15), submission('a1', 's2', null), submission('a2', 's1', 50), submission('a2', 's2', 0), submission('a3', 's1', 10)],
  enrollments: [enrollment('c1', 's1'), enrollment('c1', 's2'), enrollment('c2', 's1'), enrollment('c2', 's2', false)],
  attendance: [attendance('c1', 's1', '2026-09-01', 'Presente'), attendance('c1', 's1', '2026-09-02', 'Tardanza'), attendance('c1', 's1', '2026-09-03', 'Ausente'), attendance('c1', 's1', '2026-09-04', 'Justificada'), attendance('c2', 's1', '2026-09-01', 'Presente'), attendance('c1', 's1', '2026-09-01', 'Presente')],
}

test('filters are conjunctive and overview uses scoped enrollments, recorded attendance and normalized scored work', () => {
  const selected = applyAcademicFilters(data.courses, { block: 'A', period: 'p1', course: 'c1' })
  assert.deepEqual(selected.map(({ id }) => id), ['c1'])
  assert.deepEqual(applyAcademicFilters(data.courses, { block: 'B', period: 'p1', course: '' }), [])
  const overview = academicOverview(data, selected)
  assert.deepEqual(overview[0], { course: baseCourse, enrolled: 2, activities: 2, graded: 3, average: 175/3, attended: 2, marked: 3, attendanceRate: 200/3 })
  const all = academicOverview(data, courses)
  assert.deepEqual(all.map((entry) => [entry.enrolled, entry.average]), [[2, 175/3], [1, 50], [0, null]])
})

test('student attendance excludes other courses, excused and unrecorded dates; false enrollment is not a roster member', () => {
  assert.deepEqual(attendanceForStudents(data, 'c1'), [
    { id: 's1', name: 'Alex Student', attended: 2, marked: 3, rate: 200/3 },
    { id: 's2', name: 'Bea Student', attended: 0, marked: 0, rate: null },
  ])
  assert.deepEqual(attendanceForStudents(data, 'c2').map(({ id }) => id), ['s1'])
})

test('activities distinguish pending and legitimate zero, and only overdue when the due date has passed', () => {
  assert.deepEqual(activityStats(data, data.activities[0], '2026-10-01'), { submissions: 2, graded: 1, average: 75, overdue: false, enrolled: 2 })
  assert.deepEqual(activityStats(data, data.activities[1], '2026-10-02'), { submissions: 2, graded: 2, average: 50, overdue: true, enrolled: 2 })
})

test('report projection preserves selection and CSV escapes text without executing spreadsheet formulas', () => {
  const rows = reportRows(academicOverview(data, courses), ['course', 'attendanceRate', 'average'])
  assert.deepEqual(rows, [['Algorithms', 66.67, 58.33], ['Math', 100, 50], ['Embedded systems', null, null]])
  assert.equal(toCsv(['Course', 'Grade'], [['=IMPORT()', 100], ['a,"b"\nc', null]]), 'Course,Grade\r\n\'=IMPORT(),100\r\n"a,""b""\nc",')
})

test('course creation validates dates, instructor, period and schedule, preserving ISO weekdays in the command', () => {
  const values = { name: ' Algebra ', description: ' Optional ', category: 'matematica', academic_block: ' A ', teacher_id: 't1', period_id: 'p1', start_date: '2026-10-01', end_date: '2026-12-01', days: [7, 1, 7], start_time: '10:00', end_time: '11:00' }
  const result = coursePayload(values, data, ['matematica'])
  assert.deepEqual(result, { payload: { ...values, name: 'Algebra', description: 'Optional', academic_block: 'A', days: [1, 7] } })
  assert.deepEqual(coursePayload({ ...values, teacher_id: 's1' }, data, ['matematica']), { error: 'teacher' })
  assert.deepEqual(coursePayload({ ...values, period_id: 'missing' }, data, ['matematica']), { error: 'period' })
  assert.deepEqual(coursePayload({ ...values, end_date: '2026-09-01' }, data, ['matematica']), { error: 'dates' })
  assert.deepEqual(coursePayload({ ...values, start_date: '2026-08-31' }, data, ['matematica']), { error: 'dates' })
  assert.deepEqual(coursePayload({ ...values, days: [0] }, data, ['matematica']), { error: 'schedule' })
  assert.deepEqual(coursePayload({ ...values, end_time: '10:00' }, data, ['matematica']), { error: 'schedule' })
  assert.deepEqual(coursePayload({ ...values, end_date: '2026-10-01', days: [7] }, data, ['matematica']), { error: 'scheduleDates' })
})

test('date range applies to dated evidence and groups valid attendance by Monday', () => {
  const dated = { ...data, enrollments: data.enrollments.map(row => ({ ...row, enrolled_at: '2026-09-01T12:00:00Z' })),
    submissions: data.submissions.map(row => ({ ...row, submitted_at: '2026-09-03T12:00:00Z' })) }
  const range = { from: '2026-09-02', until: '2026-09-04' }
  const [metric] = academicOverview(dated, [baseCourse], range)
  assert.deepEqual([metric.enrolled, metric.activities, metric.average, metric.attendanceRate], [0, 0, 175/3, 50])
  assert.deepEqual(attendanceTrend(dated, [baseCourse], range), [{ date: '2026-08-31', attended: 1, marked: 2 }])
  assert.equal(withinAcademicDates('', range), false)
  assert.equal(withinAcademicDates('2026-09-04T23:59:59Z', range), true)
  assert.equal(withinAcademicDates('2026-09-03', { from: '2026-10-01', until: '2026-09-01' }), false)
})

test('urgent follow-up counts only scoped overdue ungraded submissions and unresolved incidents', () => {
  const scoped = { ...data, threads: [
    { course_id: 'c1', thread_kind: 'incident_report', incident_status: 'verifying_with_instructor' },
    { course_id: 'c2', thread_kind: 'incident_report', incident_status: 'open' },
    { course_id: 'c1', thread_kind: 'incident_report', incident_status: 'resolved' },
  ] }
  assert.deepEqual(urgentFollowup(scoped, [baseCourse], '2026-10-02'), { pendingGrades: 1, incidents: 1 })
  assert.deepEqual(urgentFollowup(scoped, [baseCourse], '2026-10-01'), { pendingGrades: 0, incidents: 1 })
})

test('PDF chart is derived from one selected numeric column and never adds an unselected course field', () => {
  const fields = ['course', 'average', 'attendanceRate']
  const rows = reportRows(academicOverview(data, courses), fields)
  assert.deepEqual(reportChart(fields, rows), { field: 'average', rows: [{ name: 'Algorithms', value: 58.33 }, { name: 'Math', value: 50 }] })
  assert.equal(reportChart(['average'], [[58.33]]), null)
})
