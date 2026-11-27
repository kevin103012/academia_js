import type { ExerciseAnswer, Lesson, LearningProgress } from './learning'

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
  color: 'teal' | 'gold' | 'blue'
  description: string
  /** Lecciones editadas por el docente; si faltan se usa el temario del catálogo. */
  lessons?: Lesson[]
  /** Fecha de la evaluación del curso (AAAA-MM-DD). */
  assessmentDate?: string
  /** Días en que se dicta clase; de aquí salen los días en que toca asistir. */
  schedule?: ClassSchedule
}

/** Horario semanal de un curso. weekdays usa Date.getDay(): 0 = domingo … 6 = sábado. */
export type ClassSchedule = {
  weekdays: number[]
  /** Primer y último día del ciclo (AAAA-MM-DD). */
  startDate: string
  endDate: string
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

export const eventCategories = ['Clase', 'Reunión', 'Estudio', 'Evaluación', 'Entrega', 'Otro'] as const
export type EventCategory = typeof eventCategories[number]

/** private: solo su autor · invited: autor y citados · campus: todos. */
export type EventAudience = 'private' | 'invited' | 'campus'

export type CalendarEvent = {
  id: string
  title: string
  date: string
  /** Hora de inicio (HH:mm). */
  time: string
  location: string
  // Opcionales solo por los eventos guardados antes de estos campos (se muestran a todos).
  endTime?: string
  category?: EventCategory
  audience?: EventAudience
  createdById?: string
  createdByName?: string
  participantIds?: string[]
}

export const attendanceStatuses = ['Presente', 'Tardanza', 'Ausente', 'Justificada'] as const
export type AttendanceStatus = typeof attendanceStatuses[number]

export type Attendance = {
  // Opcional solo por los registros guardados antes de separar la asistencia por curso.
  courseId?: string
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
  // Opcional: no existe en los datos guardados antes de los ejercicios.
  exerciseAnswers?: ExerciseAnswer[]
}

export type Commit = (action: string, update: (current: Workspace) => Workspace) => void
