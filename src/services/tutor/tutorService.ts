import { env } from '../../config/env'
import { aiDomains } from '../../data/aiSeed'
import { defaultTutorResponse, tutorTopics } from '../../data/tutorResponses'
import type { AiControlState, AiTrainedModel } from '../../types/ai'
import type { DemoRole } from '../../types/auth'
import type { TutorMessage } from '../../types/tutor'
import { normalizeSearchText } from '../../utils/text'
import { aiService } from '../ai/aiService'
import { apiClient } from '../http/apiClient'
import { localStore } from '../storage/localStore'

export interface TutorService {
  loadMessages(userId: string): Promise<TutorMessage[]>
  saveMessages(userId: string, messages: TutorMessage[]): Promise<boolean>
  clearMessages(userId: string): Promise<boolean>
  ask(question: string, role?: DemoRole): Promise<string>
}

const STORAGE_PREFIX = 'junior-sparks:tutor:v1:'

function isTutorMessage(value: unknown): value is TutorMessage {
  if (!value || typeof value !== 'object') return false
  const record = value as Record<string, unknown>
  return (
    typeof record.id === 'string' &&
    typeof record.text === 'string' &&
    (record.role === 'student' || record.role === 'tutor')
  )
}

export function getActiveModelsForRole(aiState: AiControlState, role: DemoRole): AiTrainedModel[] {
  const isStudent = role === 'student'
  const globalEnabled = isStudent ? aiState.config.studentGlobalEnabled : aiState.config.teacherGlobalEnabled
  if (!globalEnabled) return []
  return aiState.models.filter((model) => (isStudent ? model.enabledForStudents : model.enabledForTeachers))
}

const localTutorService: TutorService = {
  async loadMessages(userId) {
    const saved = localStore.getJson<unknown>(STORAGE_PREFIX + userId)
    if (!Array.isArray(saved)) return []
    return saved.filter(isTutorMessage)
  },

  async saveMessages(userId, messages) {
    if (!messages.length) return localStore.remove(STORAGE_PREFIX + userId)
    return localStore.setJson(STORAGE_PREFIX + userId, messages)
  },

  async clearMessages(userId) {
    return localStore.remove(STORAGE_PREFIX + userId)
  },

  async ask(question, role = 'student') {
    await new Promise((resolve) => window.setTimeout(resolve, 520))
    const aiState = await aiService.load()
    const isStudent = role === 'student'
    const roleLabel = isStudent ? 'alumnos' : 'docentes'
    const globalEnabled = isStudent ? aiState.config.studentGlobalEnabled : aiState.config.teacherGlobalEnabled

    if (!globalEnabled) {
      return `El motor de IA está deshabilitado globalmente para ${roleLabel} desde Administración → Motor de IA.`
    }

    const activeModels = getActiveModelsForRole(aiState, role)
    const searchable = normalizeSearchText(question)
    const topic = tutorTopics.find((item) => item.matches.test(searchable))

    if (topic) {
      const matchingModel = activeModels
        .filter((model) => model.domain === topic.domain)
        .sort((a, b) => b.valAccuracy - a.valAccuracy)[0]

      if (!matchingModel) {
        const domainName = aiDomains.find((d) => d.id === topic.domain)?.label ?? topic.domain
        return `El modelo especializado en «${domainName}» está desactivado actualmente para ${roleLabel}. Un administrador puede habilitarlo en Motor de IA → Acceso alumnos y docentes.`
      }

      const modeNote =
        isStudent && aiState.config.stepByStepStudentMode ? ' · Modo guía paso a paso' : ''
      return `[${matchingModel.name} · ${matchingModel.valAccuracy.toFixed(1)}% precisión${modeNote}]\n\n${topic.answer}`
    }

    if (/pista|socratic|formula|matriz|verifica|planteamiento|reto/.test(searchable)) {
      const leadModel = activeModels[0]
      if (!leadModel) {
        return `No hay modelos especializados activos para ${roleLabel} en este momento.`
      }
      if (/pista/.test(searchable)) {
        return `[${leadModel.name} · Pista socrática]\n\n1. Identifica los datos de entrada y la condición límite (pivote ≠ 0, voltaje 5 V o contrato TypeScript).\n2. Aplica una sola transformación por paso antes de saltar al resultado final.\n\n¿Qué primer paso proponés probar?`
      }
      if (/verifica|planteamiento/.test(searchable)) {
        return `[${leadModel.name} · Lista de verificación]\n\n\`\`\`text\n[1] Unidades / dimensiones consistentes\n[2] Caso base / fila nula comprobada\n[3] Resultado validado contra caso de prueba\n\`\`\`\n\nComparte tus valores intermedios y revisamos dónde diverge.`
      }
      return `[${leadModel.name} · Reto guiado]\n\nResuelve el ejercicio del laboratorio interactivo del módulo activo y pega aquí el estado que obtuviste (ej. rango, salida Q o aserción).`
    }

    if (activeModels.length === 0) {
      return `No hay modelos especializados activos para ${roleLabel} en este momento.`
    }

    return defaultTutorResponse
  },
}

const httpTutorService: TutorService = {
  loadMessages: (userId) => apiClient.get<TutorMessage[]>(`/tutor/${encodeURIComponent(userId)}/messages`),
  saveMessages: async (userId, messages) => {
    await apiClient.put<void>(`/tutor/${encodeURIComponent(userId)}/messages`, { messages })
    return true
  },
  clearMessages: async (userId) => {
    await apiClient.delete<void>(`/tutor/${encodeURIComponent(userId)}/messages`)
    return true
  },
  ask: async (question, role) => {
    const res = await apiClient.post<{ answer: string }>('/tutor/ask', { question, role })
    return res.answer
  },
}

export const tutorService: TutorService = env.useMocks ? localTutorService : httpTutorService
