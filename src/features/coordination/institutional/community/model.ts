import type { CalendarItem, Course, Person, Snapshot, Thread } from '../contract'

export type Audience =
  | { scope: 'personal' }
  | { scope: 'course'; courseId: string }
  | { scope: 'block'; block: string }
  | { scope: 'role'; role: string }
  | { scope: 'individual'; ids: string[] }

export function eligibleParticipants(data: Pick<Snapshot, 'me' | 'people'>) {
  return data.people.filter((person) =>
    person.id !== data.me.id && (person.role === 'teacher' || person.role === 'student'))
}

export function audienceMembers(data: Pick<Snapshot, 'me' | 'people' | 'courses' | 'enrollments'>, audience: Audience) {
  if (audience.scope === 'personal') return []
  const people = eligibleParticipants(data)
  if (audience.scope === 'block') {
    return people.filter((person) => Boolean(audience.block) && person.academic_block === audience.block)
  }
  if (audience.scope === 'role') return people.filter((person) => person.role === audience.role)
  if (audience.scope === 'individual') {
    const ids = new Set(audience.ids)
    return people.filter((person) => ids.has(person.id))
  }
  const course = data.courses.find(({ id }) => id === audience.courseId)
  if (!course) return []
  const students = new Set(data.enrollments.filter(({ course_id, enrolled, status }) => course_id === course.id && enrolled && status === 'active')
    .map(({ student_id }) => student_id))
  return people.filter((person) => person.role === 'teacher' ? person.id === course.teacher_id : students.has(person.id))
}

export function courseChoices(courses: Course[], category: string, period: string, block: string) {
  return courses.filter((course) => (!category || course.category === category)
    && (!period || course.period_id === period) && (!block || course.academic_block === block))
}

export type IncidentState = 'reported' | 'verifying' | 'resolved' | 'inquiry'

export function incidentState(thread: Pick<Thread, 'thread_kind' | 'incident_status'>): IncidentState {
  if (thread.thread_kind !== 'incident_report') return 'inquiry'
  if (thread.incident_status === 'resolved') return 'resolved'
  if (thread.incident_status === 'verifying_with_instructor') return 'verifying'
  return 'reported'
}

export function instructorContact(thread: Pick<Thread, 'created_by' | 'recipient_id'> | undefined, instructor: Person | undefined) {
  if (!thread || instructor?.role !== 'teacher') return 'unavailable'
  return thread.created_by === instructor.id || thread.recipient_id === instructor.id ? 'in_thread' : 'separate_inquiry'
}

export function upcomingEvents(events: CalendarItem[], date: string, time: string) {
  return events.filter((event) => event.event_date > date || (event.event_date === date
    && (event.end_time || event.start_time).slice(0, 5) > time.slice(0, 5)))
    .sort((a, b) => a.event_date.localeCompare(b.event_date) || a.start_time.localeCompare(b.start_time))
}

export function publicProfile(profile: Pick<Person, 'full_name' | 'bio' | 'is_profile_public'>) {
  return profile.is_profile_public === true ? { full_name: profile.full_name.trim(), bio: profile.bio?.trim() ?? '' } : null
}
