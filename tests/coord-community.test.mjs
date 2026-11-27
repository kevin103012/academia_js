import assert from 'node:assert/strict'
import { test } from 'node:test'
import { audienceMembers, courseChoices, incidentState, instructorContact, upcomingEvents, publicProfile } from '../src/features/coordination/institutional/community/model.ts'

const people = [
  { id: 'self', role: 'coordinator', academic_block: 'A', full_name: 'Andrea' },
  { id: 'teacher', role: 'teacher', academic_block: 'A', full_name: 'Mario' },
  { id: 'student', role: 'student', academic_block: 'A', full_name: 'Elena' },
  { id: 'student2', role: 'student', academic_block: 'B', full_name: 'Laura' },
  { id: 'admin', role: 'admin', academic_block: 'A', full_name: 'Rosa' },
]
const courses = [
  { id: 'course', period_id: 'period', category: 'hardware', academic_block: 'A', teacher_id: 'teacher' },
  { id: 'course2', period_id: 'period2', category: 'hardware', academic_block: 'B', teacher_id: null },
]
const data = {
  me: people[0], people, courses,
  enrollments: [
    { course_id: 'course', student_id: 'student', enrolled: true, status:'active' },
    { course_id: 'course', student_id: 'student2', enrolled: true, status:'completed' },
    { course_id: 'course', student_id: 'student2', enrolled: false },
    { course_id: 'course2', student_id: 'student2', enrolled: true },
    { course_id: 'course', student_id: 'unknown', enrolled: true },
  ],
}
const ids = (list) => list.map(({ id }) => id).sort()

test('calendar preview respects the chosen audience without exposing other records', () => {
  assert.deepEqual(ids(audienceMembers(data, { scope: 'personal' })), [])
  assert.deepEqual(ids(audienceMembers(data, { scope: 'course', courseId: 'course' })), ['student', 'teacher'])
  assert.deepEqual(ids(audienceMembers(data, { scope: 'block', block: 'A' })), ['student', 'teacher'])
  assert.deepEqual(ids(audienceMembers(data, { scope: 'role', role: 'student' })), ['student', 'student2'])
  assert.deepEqual(ids(audienceMembers(data, { scope: 'individual', ids: ['self', 'teacher', 'teacher', 'admin', 'unknown'] })), ['teacher'])
})

test('group course choices use category, period and block together', () => {
  assert.deepEqual(ids(courseChoices(courses, 'hardware', 'period', 'A')), ['course'])
  assert.deepEqual(ids(courseChoices(courses, 'hardware', 'period', 'B')), [])
  assert.deepEqual(ids(courseChoices(courses, 'hardware', '', 'B')), ['course2'])
})

test('an initial incident is a report, inquiry is not an incident, and resolution does not imply confirmation', () => {
  assert.equal(incidentState({ thread_kind: 'incident_report', incident_status: 'open' }), 'reported')
  assert.equal(incidentState({ thread_kind: 'incident_report', incident_status: 'verifying_with_instructor' }), 'verifying')
  assert.equal(incidentState({ thread_kind: 'incident_report', incident_status: 'resolved' }), 'resolved')
  assert.equal(incidentState({ thread_kind: 'course_inquiry', incident_status: 'open' }), 'inquiry')
})

test('a student report requires a separate inquiry before a course instructor can receive coordinator messages', () => {
  const studentReport = { created_by: 'student', recipient_id: 'self' }
  assert.equal(instructorContact(studentReport, people[1]), 'separate_inquiry')
  assert.equal(instructorContact({ created_by: 'self', recipient_id: 'teacher' }, people[1]), 'in_thread')
  assert.equal(instructorContact(studentReport, undefined), 'unavailable')
})

test('upcoming notices are chronological and omit events that have already ended', () => {
  const events = [
    { id: 'later', event_date: '2026-12-01', start_time: '08:00', end_time: '09:00' },
    { id: 'ended', event_date: '2026-11-27', start_time: '08:00', end_time: '09:00' },
    { id: 'legacy-ended', event_date: '2026-11-27', start_time: '09:15', end_time: '' },
    { id: 'now', event_date: '2026-11-27', start_time: '09:30:00', end_time: '10:30:00' },
    { id: 'soon', event_date: '2026-11-27', start_time: '11:00:00', end_time: '12:00:00' },
    { id: 'legacy-upcoming', event_date: '2026-11-27', start_time: '11:30', end_time: '' },
  ]
  assert.deepEqual(upcomingEvents(events, '2026-11-27', '10:00').map(({ id }) => id), ['now', 'soon', 'legacy-upcoming', 'later'])
})

test('public profile projection includes only professional display fields and respects privacy', () => {
  const profile = { full_name: '  Andrea Luna ', bio: ' I organize courses. ', is_profile_public: true,
    id: 'private', email: 'private@example.com', preferred_theme: 'dark', academic_block: 'A' }
  assert.deepEqual(publicProfile(profile), { full_name: 'Andrea Luna', bio: 'I organize courses.' })
  assert.equal(publicProfile({ ...profile, is_profile_public: false }), null)
})
