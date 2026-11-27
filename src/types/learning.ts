export type LearningEntry = {
  enrolled: boolean
  lessons: string[]
  score?: number
  certifiedAt?: string
}

export type LearningProgress = Record<string, LearningEntry>

export type LessonLabKind = 'circuit' | 'matrix' | 'architecture'

/** Bloque de contenido que el docente añade a una lección o sublección. */
export type ContentBlock =
  | { id: string; kind: 'theory'; title?: string; text: string }
  | { id: string; kind: 'video'; title: string; url: string }
  /** Ejercicio que se corrige en la web. */
  | { id: string; kind: 'choice'; prompt: string; options: string[]; answer: number; explanation?: string }
  /** Ejercicio de respuesta escrita; lo revisa el docente. */
  | { id: string; kind: 'text'; prompt: string }

export type ContentBlockKind = ContentBlock['kind']

export type Sublesson = {
  id: string
  title: string
  blocks: ContentBlock[]
}

export type ExerciseAnswer = {
  courseId: string
  blockId: string
  studentId: string
  studentName: string
  response: string
  answeredAt: string
}

export type Lesson = {
  id: string
  title: string
  summary: string
  minutes: number
  reading: string[]
  exercise: string
  formulaOrCode?: string
  keySteps?: string[]
  labKind?: LessonLabKind
  labGoal?: string
  labHint?: string
  blocks?: ContentBlock[]
  sublessons?: Sublesson[]
}

export type Question = {
  prompt: string
  options: string[]
  answer: number
  explanation: string
}

export type CourseMaterial = {
  lessons: Lesson[]
  questions: Question[]
}
