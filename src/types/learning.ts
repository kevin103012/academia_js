export type LearningEntry = {
  enrolled: boolean
  lessons: string[]
  score?: number
  certifiedAt?: string
}

export type LearningProgress = Record<string, LearningEntry>

export type LessonLabKind = 'circuit' | 'matrix' | 'architecture'

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
