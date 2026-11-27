import type { AiDomainId } from './ai'

export type TutorRole = 'student' | 'tutor'

export type TutorMessage = {
  id: string
  role: TutorRole
  text: string
  helpful?: boolean
  model?: string
}

export type TutorSession = {
  id: string
  title: string
  domain: AiDomainId | 'auto'
  updatedAt: string
  messages: TutorMessage[]
}

export type TutorTopicIcon = 'science' | 'math' | 'reading' | 'algorithms'

export type TutorTopic = {
  domain: AiDomainId
  title: string
  reason: string
  question: string
  matches: RegExp
  answer: string
  icon: TutorTopicIcon
}
