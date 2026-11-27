import type { AiDomainId } from './ai'

export type TutorRole = 'student' | 'tutor'

export type TutorMessage = {
  id: string
  role: TutorRole
  text: string
  helpful?: boolean
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
