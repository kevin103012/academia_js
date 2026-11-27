import type { DirectMessage, MessageAttachment, MessageGroup } from '../../types/messaging'

/**
 * Reglas contra el spam en envíos grupales. Son funciones puras para que la pantalla
 * avise antes de enviar y el servicio las vuelva a comprobar. Con backend, el servidor
 * debe aplicarlas de nuevo: lo que corre en el navegador no es una garantía.
 */
export const groupLimits = {
  windowMs: 60 * 60 * 1000,
  /** Alumnos: pocos envíos por hora, con pausa entre uno y otro. */
  student: { perWindow: 3, minGapMs: 60_000, maxChars: 500 },
  /** Docentes: más margen, sin pausa obligatoria. */
  teacher: { perWindow: 20, minGapMs: 0, maxChars: 4000 },
} as const

export type SenderRole = 'student' | 'teacher'
export type GroupCheck = { ok: true } | { ok: false; reason: string }

/** Instantes (ms) de los envíos grupales que hizo `senderId`, uno por lote. */
export function groupSendTimes(messages: DirectMessage[], senderId: string): number[] {
  const batches = new Map<string, number>()
  for (const message of messages) {
    if (message.senderId === senderId && message.group) {
      batches.set(message.group.batchId, new Date(message.sentAt).getTime())
    }
  }
  return [...batches.values()].sort((a, b) => a - b)
}

const waitText = (ms: number) => {
  const minutes = Math.ceil(ms / 60_000)
  return minutes <= 1 ? 'un minuto' : `${minutes} minutos`
}

interface GroupCheckInput {
  role: SenderRole
  group: Pick<MessageGroup, 'kind'>
  text: string
  attachments?: MessageAttachment[]
  /** Resultado de groupSendTimes. */
  sentTimes: number[]
  now?: number
}

export function checkGroupSend({ role, group, text, attachments, sentTimes, now = Date.now() }: GroupCheckInput): GroupCheck {
  const limit = groupLimits[role]
  if (text.length > limit.maxChars) {
    return { ok: false, reason: `Los mensajes a grupos pueden tener hasta ${limit.maxChars} caracteres.` }
  }
  // Entre alumnos no se envían archivos: es la vía más fácil de repartir basura.
  if (role === 'student' && group.kind === 'course-classmates' && attachments?.length) {
    return { ok: false, reason: 'No puedes enviar archivos a tus compañeros de curso; quita los adjuntos.' }
  }
  const recent = sentTimes.filter((time) => now - time < groupLimits.windowMs)
  if (recent.length >= limit.perWindow) {
    const wait = recent[0] + groupLimits.windowMs - now
    return {
      ok: false,
      reason: `Alcanzaste el máximo de ${limit.perWindow} mensajes a grupos por hora. Podrás enviar otro en ${waitText(wait)}.`,
    }
  }
  const last = recent[recent.length - 1]
  if (limit.minGapMs && last !== undefined && now - last < limit.minGapMs) {
    return { ok: false, reason: `Espera ${waitText(limit.minGapMs - (now - last))} antes de enviar otro mensaje a un grupo.` }
  }
  return { ok: true }
}

/** Error con un texto apto para mostrarlo a la persona. */
export class MessageRuleError extends Error {}
