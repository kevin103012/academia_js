import type { CourseCategoryId } from './workspace'

export type CommunityMember = {
  userId: string
  name: string
  /** Momento de ingreso: el miembro solo ve los mensajes desde aquí. */
  joinedAt: number
}

export type CommunityMessage = {
  id: string
  authorId: string
  author: string
  authorRole: 'Estudiante' | 'Docente' | 'Coordinación' | 'Administración' | 'Mentor'
  initials: string
  text: string
  sentAt: string
  createdAt: number
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
  members: CommunityMember[]
  messages: CommunityMessage[]
  /** Docente que creó un grupo de estudio. */
  createdById?: string
  /** Docente responsable de un grupo creado o asignado. */
  managerName?: string
  /** Solo en grupos de curso: hay uno por curso y periodo. */
  courseId?: string
  period?: string
}

export type CommunityState = {
  groups: CommunityGroup[]
  activeGroupId: string
}

export type GroupDetails = Pick<CommunityGroup, 'name' | 'description' | 'pinnedNote'>
