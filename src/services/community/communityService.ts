import { env } from '../../config/env'
import { createInitialCommunityState } from '../../data/communitySeed'
import type { CommunityMessage, CommunityState } from '../../types/community'
import { apiClient } from '../http/apiClient'
import { localStore } from '../storage/localStore'

export interface CommunityService {
  load(): Promise<CommunityState>
  save(state: CommunityState): Promise<boolean>
  buildAutoReply(groupName: string, mentorName: string, prompt: string): Promise<CommunityMessage>
}

const COMMUNITY_KEY = 'junior-sparks:community:v2'

function isValidCommunityState(value: unknown): value is CommunityState {
  if (!value || typeof value !== 'object') return false
  const candidate = value as Partial<CommunityState>
  return (
    Array.isArray(candidate.groups) &&
    candidate.groups.every((group) => Array.isArray(group?.members) && Array.isArray(group?.messages)) &&
    typeof candidate.activeGroupId === 'string'
  )
}

const localCommunityService: CommunityService = {
  async load() {
    const saved = localStore.getJson<unknown>(COMMUNITY_KEY)
    return isValidCommunityState(saved) ? saved : createInitialCommunityState()
  },

  async save(state) {
    return localStore.setJson(COMMUNITY_KEY, state)
  },

  async buildAutoReply(groupName, mentorName, prompt) {
    await new Promise((resolve) => window.setTimeout(resolve, 620))
    const initials = mentorName
      .split(/\s+/)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase() ?? '')
      .join('')
    const now = new Date()
    const sentAt = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`
    const normalized = prompt.toLowerCase()
    const replyText = normalized.includes('matriz') || normalized.includes('gauss')
      ? `Buen punto en ${groupName}. Verifica primero si el determinante es ≠ 0 antes de escalonar la última fila.`
      : normalized.includes('circuito') || normalized.includes('led') || normalized.includes('esp32')
        ? `Revisado en ${groupName}: mide continuidad a GND y comprueba la resistencia limitadora de 330 Ω.`
        : `Excelente aporte en ${groupName}. Si compartes tu fragmento o caso de prueba, el grupo te ayuda a validarlo paso a paso.`
    return {
      id: `reply-${Date.now()}`,
      authorId: `mentor:${mentorName}`,
      createdAt: Date.now(),
      author: mentorName,
      authorRole: 'Mentor',
      initials: initials || 'MN',
      text: replyText,
      sentAt,
    }
  },
}

const httpCommunityService: CommunityService = {
  load: () => apiClient.get<CommunityState>('/community'),
  save: async (state) => {
    await apiClient.put<void>('/community', state)
    return true
  },
  buildAutoReply: (groupName, mentorName, prompt) =>
    apiClient.post<CommunityMessage>('/community/reply', { groupName, mentorName, prompt }),
}

export const communityService: CommunityService = env.useMocks ? localCommunityService : httpCommunityService
