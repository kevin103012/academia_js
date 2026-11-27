import { env } from '../../config/env'
import { createInitialAiState } from '../../data/aiSeed'
import type { AiControlState, EpochMetric, NeuronLayerId } from '../../types/ai'
import { apiClient } from '../http/apiClient'
import { localStore } from '../storage/localStore'

export interface AiService {
  load(): Promise<AiControlState>
  save(state: AiControlState): Promise<boolean>
  reset(): Promise<AiControlState>
}

const AI_STORAGE_KEY = 'junior-sparks:ai-control:v2'

function isValidAiState(candidate: Partial<AiControlState> | null): candidate is AiControlState {
  if (!candidate) return false
  return (
    typeof candidate.selectedDomain === 'string' &&
    typeof candidate.draftModelName === 'string' &&
    Array.isArray(candidate.neurons) &&
    candidate.neurons.length > 0 &&
    typeof candidate.hyperparams === 'object' &&
    candidate.hyperparams !== null &&
    typeof candidate.currentEpoch === 'number' &&
    typeof candidate.status === 'string' &&
    Array.isArray(candidate.history) &&
    typeof candidate.config === 'object' &&
    candidate.config !== null &&
    typeof candidate.config.studentGlobalEnabled === 'boolean' &&
    typeof candidate.config.teacherGlobalEnabled === 'boolean' &&
    Array.isArray(candidate.models) &&
    typeof candidate.dataset === 'object' &&
    candidate.dataset !== null
  )
}

export function computeNextEpoch(state: AiControlState): EpochMetric {
  const nextEpoch = state.currentEpoch + 1
  const layers: NeuronLayerId[] = ['input', 'hidden1', 'hidden2', 'output']
  const layerRatios = layers.map((layer) => {
    const nodes = state.neurons.filter((node) => node.layer === layer)
    const active = nodes.filter((node) => node.enabled).length
    return nodes.length ? active / nodes.length : 0
  })

  const totalNodes = state.neurons.length || 1
  const activeRatio = state.neurons.filter((node) => node.enabled).length / totalNodes
  const bottleneck = Math.min(...layerRatios)
  const capacityFactor = 0.45 * activeRatio + 0.55 * bottleneck

  const lrBoost = state.hyperparams.learningRate === 0.01 ? 1.18 : state.hyperparams.learningRate === 0.003 ? 1.0 : 0.78
  const dropout = state.hyperparams.dropoutRate
  const overfitPenalty = dropout === 0 ? Math.min(0.14, nextEpoch * 0.009) : 0
  const regularizationBonus = dropout >= 0.15 && dropout <= 0.3 ? 0.025 : 0

  const prev = state.history.at(-1)
  const prevTrain = prev?.trainLoss ?? 0.92
  const decay = Math.max(0.06, 0.16 * lrBoost * capacityFactor)

  const floorTrain = Math.max(0.11, 0.48 - 0.34 * capacityFactor)
  const trainLoss = Number(Math.max(floorTrain, prevTrain - (prevTrain - floorTrain) * decay).toFixed(3))

  const capacityPenalty = (1 - capacityFactor) * 0.24
  const valLoss = Number(
    Math.max(0.15, trainLoss + 0.032 + capacityPenalty + overfitPenalty - regularizationBonus).toFixed(3),
  )

  const maxAccuracy = 58 + 37.5 * capacityFactor - (dropout === 0 ? 3.2 : 0)
  const prevAccuracy = prev?.accuracy ?? 56
  const accuracyGain = Math.max(0.15, (maxAccuracy - prevAccuracy) * 0.24 * lrBoost)
  const accuracy = Number(Math.min(96.8, Math.max(42, prevAccuracy + accuracyGain)).toFixed(1))

  return {
    epoch: nextEpoch,
    trainLoss,
    valLoss,
    accuracy,
  }
}

const localAiService: AiService = {
  async load() {
    const saved = localStore.getJson<Partial<AiControlState>>(AI_STORAGE_KEY)
    return isValidAiState(saved) ? saved : createInitialAiState()
  },

  async save(state) {
    return localStore.setJson(AI_STORAGE_KEY, state)
  },

  async reset() {
    const fresh = createInitialAiState()
    localStore.setJson(AI_STORAGE_KEY, fresh)
    return fresh
  },
}

const httpAiService: AiService = {
  load: () => apiClient.get<AiControlState>('/ml/control'),
  save: async (state) => {
    await apiClient.put<void>('/ml/control', state)
    return true
  },
  reset: () => apiClient.post<AiControlState>('/ml/control/reset'),
}

export const aiService: AiService = env.useMocks ? localAiService : httpAiService
