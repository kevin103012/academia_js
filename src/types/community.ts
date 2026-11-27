import type { CourseCategoryId } from './workspace'

export type CommunityMessage = {
  id: string
  author: string
  authorRole: 'Estudiante' | 'Docente' | 'Mentor'
  initials: string
  text: string
  sentAt: string
  sentOn?: string
  authorId?: string
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
  joinedAt?: string
  groupKind?: 'study' | 'course' | 'general'
  courseId?: string
  periodId?: string
  academicBlock?: string
  assignedTeacherId?: string
  createdBy?: string
  messages: CommunityMessage[]
}

export type CommunityState = {
  groups: CommunityGroup[]
  activeGroupId: string
}
