import { env } from '../../config/env'
import { createInitialAiState } from '../../data/aiSeed'
import { aiOutputFormats } from '../../data/aiTrainingSources'
import type { AiOutputFormat } from '../../types/ai'
import type { AiControlState, AiDomainId, AiTrainedModel, EpochMetric, NeuronLayerId } from '../../types/ai'
import { apiClient } from '../http/apiClient'
import { localStore } from '../storage/localStore'
import { getSupabaseClient } from '../supabase/supabaseClient'

export interface AiService {
  load(): Promise<AiControlState>
  save(state: AiControlState): Promise<boolean>
  reset(): Promise<AiControlState>
}

const AI_STORAGE_KEY = 'junior-sparks:ai-control:v2'
const DEMO_MODEL_UPGRADE_KEY = 'junior-sparks:ai-demo-domains:v1'

function readModelSource(value: string | null) {
  if (!value) return {}
  try {
    const source = JSON.parse(value)
    if (typeof source?.label !== 'string') return { inputDataset: value }
    return { inputDataset: source.label, examples: Array.isArray(source.examples) ? source.examples : undefined }
  } catch {
    return { inputDataset: value }
  }
}

function readOutputFormat(value: unknown): AiOutputFormat | undefined {
  return typeof value === 'string' && Object.hasOwn(aiOutputFormats, value) ? value as AiOutputFormat : undefined
}

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

const supabaseAiService: AiService = {
  async load() {
    const supabase = getSupabaseClient()
    if (!supabase) return localAiService.load()

    const defaults = createInitialAiState()
    const [modelsRes, guardRes] = await Promise.all([
      supabase.from('ai_models').select('*').order('created_at', { ascending: false }),
      supabase.from('ai_guardrails').select('*').eq('id', 1).maybeSingle(),
    ])

    if (modelsRes.error || guardRes.error) throw new Error('No se pudo cargar la configuración de IA.')

    const models: AiTrainedModel[] = (modelsRes.data ?? []).map((row) => ({
      id: row.id,
      name: row.name,
      version: row.version,
      domain: row.domain as AiDomainId,
      domainLabel: row.domain_label,
      architecture: row.architecture,
      activeNeurons: row.active_neurons,
      totalNeurons: row.total_neurons,
      neuronMask: (row.neuron_mask as Record<string, boolean>) ?? {},
      epochsTrained: row.epochs_trained,
      valAccuracy: Number(row.val_accuracy),
      valLoss: Number(row.val_loss),
      latencyMs: row.latency_ms,
      createdAt: row.created_at,
      enabledForStudents: Boolean(row.enabled_for_students),
      enabledForTeachers: Boolean(row.enabled_for_teachers),
      isActive: row.is_active !== false,
      allowedRoles: Array.isArray(row.allowed_roles) ? row.allowed_roles : undefined,
      targetArea: row.target_area ?? undefined,
      outputFormat: readOutputFormat(row.output_format),
      ...readModelSource(row.input_dataset),
    }))

    const g = guardRes.data
    const nextState: AiControlState = {
      selectedDomain: (g?.selected_domain as AiDomainId) || defaults.selectedDomain,
      draftModelName: g?.draft_model_name || defaults.draftModelName,
      neurons: Array.isArray(g?.neurons) && g.neurons.length > 0 ? g.neurons : defaults.neurons,
      hyperparams:
        g?.hyperparams && typeof g.hyperparams === 'object' && 'learningRate' in g.hyperparams
          ? (g.hyperparams as AiControlState['hyperparams'])
          : defaults.hyperparams,
      currentEpoch: typeof g?.current_epoch === 'number' ? g.current_epoch : defaults.currentEpoch,
      status: (g?.status as AiControlState['status']) || defaults.status,
      history: Array.isArray(g?.history) ? g.history : defaults.history,
      config:
        g?.config && typeof g.config === 'object' && 'studentGlobalEnabled' in g.config
          ? (g.config as AiControlState['config'])
          : defaults.config,
      models,
      dataset:
        g?.dataset && typeof g.dataset === 'object' && 'records' in g.dataset
          ? (g.dataset as AiControlState['dataset'])
          : defaults.dataset,
      trainingSource: g?.dataset?.trainingSource,
      outputFormat: readOutputFormat(g?.dataset?.outputFormat),
    }

    localStore.setJson(AI_STORAGE_KEY, nextState)
    return nextState
  },

  async save(state) {
    localStore.setJson(AI_STORAGE_KEY, state)
    const supabase = getSupabaseClient()
    if (!supabase) return true

    const [guardResult, modelsResult] = await Promise.all([
      supabase.from('ai_guardrails').upsert(
        {
          id: 1,
          selected_domain: state.selectedDomain,
          draft_model_name: state.draftModelName,
          neurons: state.neurons,
          hyperparams: state.hyperparams,
          current_epoch: state.currentEpoch,
          status: state.status,
          history: state.history,
          config: state.config,
          dataset: { ...state.dataset, trainingSource: state.trainingSource, outputFormat: state.outputFormat },
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'id' },
      ),
      state.models.length
        ? supabase.from('ai_models').upsert(
            state.models.map((m) => ({
              id: m.id,
              name: m.name,
              version: m.version,
              domain: m.domain,
              domain_label: m.domainLabel,
              architecture: m.architecture,
              active_neurons: m.activeNeurons,
              total_neurons: m.totalNeurons,
              neuron_mask: m.neuronMask,
              epochs_trained: m.epochsTrained,
              val_accuracy: m.valAccuracy,
              val_loss: m.valLoss,
              latency_ms: m.latencyMs,
              enabled_for_students: m.enabledForStudents,
              enabled_for_teachers: m.enabledForTeachers,
              is_active: m.isActive !== false,
              allowed_roles: m.allowedRoles ?? [
                ...(m.enabledForStudents ? ['student'] : []),
                ...(m.enabledForTeachers ? ['teacher'] : []),
                'admin',
              ],
              target_area: m.targetArea ?? m.domainLabel,
              input_dataset: m.inputDataset
                ? JSON.stringify({ label: m.inputDataset, examples: m.examples })
                : m.domainLabel,
              output_format: m.outputFormat ?? 'explanation',
              created_at: m.createdAt,
            })),
            { onConflict: 'id' },
          )
        : Promise.resolve(),
    ])

    return !guardResult.error && !modelsResult?.error
  },

  async reset() {
    const fresh = createInitialAiState()
    await this.save(fresh)
    return fresh
  },
}

const localAiService: AiService = {
  async load() {
    const saved = localStore.getJson<Partial<AiControlState>>(AI_STORAGE_KEY)
    if (!isValidAiState(saved)) return createInitialAiState()
    if (localStore.getText(DEMO_MODEL_UPGRADE_KEY)) return saved
    const domains = new Set(saved.models.map((model) => model.domain))
    const models = createInitialAiState().models.filter((model) =>
      (model.domain === 'algorithms' || model.domain === 'coordination-stats') && !domains.has(model.domain),
    )
    const upgraded = { ...saved, models: [...saved.models, ...models] }
    if (localStore.setJson(AI_STORAGE_KEY, upgraded)) localStore.setText(DEMO_MODEL_UPGRADE_KEY, '1')
    return upgraded
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

export const aiService: AiService = env.hasSupabase
  ? supabaseAiService
  : env.apiUrl
    ? httpAiService
    : localAiService
