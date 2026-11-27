import type { DemoRole } from './auth'

export type AiDomainId = 'linear-algebra' | 'digital-circuits' | 'frameworks-arch' | 'algorithms' | 'coordination-stats'

export type AiOutputFormat = 'explanation' | 'guided-steps' | 'json'

export interface AiTrainingSource {
  label: string
  examples: { input: string; output: string }[]
}

export type NeuronLayerId = 'input' | 'hidden1' | 'hidden2' | 'output'

export interface NeuronNode {
  id: string
  layer: NeuronLayerId
  label: string
  detail: string
  activation: 'Linear' | 'GRU' | 'ReLU' | 'Sigmoid'
  weightNorm: number
  enabled: boolean
}

export type TrainingStatus = 'idle' | 'training' | 'paused' | 'completed'

export interface TrainingHyperparams {
  learningRate: number
  targetEpochs: number
  batchSize: 16 | 32 | 64
  dropoutRate: number
}

export interface EpochMetric {
  epoch: number
  trainLoss: number
  valLoss: number
  accuracy: number
}

export interface AiGuardrailsConfig {
  minConfidence: number
  riskSensitivity: 'baja' | 'media' | 'alta'
  maxDailySuggestions: number
  humanReviewRequired: boolean
  explainabilityEnabled: boolean
  strictPseudonymization: boolean
  deterministicFallback: boolean
  studentGlobalEnabled: boolean
  teacherGlobalEnabled: boolean
  stepByStepStudentMode: boolean
}

export interface AiTrainedModel {
  id: string
  name: string
  version: string
  domain: AiDomainId
  domainLabel: string
  architecture: string
  activeNeurons: number
  totalNeurons: number
  neuronMask: Record<string, boolean>
  epochsTrained: number
  valAccuracy: number
  valLoss: number
  latencyMs: number
  createdAt: string
  enabledForStudents: boolean
  enabledForTeachers: boolean
  isActive?: boolean
  allowedRoles?: DemoRole[]
  targetArea?: string
  inputDataset?: string
  outputFormat?: AiOutputFormat
  examples?: AiTrainingSource['examples']
}

export interface AiDatasetSummary {
  version: string
  records: number
  completeness: number
  duplicates: number
  trainSplit: number
  valSplit: number
  testSplit: number
  lastVerifiedAt: string
}

export interface AiControlState {
  selectedDomain: AiDomainId
  draftModelName: string
  neurons: NeuronNode[]
  hyperparams: TrainingHyperparams
  currentEpoch: number
  status: TrainingStatus
  history: EpochMetric[]
  config: AiGuardrailsConfig
  models: AiTrainedModel[]
  dataset: AiDatasetSummary
  trainingSource?: AiTrainingSource
  outputFormat?: AiOutputFormat
}
