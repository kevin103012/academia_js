import { env } from '../../config/env'
import { trainingSourceFor } from '../../data/aiTrainingSources'
import { tutorTopics } from '../../data/tutorResponses'
import type { AiControlState, AiTrainedModel } from '../../types/ai'
import type { DemoRole, DemoUser } from '../../types/auth'
import type { TutorMessage, TutorSession } from '../../types/tutor'
import { createId } from '../../utils/id'
import { normalizeSearchText } from '../../utils/text'
import { aiService } from '../ai/aiService'
import { apiClient } from '../http/apiClient'
import { localStore } from '../storage/localStore'
import { getSupabaseClient } from '../supabase/supabaseClient'

export interface TutorService {
  list(user: DemoUser): Promise<TutorSession[]>
  save(user: DemoUser, session: TutorSession): Promise<void>
  remove(user: DemoUser, id: string): Promise<void>
  answer(user: DemoUser, domain: TutorSession['domain'], question: string): Promise<TutorMessage>
}

const HISTORY_KEY = 'junior-sparks:tutor-sessions:v1:'
const LEGACY_KEY = 'junior-sparks:tutor:v1:'

export function rolesForModel(model: AiTrainedModel): DemoRole[] {
  return model.allowedRoles ?? [
    ...(model.enabledForStudents ? ['student' as const] : []),
    ...(model.enabledForTeachers ? ['teacher' as const] : []),
    'admin',
  ]
}

export function getActiveModelsForRole(aiState: AiControlState, role: DemoRole): AiTrainedModel[] {
  if (role === 'student' && !aiState.config.studentGlobalEnabled) return []
  if (role === 'teacher' && !aiState.config.teacherGlobalEnabled) return []
  return aiState.models.filter((model) => model.isActive !== false && rolesForModel(model).includes(role))
}

function tokens(text: string) {
  return new Set(normalizeSearchText(text).split(/[^a-z0-9]+/).filter((word) => word.length > 3))
}

function bestExample(question: string, model: AiTrainedModel) {
  const words = tokens(question)
  let best = { score: 0, output: '' }
  for (const example of model.examples ?? trainingSourceFor(model.domain).examples) {
    if (typeof example?.input !== 'string' || typeof example?.output !== 'string') continue
    const terms = tokens(example.input)
    const overlap = [...words].filter((word) => terms.has(word)).length
    const score = overlap / Math.sqrt((words.size || 1) * (terms.size || 1))
    if (score > best.score) best = { score, output: example.output }
  }
  return best
}

async function answer(user: DemoUser, domain: TutorSession['domain'], question: string): Promise<TutorMessage> {
  const state = await aiService.load()
  const models = getActiveModelsForRole(state, user.role)
  const candidates = domain === 'auto' ? models : models.filter((model) => model.domain === domain)
  const text = normalizeSearchText(question)
  const selectedTopic = tutorTopics.find((topic) => topic.matches.test(text) && (domain === 'auto' || domain === topic.domain))
  const ranked = candidates
    .map((model) => ({ model, ...bestExample(question, model) }))
    .sort((a, b) => b.score - a.score)
  const picked = selectedTopic
    ? ranked.find(({ model }) => model.domain === selectedTopic.domain)
    : ranked[0]
  const message = { id: createId(), role: 'tutor' as const }
  if (!picked) {
    return { ...message, text: 'No hay un modelo habilitado para esta especialidad y tu perfil.' }
  }

  let output = picked.score >= 0.24
    ? picked.output
    : selectedTopic?.answer ?? 'Me falta un ejemplo relacionado. Comparte el enunciado o describe dónde te quedaste.'
  if (/\bpista\b/.test(text) && !selectedTopic && picked.score < 0.24) {
    output = 'Separa el objetivo de los datos que ya tienes. Escribe qué operación, regla o caso de prueba podrías aplicar primero.'
  }
  if (picked.model.outputFormat === 'json') {
    output = '```json\n' + JSON.stringify({ especialidad: picked.model.domainLabel, respuesta: output }, null, 2) + '\n```'
  } else if (picked.model.outputFormat === 'guided-steps' || (user.role === 'student' && state.config.stepByStepStudentMode)) {
    output = '1. Identifica qué pide el enunciado y qué datos aporta.\n\n2. ' + output + '\n\n3. Prueba el paso con un caso pequeño y comprueba el resultado.'
  }
  return { ...message, model: picked.model.name, text: output }
}

function readLocal(user: DemoUser): TutorSession[] {
  const saved = localStore.getJson<TutorSession[]>(HISTORY_KEY + user.id)
  if (Array.isArray(saved)) return saved
  const legacy = localStore.getJson<TutorMessage[]>(LEGACY_KEY + user.id)
  if (!Array.isArray(legacy) || !legacy.length) return []
  const migrated: TutorSession[] = [{
    id: createId(),
    title: 'Conversación anterior',
    domain: 'auto',
    updatedAt: new Date().toISOString(),
    messages: legacy.filter((message) => typeof message?.text === 'string' && (message.role === 'student' || message.role === 'tutor')),
  }]
  localStore.setJson(HISTORY_KEY + user.id, migrated)
  return migrated
}

function storeLocal(user: DemoUser, sessions: TutorSession[]) {
  if (!localStore.setJson(HISTORY_KEY + user.id, sessions)) {
    throw new Error('El navegador no pudo guardar la conversación.')
  }
}

const localTutorService: TutorService = {
  async list(user) { return readLocal(user) },
  async save(user, session) {
    storeLocal(user, [session, ...readLocal(user).filter((item) => item.id !== session.id)])
  },
  async remove(user, id) {
    storeLocal(user, readLocal(user).filter((item) => item.id !== id))
  },
  answer,
}

const supabaseTutorService: TutorService = {
  async list(user) {
    const client = getSupabaseClient()!
    const { data, error } = await client.from('tutor_sessions')
      .select('id,title,specialty_domain,updated_at,tutor_messages(id,client_id,sender_role,model_used,content,helpful,created_at)')
      .eq('user_id', user.id)
      .order('updated_at', { ascending: false })
    if (error) throw new Error('No se pudo cargar el historial del tutor.')
    return (data ?? []).map((row) => ({
      id: row.id,
      title: row.title,
      domain: row.specialty_domain ?? 'auto',
      updatedAt: row.updated_at,
      messages: row.tutor_messages
        .slice().sort((a, b) => a.created_at.localeCompare(b.created_at) || a.id - b.id)
        .map((message) => ({
          id: message.client_id ?? String(message.id),
          role: message.sender_role as TutorMessage['role'],
          model: message.model_used ?? undefined,
          text: message.content,
          helpful: Boolean(message.helpful),
        })),
    }))
  },
  async save(_user, session) {
    const { error } = await getSupabaseClient()!.rpc('save_tutor_conversation', {
      conversation_id: session.id,
      conversation_title: session.title,
      specialty: session.domain,
      transcript: session.messages,
    })
    if (error) throw new Error('No se pudo guardar la conversación en el campus.')
  },
  async remove(user, id) {
    const { error } = await getSupabaseClient()!.from('tutor_sessions').delete().eq('id', id).eq('user_id', user.id)
    if (error) throw new Error('No se pudo eliminar la conversación.')
  },
  answer,
}

const httpTutorService: TutorService = {
  list: (user) => apiClient.get<TutorSession[]>(`/tutor/${encodeURIComponent(user.id)}/sessions`),
  save: (_user, session) => apiClient.put<void>(`/tutor/sessions/${encodeURIComponent(session.id)}`, session),
  remove: (_user, id) => apiClient.delete<void>(`/tutor/sessions/${encodeURIComponent(id)}`),
  answer: (_user, domain, question) => apiClient.post<TutorMessage>('/tutor/ask', { domain, question }),
}

export const tutorSyncEnabled = env.hasSupabase || Boolean(env.apiUrl)
export const tutorService = env.hasSupabase
  ? supabaseTutorService
  : env.apiUrl ? httpTutorService : localTutorService
