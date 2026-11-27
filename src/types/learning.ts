export type LearningEntry = {
  enrolled: boolean
  lessons: string[]
  watchedVideos?: string[]
  score?: number
  certifiedAt?: string
}

export type LearningProgress = Record<string, LearningEntry>

export type LessonLabKind = 'circuit' | 'matrix' | 'architecture'

export type LessonSublesson = {
  id: string
  title: string
  content: string
}

export type LessonExerciseCheck = {
  id: string
  question: string
  options: string[]
  correctIndex: number
  explanation: string
}

export type Lesson = {
  id: string
  title: string
  summary: string
  minutes: number
  videoTitle?: string
  videoUrl?: string
  videoDuration?: string
  reading: string[]
  sublessons?: LessonSublesson[]
  exercise: string
  exercises?: LessonExerciseCheck[]
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
