import type { DemoRole } from './auth'
import type { LearningProgress } from './learning'

export type CourseCategoryId = 'matematica' | 'hardware' | 'frameworks' | 'algoritmos'

export const courseCategories: { id: CourseCategoryId; label: string; shortLabel: string }[] = [
  { id: 'matematica', label: 'Matemática y Ciencia de Datos', shortLabel: 'Matemática' },
  { id: 'hardware', label: 'Hardware y Sistemas Embebidos', shortLabel: 'Hardware' },
  { id: 'frameworks', label: 'Frameworks y Arquitectura', shortLabel: 'Frameworks' },
  { id: 'algoritmos', label: 'Algoritmos y Lenguajes', shortLabel: 'Algoritmos' },
]

export type Course = {
  id: string
  category: CourseCategoryId
  name: string
  group: string
  teacher: string
  teacherId?: string
  color: 'teal' | 'gold' | 'blue'
  description: string
  period?: string
  startDate?: string
  endDate?: string
  durationWeeks?: number
  evaluationMethod?: string
  scheduleSummary?: string
  nextEvaluationDate?: string
}

export type Activity = {
  id: string
  courseId: string
  title: string
  instructions: string
  due: string
  activityType?: 'practica' | 'laboratorio' | 'evaluacion' | 'proyecto'
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

export type NoticeScope = 'course' | 'general' | 'system_persistent'

export type Notice = {
  id: string
  title: string
  content: string
  author: string
  date: string
  scope?: NoticeScope
  courseId?: string
  isPinned?: boolean
  authorId?: string
}

export type CalendarCategory = 'clase' | 'evaluacion' | 'estudio' | 'laboratorio' | 'institucional' | 'personal'
export type CalendarScope = 'personal' | 'course' | 'block' | 'role' | 'global'

export type CalendarEvent = {
  id: string
  title: string
  date: string
  time: string
  endTime?: string
  location: string
  category?: CalendarCategory
  audience?: string
  visibility?: CalendarScope
  ownerId?: string
  targetCourseId?: string
  targetBlock?: string
  targetRole?: DemoRole
}

export const attendanceStatuses = ['Presente', 'Tardanza', 'Ausente', 'Justificada'] as const
export type AttendanceStatus = typeof attendanceStatuses[number]

export type Attendance = {
  courseId?: string
  studentId: string
  date: string
  status: AttendanceStatus
}

export type Student = {
  id: string
  name: string
  group: string
  email?: string
}

export type AccessRequest = {
  id: string
  name: string
  email: string
  requestedRole: DemoRole
  roleLabel: string
  group: string
  motivation?: string
  status: 'pending' | 'approved' | 'rejected'
  requestedAt: string
  credentialsIssued?: boolean
  issuedEmail?: string
  issuedTempPassword?: string
  approvedProfileId?: string
}

export type AcademicPeriod = {
  id: string
  name: string
  startDate: string
  endDate: string
  status: 'upcoming' | 'active' | 'closed'
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
  accessRequests: AccessRequest[]
  periods: AcademicPeriod[]
  progress: LearningProgress
  courseRoster?: Record<string, string[]>
  audit: AuditRecord[]
}

export type Commit = (action: string, update: (current: Workspace) => Workspace) => void
