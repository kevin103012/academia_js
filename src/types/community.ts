import type { CourseCategoryId } from './workspace'

export type CommunityMessage = {
  id: string
  author: string
  authorRole: 'Estudiante' | 'Docente' | 'Mentor'
  initials: string
  text: string
  sentAt: string
  isOwn?: boolean
}

export type CommunityGroup = {
  id: string
  name: string
  category: CourseCategoryId
  categoryLabel: string
  description: string
  tags: string[]
  memberCount: number
  onlineCount: number
  mentorName: string
  pinnedNote: string
  joined: boolean
  messages: CommunityMessage[]
}

export type CommunityState = {
  groups: CommunityGroup[]
  activeGroupId: string
}
