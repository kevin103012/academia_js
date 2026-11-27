import type { DemoUser } from '../types/auth'
import type { CalendarEvent, Course, Workspace } from '../types/workspace'

export function teachesCourse(user: DemoUser, course: Course) {
  return user.role === 'teacher' && (course.teacherId ? course.teacherId === user.id : course.teacher === user.name)
}

export function canSeeCourse(user: DemoUser, workspace: Workspace, courseId: string) {
  if (user.role === 'admin' || user.role === 'coordinator') return true
  if (user.role === 'student') return Boolean(workspace.progress[courseId]?.enrolled)
  return workspace.courses.some((course) => course.id === courseId && teachesCourse(user, course))
}

export function canSeeCalendarEvent(user: DemoUser, workspace: Workspace, event: CalendarEvent) {
  if (event.ownerId === user.id) return true
  switch (event.visibility) {
    case 'personal': return false
    case 'course': return Boolean(event.targetCourseId && canSeeCourse(user, workspace, event.targetCourseId))
    case 'block': return Boolean(event.targetBlock && (user.academicBlock ?? workspace.students.find((student) => student.id === user.id)?.group) === event.targetBlock)
    case 'role': return event.targetRole === user.role
    default: return true
  }
}

export function visibleNotices(user: DemoUser, workspace: Workspace) {
  return workspace.notices.filter((notice) =>
    notice.scope !== 'course' || Boolean(notice.courseId && canSeeCourse(user, workspace, notice.courseId)),
  )
}

export function courseRoster(workspace: Workspace, course: Course) {
  if (!workspace.courseRoster) return workspace.students.filter((student) => student.group === course.group)
  const enrolled = new Set(workspace.courseRoster[course.id] ?? [])
  return workspace.students.filter((student) => enrolled.has(student.id))
}
