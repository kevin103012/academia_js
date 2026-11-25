import type { LearningProgress } from './learning'

export type Course = {
  id: string
  name: string
  group: string
  teacher: string
  color: 'teal' | 'gold' | 'blue'
  description: string
}

export type Activity = {
  id: string
  courseId: string
  title: string
  instructions: string
  due: string
}

export type Submission = {
  id: string
  activityId: string
  studentId: string
  content: string
  submittedAt: string
  score?: number
  feedback?: string
}

export type Notice = {
  id: string
  title: string
  content: string
  author: string
  date: string
}

export type CalendarEvent = {
  id: string
  title: string
  date: string
  time: string
  location: string
}

export const attendanceStatuses = ['Presente', 'Tardanza', 'Ausente', 'Justificada'] as const
export type AttendanceStatus = typeof attendanceStatuses[number]

export type Attendance = {
  studentId: string
  date: string
  status: AttendanceStatus
}

export type Student = {
  id: string
  name: string
  group: string
}

export type AuditRecord = {
  id: string
  actor: string
  action: string
  date: string
}

export type Workspace = {
  courses: Course[]
  activities: Activity[]
  submissions: Submission[]
  notices: Notice[]
  events: CalendarEvent[]
  attendance: Attendance[]
  students: Student[]
  progress: LearningProgress
  audit: AuditRecord[]
}

export type Commit = (action: string, update: (current: Workspace) => Workspace) => void
