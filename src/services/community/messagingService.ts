import { env } from '../../config/env'
import { demoUsers } from '../../data/demoUsers'
import type { DemoRole, DemoUser } from '../../types/auth'
import { createId } from '../../utils/id'
import { localStore } from '../storage/localStore'
import { getSupabaseClient } from '../supabase/supabaseClient'

export type ThreadKind = 'course_inquiry' | 'incident_report' | 'urgent_admin'
export type ThreadStatus = 'open' | 'verifying_with_instructor' | 'resolved'
export type Message = {
  id: string; senderId: string; senderName: string; text: string; sentAt: string
}
export type Thread = {
  id: string; kind: ThreadKind; courseId?: string; subject: string; createdBy: string
  recipientId?: string; targetRole?: DemoRole; status: ThreadStatus; updatedAt: string; messages: Message[]
}
type NewThread = Pick<Thread, 'kind' | 'courseId' | 'subject' | 'recipientId' | 'targetRole'>

const storageKey = 'junior-sparks:direct-inbox:v1'
export const messagingSyncEnabled = env.hasSupabase

function visible(thread: Thread, user: DemoUser) {
  return thread.createdBy === user.id || thread.recipientId === user.id || thread.targetRole === user.role
}

function readLocal() { return localStore.getJson<Thread[]>(storageKey) ?? [] }

function storeLocal(threads: Thread[]) {
  if (!localStore.setJson(storageKey, threads)) throw new Error('No se pudo guardar el mensaje en este navegador.')
}

function makeMessage(user: DemoUser, text: string): Message {
  return { id: createId(), senderId: user.id, senderName: user.name, text, sentAt: new Date().toISOString() }
}

export const messagingService = {
  async list(user: DemoUser): Promise<Thread[]> {
    if (!messagingSyncEnabled) return readLocal().filter((thread) => visible(thread, user)).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
    const { data, error } = await getSupabaseClient()!.from('direct_threads')
      .select('id,thread_kind,course_id,subject,created_by,recipient_id,target_role,incident_status,updated_at,direct_messages(id,sender_id,sender_name,content,sent_at)')
      .order('updated_at', { ascending: false })
    if (error) throw new Error('No se pudo cargar la bandeja.')
    return (data ?? []).map((row) => ({
      id: row.id,
      kind: row.thread_kind,
      courseId: row.course_id ?? undefined,
      subject: row.subject,
      createdBy: row.created_by,
      recipientId: row.recipient_id ?? undefined,
      targetRole: row.target_role ?? undefined,
      status: row.incident_status ?? 'open',
      updatedAt: row.updated_at,
      messages: row.direct_messages.slice().sort((a, b) => a.sent_at.localeCompare(b.sent_at) || a.id - b.id)
        .map((item) => ({ id: String(item.id), senderId: item.sender_id, senderName: item.sender_name, text: item.content, sentAt: item.sent_at })),
    }))
  },

  async teacherId(id: string | undefined, name: string) {
    if (id) return id
    if (!messagingSyncEnabled) return demoUsers.find((entry) => entry.role === 'teacher' && entry.name === name)?.id
    const { data, error } = await getSupabaseClient()!.from('profiles').select('id')
      .eq('role', 'teacher').eq('full_name', name).maybeSingle()
    if (error) throw new Error('No se pudo identificar al instructor.')
    return data?.id as string | undefined
  },

  async create(user: DemoUser, draft: NewThread, text: string) {
    const id = createId()
    if (!messagingSyncEnabled) {
      const message = makeMessage(user, text)
      storeLocal([{ ...draft, id, createdBy: user.id, status: 'open', messages: [message], updatedAt: message.sentAt }, ...readLocal()])
      return id
    }
    const { error } = await getSupabaseClient()!.rpc('start_campus_thread', {
      thread_id: id, kind: draft.kind, course: draft.courseId ?? null,
      title: draft.subject, recipient: draft.recipientId ?? null, body: text,
    })
    if (error) throw new Error('No se pudo iniciar la conversación.')
    return id
  },

  async reply(user: DemoUser, id: string, text: string) {
    if (!messagingSyncEnabled) {
      const threads = readLocal()
      if (!threads.some((thread) => thread.id === id && visible(thread, user))) throw new Error('La conversación ya no está disponible.')
      const message = makeMessage(user, text)
      storeLocal(threads.map((thread) => thread.id === id
        ? { ...thread, updatedAt: message.sentAt, messages: [...thread.messages, message] } : thread))
      return
    }
    const { error } = await getSupabaseClient()!.rpc('reply_campus_thread', { thread_id: id, body: text })
    if (error) throw new Error('No se pudo enviar el mensaje.')
  },

  async updateStatus(user: DemoUser, id: string, status: ThreadStatus) {
    if (user.role !== 'admin' && user.role !== 'coordinator') throw new Error('No tienes acceso a esta acción.')
    if (!messagingSyncEnabled) {
      storeLocal(readLocal().map((thread) => thread.id === id && visible(thread, user)
        ? { ...thread, status, updatedAt: new Date().toISOString() } : thread))
      return
    }
    const { error } = await getSupabaseClient()!.rpc('review_campus_thread', { thread_id: id, next_status: status })
    if (error) throw new Error('No se pudo actualizar la incidencia.')
  },
}
