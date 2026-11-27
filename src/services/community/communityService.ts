import { env } from '../../config/env'
import { createInitialCommunityState } from '../../data/communitySeed'
import { demoUsers } from '../../data/demoUsers'
import type { DemoUser } from '../../types/auth'
import type { CommunityGroup, CommunityMessage, CommunityState } from '../../types/community'
import { localStore } from '../storage/localStore'
import { getSupabaseClient } from '../supabase/supabaseClient'

const GROUPS_KEY = 'junior-sparks:community-groups:v1'
const MEMBERSHIP_KEY = 'junior-sparks:community-membership:v1:'
const ACTIVE_KEY = 'junior-sparks:community-active:v1:'
const longBefore = '2000-01-01T00:00:00.000Z'
const time = new Intl.DateTimeFormat('es-PE', { hour: '2-digit', minute: '2-digit', hour12: false })

function localGroups() {
  return localStore.getJson<CommunityGroup[]>(GROUPS_KEY)
    ?? localStore.getJson<CommunityState>('junior-sparks:community:v2')?.groups
    ?? createInitialCommunityState().groups
}

function localMemberships(user: DemoUser) {
  return localStore.getJson<Record<string, string>>(MEMBERSHIP_KEY + user.id)
    ?? (user.id === 'student' ? Object.fromEntries(localGroups().filter((group) => group.joined).map((group) => [group.id, longBefore])) : {})
}

function store(key: string, value: unknown) {
  if (!localStore.setJson(key, value)) throw new Error('El navegador no pudo guardar el cambio.')
}

export function canManageCommunity(user: DemoUser, group: CommunityGroup) {
  return user.role === 'admin' || user.role === 'coordinator'
    || (user.role === 'teacher' && (group.createdBy === user.id || group.assignedTeacherId === user.id))
}

export const communityService = {
  setActive(user: DemoUser, groupId: string) {
    localStore.setText(ACTIVE_KEY + user.id, groupId)
  },

  async load(user: DemoUser): Promise<CommunityState> {
    const supabase = getSupabaseClient()
    let groups: CommunityGroup[]
    if (!supabase) {
      const memberships = localMemberships(user)
      groups = localGroups().map((group) => {
        const joinedAt = memberships[group.id]
        return { ...group, joinedAt, joined: Boolean(joinedAt),
          messages: joinedAt ? group.messages.filter((message) => (message.sentOn ?? longBefore) >= joinedAt)
            .map((message) => ({ ...message, isOwn: message.authorId ? message.authorId === user.id : message.author === user.name })) : [],
        }
      })
    } else {
      const [catalog, membership] = await Promise.all([
        supabase.from('community_groups').select('*').order('created_at'),
        supabase.from('community_memberships').select('group_id,joined_at').eq('user_id', user.id),
      ])
      if (catalog.error || membership.error) throw new Error('No se pudieron cargar las comunidades.')
      const memberMap = new Map<string, string>((membership.data ?? []).map((row) => [row.group_id, row.joined_at]))
      groups = await Promise.all((catalog.data ?? []).map(async (row) => {
        const joinedAt = memberMap.get(row.id)
        const messages: CommunityMessage[] = []
        if (joinedAt) {
          const result = await supabase.from('community_messages')
            .select('id,author_id,author_name,author_role,initials,content,sent_at,sent_label')
            .eq('group_id', row.id).gte('sent_at', joinedAt).order('sent_at', { ascending: false }).limit(100)
          if (result.error) throw new Error('No se pudieron cargar los mensajes del grupo.')
          for (const message of (result.data ?? []).reverse()) {
            messages.push({
              id: message.id, authorId: message.author_id, author: message.author_name, authorRole: message.author_role,
              initials: message.initials, text: message.content, sentOn: message.sent_at,
              sentAt: message.sent_label || time.format(new Date(message.sent_at)), isOwn: message.author_id === user.id,
            })
          }
        }
        return {
          id: row.id, name: row.name, description: row.description, category: row.category, categoryLabel: row.category_label,
          groupKind: row.group_kind, courseId: row.course_id ?? undefined, periodId: row.period_id ?? undefined,
          academicBlock: row.academic_block ?? undefined, assignedTeacherId: row.assigned_teacher_id ?? undefined,
          createdBy: row.created_by ?? undefined, mentorName: row.mentor_name, pinnedNote: row.pinned_note ?? '',
          tags: row.tags ?? [], memberCount: row.member_count, onlineCount: row.online_count,
          joinedAt, joined: Boolean(joinedAt), messages,
        }
      }))
    }
    const preferred = localStore.getText(ACTIVE_KEY + user.id)
    const activeGroupId = groups.find((item) => item.joined && item.id === preferred)?.id
      ?? groups.find((item) => item.joined)?.id ?? ''
    return { groups, activeGroupId }
  },

  async setMembership(user: DemoUser, groupId: string, join: boolean) {
    const supabase = getSupabaseClient()
    if (!supabase) {
      const memberships = { ...localMemberships(user) }
      if (join) memberships[groupId] ??= new Date().toISOString()
      else delete memberships[groupId]
      store(MEMBERSHIP_KEY + user.id, memberships)
      if (join) this.setActive(user, groupId)
      return
    }
    const result = join
      ? await supabase.from('community_memberships').upsert({ group_id: groupId, user_id: user.id }, { onConflict: 'group_id,user_id', ignoreDuplicates: true })
      : await supabase.from('community_memberships').delete().eq('group_id', groupId).eq('user_id', user.id)
    if (result.error) throw new Error('No se pudo cambiar la membresía del grupo.')
    if (join) this.setActive(user, groupId)
  },

  async send(user: DemoUser, group: CommunityGroup, message: CommunityMessage) {
    if (!group.joined) throw new Error('Únete al grupo antes de enviar un mensaje.')
    const supabase = getSupabaseClient()
    if (!supabase) {
      store(GROUPS_KEY, localGroups().map((item) => item.id === group.id
        ? { ...item, messages: [...item.messages, message] } : item))
      return
    }
    const { error } = await supabase.from('community_messages').insert({
      id: message.id, group_id: group.id, author_id: user.id, author_name: user.name,
      author_role: message.authorRole, initials: user.initials, content: message.text, sent_label: message.sentAt,
    })
    if (error) throw new Error('No se pudo enviar el mensaje a la comunidad.')
  },

  async saveGroup(user: DemoUser, group: CommunityGroup, editing: boolean) {
    if (user.role === 'student' || !canManageCommunity(user, group)) throw new Error('No puedes administrar este grupo.')
    const supabase = getSupabaseClient()
    if (!supabase) {
      const source = localGroups()
      store(GROUPS_KEY, editing ? source.map((item) => item.id === group.id ? { ...group, messages: item.messages } : item) : [...source, group])
      return
    }
    const payload = {
      name: group.name, description: group.description, group_kind: group.groupKind,
      category: group.category, category_label: group.categoryLabel, course_id: group.courseId ?? null,
      period_id: group.periodId ?? null, academic_block: group.academicBlock ?? null,
      assigned_teacher_id: group.assignedTeacherId ?? null, mentor_name: group.mentorName,
      pinned_note: group.pinnedNote, created_by: group.createdBy ?? null,
    }
    const { error } = editing
      ? await supabase.from('community_groups').update(payload).eq('id', group.id)
      : await supabase.from('community_groups').insert({ ...payload, id: group.id })
    if (error) throw new Error('No se pudo guardar el grupo.')
  },

  async removeGroup(user: DemoUser, id: string) {
    if (user.role !== 'admin') throw new Error('Solo administración puede eliminar grupos.')
    const supabase = getSupabaseClient()
    if (!supabase) {
      store(GROUPS_KEY, localGroups().filter((group) => group.id !== id))
      return
    }
    const { error } = await supabase.from('community_groups').delete().eq('id', id)
    if (error) throw new Error('No se pudo eliminar el grupo.')
  },

  async teachers(): Promise<{ id: string; name: string }[]> {
    const supabase = getSupabaseClient()
    if (!env.hasSupabase || !supabase) return demoUsers.filter((user) => user.role === 'teacher')
    const { data, error } = await supabase.from('profiles').select('id,full_name').eq('role', 'teacher').order('full_name')
    if (error) throw new Error('No se pudo cargar el directorio docente.')
    return (data ?? []).map((row) => ({ id: row.id, name: row.full_name }))
  },
}

export type CommunityService = typeof communityService
