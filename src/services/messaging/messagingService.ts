import { env } from '../../config/env'
import { demoUsers } from '../../data/demoUsers'
import type { DirectMessage, MessageContact, NewDirectMessage, NewGroupMessage } from '../../types/messaging'
import { isSafeAttachment } from '../../utils/attachments'
import type { Workspace } from '../../types/workspace'
import { createId } from '../../utils/id'
import { courseRoster } from '../../utils/roster'
import { apiClient } from '../http/apiClient'
import { localStore } from '../storage/localStore'
import { checkGroupSend, groupSendTimes, MessageRuleError } from './messagingRules'

export interface MessagingService {
  /** Mensajes enviados o recibidos por el usuario. */
  list(userId: string): Promise<DirectMessage[]>
  send(draft: NewDirectMessage): Promise<DirectMessage>
  /** Envía una copia a cada integrante del grupo y las devuelve (las del remitente, una por integrante). */
  sendGroup(draft: NewGroupMessage): Promise<DirectMessage[]>
  markRead(readerId: string, senderId: string): Promise<void>
}

const MESSAGES_KEY = 'juniors-sparks:messages:v2'

/** Largo máximo de un mensaje (admite Markdown). */
export const maxMessageChars = 4000
const maxGroupRecipients = 300

const CHANGE_EVENT = 'juniors-sparks:messages-changed'
const notifyChanged = () => window.dispatchEvent(new Event(CHANGE_EVENT))

/**
 * Avisa cuando puede haber mensajes nuevos: un envío o lectura en esta pestaña, un cambio hecho
 * en otra pestaña, al volver a la ventana y cada 20 s (para cuando los mensajes vengan de un servidor).
 */
export function onMessagesChanged(callback: () => void): () => void {
  const onStorage = (event: StorageEvent) => {
    if (event.key === null || event.key.includes(MESSAGES_KEY)) callback()
  }
  const onVisible = () => {
    if (document.visibilityState === 'visible') callback()
  }
  window.addEventListener(CHANGE_EVENT, callback)
  window.addEventListener('storage', onStorage)
  document.addEventListener('visibilitychange', onVisible)
  const timer = window.setInterval(onVisible, 20_000)
  return () => {
    window.removeEventListener(CHANGE_EVENT, callback)
    window.removeEventListener('storage', onStorage)
    document.removeEventListener('visibilitychange', onVisible)
    window.clearInterval(timer)
  }
}

const isString = (value: unknown): value is string => typeof value === 'string'

const accountOf = (id: string) => demoUsers.find((account) => account.id === id)

// Los cursos solo guardan el nombre del docente; quien no tiene cuenta se identifica por él.
const teacherId = (name: string) =>
  demoUsers.find((account) => account.role === 'teacher' && account.name === name)?.id ?? `teacher:${name}`

/** Docentes y alumnos que comparten algún curso con el usuario. */
export function listContacts(userId: string, workspace: Workspace): MessageContact[] {
  const contacts = new Map<string, MessageContact>()

  for (const course of workspace.courses) {
    const members: Omit<MessageContact, 'courseNames'>[] = [
      { id: teacherId(course.teacher), name: course.teacher, role: 'teacher' },
      ...courseRoster(workspace, course).map((student) => ({
        id: student.id,
        name: student.name,
        role: 'student' as const,
      })),
    ]
    if (!members.some((member) => member.id === userId)) continue

    for (const member of members) {
      if (member.id === userId) continue
      const known = contacts.get(member.id)
      if (known) known.courseNames.push(course.name)
      else contacts.set(member.id, { ...member, email: accountOf(member.id)?.email, courseNames: [course.name] })
    }
  }

  // Primero los docentes y, dentro de cada grupo, por nombre.
  return [...contacts.values()].sort(
    (a, b) => Number(a.role === 'student') - Number(b.role === 'student') || a.name.localeCompare(b.name, 'es'),
  )
}

function isDirectMessage(value: unknown): value is DirectMessage {
  if (!value || typeof value !== 'object') return false
  const record = value as Record<string, unknown>
  const attachmentsOk =
    record.attachments === undefined ||
    (Array.isArray(record.attachments) && record.attachments.every(isSafeAttachment))
  const group = record.group
  const groupOk =
    group === undefined ||
    (typeof group === 'object' &&
      group !== null &&
      ['id', 'label', 'batchId'].every((key) => isString((group as Record<string, unknown>)[key])))
  return (
    groupOk &&
    ['id', 'senderId', 'senderName', 'recipientId', 'recipientName', 'text', 'sentAt'].every(
      (key) => typeof record[key] === 'string',
    ) &&
    typeof record.read === 'boolean' &&
    attachmentsOk
  )
}

function readLocal(): DirectMessage[] {
  const saved = localStore.getJson<unknown>(MESSAGES_KEY)
  return Array.isArray(saved) ? saved.filter(isDirectMessage) : []
}

const localMessagingService: MessagingService = {
  async list(userId) {
    return readLocal().filter((message) => message.senderId === userId || message.recipientId === userId)
  },

  async send(draft) {
    const attachments = draft.attachments?.length ? draft.attachments : undefined
    if (!draft.text.trim() && !attachments) throw new Error('El mensaje está vacío')
    if (draft.text.length > maxMessageChars) throw new MessageRuleError(`El mensaje supera los ${maxMessageChars} caracteres.`)
    if (attachments && !attachments.every(isSafeAttachment)) throw new Error('Adjunto no permitido')
    const message: DirectMessage = {
      ...draft,
      attachments,
      id: createId(),
      sentAt: new Date().toISOString(),
      read: false,
    }
    if (!localStore.setJson(MESSAGES_KEY, [...readLocal(), message])) {
      throw new Error('No se pudo guardar el mensaje')
    }
    notifyChanged()
    return message
  },

  async sendGroup(draft) {
    const attachments = draft.attachments?.length ? draft.attachments : undefined
    if (!draft.text.trim() && !attachments) throw new Error('El mensaje está vacío')
    if (attachments && !attachments.every(isSafeAttachment)) throw new Error('Adjunto no permitido')
    const recipients = [...new Map(draft.recipients.filter((item) => item.id !== draft.senderId).map((item) => [item.id, item])).values()]
    if (!recipients.length) throw new MessageRuleError('El grupo no tiene a quién escribir.')
    if (recipients.length > maxGroupRecipients) throw new MessageRuleError('El grupo es demasiado grande.')

    const stored = readLocal()
    const role = accountOf(draft.senderId)?.role === 'teacher' ? 'teacher' : 'student'
    const check = checkGroupSend({
      role,
      group: draft.group,
      text: draft.text,
      attachments,
      sentTimes: groupSendTimes(stored, draft.senderId),
    })
    if (!check.ok) throw new MessageRuleError(check.reason)

    const batchId = createId()
    const sentAt = new Date().toISOString()
    const copies: DirectMessage[] = recipients.map((recipient) => ({
      id: createId(),
      senderId: draft.senderId,
      senderName: draft.senderName,
      recipientId: recipient.id,
      recipientName: recipient.name,
      text: draft.text,
      attachments,
      group: { id: draft.group.id, label: draft.group.label, batchId },
      sentAt,
      read: false,
    }))
    if (!localStore.setJson(MESSAGES_KEY, [...stored, ...copies])) {
      throw new Error('No se pudo guardar el mensaje')
    }
    notifyChanged()
    return copies
  },

  async markRead(readerId, senderId) {
    const updated = readLocal().map((message) =>
      message.recipientId === readerId && message.senderId === senderId ? { ...message, read: true } : message,
    )
    localStore.setJson(MESSAGES_KEY, updated)
    notifyChanged()
  },
}

// El backend debe tomar el usuario desde la sesión, devolver solo sus mensajes
// y rechazar destinatarios que no compartan un curso con él. En envíos grupales debe
// resolver los integrantes por su cuenta (no fiarse de la lista del cliente) y aplicar
// los límites de messagingRules.ts. Los adjuntos deben
// subirse aparte (multipart o URL firmada) y validarse en el servidor: tipo real,
// tamaño y antivirus. Aquí viajan incrustados solo porque la demo usa localStorage.
const httpMessagingService: MessagingService = {
  list: () => apiClient.get<DirectMessage[]>('/messages'),
  send: (draft) => apiClient.post<DirectMessage>('/messages', draft),
  sendGroup: (draft) =>
    apiClient.post<DirectMessage[]>('/messages/group', {
      groupId: draft.group.id,
      text: draft.text,
      attachments: draft.attachments,
    }),
  markRead: (_readerId, senderId) => apiClient.post<void>('/messages/read', { senderId }),
}

export const messagingService: MessagingService = env.useMocks ? localMessagingService : httpMessagingService
