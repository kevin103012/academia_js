import { demoUsers } from '../../data/demoUsers'
import type { DemoUser } from '../../types/auth'
import type { CommunityGroup, CommunityState, GroupDetails } from '../../types/community'
import { courseCategories, type Course, type CourseCategoryId } from '../../types/workspace'
import { createId } from '../../utils/id'

// Reglas de los grupos. Un backend debe repetirlas: en el navegador no son una barrera de seguridad.

export const periodPattern = /^\d{4}-(I|II)$/

export function currentPeriod(date = new Date()) {
  return `${date.getFullYear()}-${date.getMonth() < 6 ? 'I' : 'II'}`
}

export function isMember(group: CommunityGroup, userId: string) {
  return group.members.some((member) => member.userId === userId)
}

export function visibleMessages(group: CommunityGroup, userId: string) {
  const member = group.members.find((item) => item.userId === userId)
  return member ? group.messages.filter((message) => message.createdAt >= member.joinedAt) : []
}

export function isManager(group: CommunityGroup, user: DemoUser) {
  return user.role === 'teacher' && (group.createdById === user.id || group.managerName === user.name)
}

function changeGroup(
  state: CommunityState,
  groupId: string,
  change: (group: CommunityGroup) => CommunityGroup,
): CommunityState {
  return { ...state, groups: state.groups.map((group) => (group.id === groupId ? change(group) : group)) }
}

function addMember(group: CommunityGroup, userId: string, name: string, now: number): CommunityGroup {
  if (isMember(group, userId)) return group
  return {
    ...group,
    memberCount: group.memberCount + 1,
    members: [...group.members, { userId, name, joinedAt: now }],
  }
}

function dropMember(group: CommunityGroup, userId: string): CommunityGroup {
  return {
    ...group,
    memberCount: Math.max(0, group.memberCount - 1),
    members: group.members.filter((member) => member.userId !== userId),
  }
}

export function joinGroup(state: CommunityState, groupId: string, user: DemoUser, now = Date.now()) {
  const target = state.groups.find((group) => group.id === groupId)
  if (!target || isMember(target, user.id)) return state
  return { ...changeGroup(state, groupId, (group) => addMember(group, user.id, user.name, now)), activeGroupId: groupId }
}

export function leaveGroup(state: CommunityState, groupId: string, user: DemoUser) {
  const target = state.groups.find((group) => group.id === groupId)
  // Quien administra un grupo no puede abandonarlo.
  if (!target || !isMember(target, user.id) || isManager(target, user)) return state
  return changeGroup(state, groupId, (group) => dropMember(group, user.id))
}

export function removeMember(state: CommunityState, groupId: string, memberId: string, actor: DemoUser) {
  const target = state.groups.find((group) => group.id === groupId)
  if (!target || !isManager(target, actor) || memberId === actor.id || !isMember(target, memberId)) return state
  return changeGroup(state, groupId, (group) => dropMember(group, memberId))
}

function cleanDetails(details: GroupDetails): GroupDetails | null {
  const name = details.name.trim()
  const description = details.description.trim()
  return name && description ? { name, description, pinnedNote: details.pinnedNote.trim() } : null
}

export function createStudyGroup(
  state: CommunityState,
  details: GroupDetails & { category: CourseCategoryId },
  user: DemoUser,
  now = Date.now(),
): CommunityState {
  const clean = cleanDetails(details)
  if (!clean || user.role !== 'teacher') return state
  const group: CommunityGroup = {
    ...clean,
    id: createId(),
    category: details.category,
    categoryLabel: courseCategories.find((item) => item.id === details.category)?.label ?? details.category,
    tags: ['#Estudio'],
    memberCount: 1,
    onlineCount: 0,
    mentorName: user.name,
    managerName: user.name,
    createdById: user.id,
    members: [{ userId: user.id, name: user.name, joinedAt: now }],
    messages: [],
  }
  return { groups: [group, ...state.groups], activeGroupId: group.id }
}

export function editGroup(state: CommunityState, groupId: string, details: GroupDetails, actor: DemoUser) {
  const target = state.groups.find((group) => group.id === groupId)
  const clean = cleanDetails(details)
  if (!target || !clean || !isManager(target, actor)) return state
  return changeGroup(state, groupId, (group) => ({ ...group, ...clean }))
}

/** Solo se eliminan grupos de estudio, y solo por quien los creó. */
export function deleteGroup(state: CommunityState, groupId: string, actor: DemoUser) {
  const target = state.groups.find((group) => group.id === groupId)
  if (!target || actor.role !== 'teacher' || target.createdById !== actor.id) return state
  return { ...state, groups: state.groups.filter((group) => group.id !== groupId) }
}

/** Crea el grupo de un curso y periodo, o cambia su docente si ya existe. */
export function assignCourseGroup(
  state: CommunityState,
  { course, period, teacherName }: { course: Course; period: string; teacherName: string },
  actor: DemoUser,
  now = Date.now(),
): CommunityState {
  if (actor.role !== 'coordinator' || !periodPattern.test(period) || !teacherName) return state
  const teacherId = demoUsers.find((user) => user.role === 'teacher' && user.name === teacherName)?.id
  const withTeacher = (group: CommunityGroup) => (teacherId ? addMember(group, teacherId, teacherName, now) : group)
  const existing = state.groups.find((group) => group.courseId === course.id && group.period === period)

  if (existing) {
    if (existing.managerName === teacherName) return state
    return changeGroup(state, existing.id, (group) =>
      withTeacher({ ...group, managerName: teacherName, mentorName: teacherName }),
    )
  }

  const group = withTeacher({
    id: createId(),
    name: `${course.name} · ${period}`,
    category: course.category,
    categoryLabel: courseCategories.find((item) => item.id === course.category)?.label ?? course.category,
    description: `Grupo del curso para el periodo ${period}.`,
    tags: [`#${period}`],
    memberCount: 0,
    onlineCount: 0,
    mentorName: teacherName,
    managerName: teacherName,
    courseId: course.id,
    period,
    pinnedNote: '',
    members: [],
    messages: [],
  })
  return { ...state, groups: [group, ...state.groups] }
}
