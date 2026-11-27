import { useEffect, useRef, useState } from 'react'
import { Sparkles } from 'lucide-react'
import { LoadingMark } from '../../components/ui/LoadingMark'
import { aiDomains, buildNeuronMask, createInitialAiState } from '../../data/aiSeed'
import { trainingSourceFor } from '../../data/aiTrainingSources'
import { aiService, computeNextEpoch } from '../../services'
import { rolesForModel } from '../../services/tutor/tutorService'
import type {
  AiControlState,
  AiDomainId,
  AiGuardrailsConfig,
  AiOutputFormat,
  AiTrainingSource,
  AiTrainedModel,
  NeuronLayerId,
  TrainingHyperparams,
} from '../../types/ai'
import type { Commit } from '../../types/workspace'
import type { DemoRole } from '../../types/auth'
import { dateKey } from '../../utils/date'
import { createId } from '../../utils/id'
import type { AiSectionId } from '../campus/navigation'
import { ModelAccessSubmodule } from './ModelAccessSubmodule'
import { NeuralTrainingSubmodule } from './NeuralTrainingSubmodule'
import { TrainedModelsSubmodule } from './TrainedModelsSubmodule'
import '../../styles/ai.css'

interface AiControlViewProps {
  section: AiSectionId
  onNavigateSection: (next: AiSectionId) => void
  commit: Commit
  notify: (message: string) => void
}

const sectionMeta: Record<AiSectionId, { title: string; subtitle: string }> = {
  'ai-neural': {
    title: 'Entrenamiento neuronal',
    subtitle:
      'Selecciona datos de entrada y formato de respuesta. El laboratorio simula la propagación por capas y sus métricas.',
  },
  'ai-trained': {
    title: 'Modelos entrenados',
    subtitle: 'Revisa las configuraciones guardadas del laboratorio y controla su disponibilidad en el tutor.',
  },
  'ai-access': {
    title: 'Acceso alumnos y docentes',
    subtitle:
      'Activa o apaga de forma independiente qué modelos entrenados pueden usar los alumnos y los docentes.',
  },
}

const trainingLayers: NeuronLayerId[] = ['input', 'hidden1', 'hidden2', 'output']

export function AiControlView({ section, onNavigateSection, commit, notify }: AiControlViewProps) {
  const [state, setState] = useState<AiControlState>(createInitialAiState)
  const [loaded, setLoaded] = useState(false)
  const shouldPersistRef = useRef(false)
  const saveQueue = useRef<Promise<unknown>>(Promise.resolve())
  const [storageError, setStorageError] = useState('')
  const [layerIndex, setLayerIndex] = useState(0)
  const [singleEpoch, setSingleEpoch] = useState(false)

  useEffect(() => {
    let active = true
    aiService
      .load()
      .then((saved) => {
        if (!active) return
        shouldPersistRef.current = false
        setState(saved)
        setLoaded(true)
      })
      .catch(() => {
        if (active) {
          setStorageError('No se pudo cargar el motor de IA. Vuelve a abrir el módulo para reintentar.')
          setLoaded(true)
        }
      })
    return () => {
      active = false
    }
  }, [])

  useEffect(() => {
    if (!loaded || !shouldPersistRef.current) return
    let active = true
    saveQueue.current = saveQueue.current.catch(() => undefined).then(async () => {
      try {
        if (!(await aiService.save(state))) throw new Error()
        if (active) setStorageError('')
      } catch {
        if (active) setStorageError('No se pudo sincronizar el cambio del motor de IA.')
      }
    })
    return () => { active = false }
  }, [state, loaded])

  useEffect(() => {
    if (!loaded || state.status !== 'training') return
    const timer = window.setTimeout(() => {
      if (layerIndex < trainingLayers.length - 1) {
        setLayerIndex(layerIndex + 1)
        return
      }
      setLayerIndex(0)
      shouldPersistRef.current = true
      setState((current) => {
        if (current.status !== 'training') return current
        if (current.currentEpoch >= current.hyperparams.targetEpochs) {
          return { ...current, status: 'completed' }
        }
        const metric = computeNextEpoch(current)
        const nextStatus = metric.epoch >= current.hyperparams.targetEpochs
          ? 'completed'
          : singleEpoch ? 'paused' : 'training'
        return {
          ...current,
          currentEpoch: metric.epoch,
          status: nextStatus,
          history: [...current.history, metric],
        }
      })
    }, 280)
    return () => window.clearTimeout(timer)
  }, [loaded, state.status, layerIndex, singleEpoch])

  function updateState(updater: (current: AiControlState) => AiControlState) {
    shouldPersistRef.current = true
    setState(updater)
  }

  function handleChangeDomain(domain: AiDomainId) {
    const meta = aiDomains.find((item) => item.id === domain)
    updateState((current) => {
      const prevMeta = aiDomains.find((item) => item.id === current.selectedDomain)
      const isDefaultDraft =
        !current.draftModelName.trim() ||
        current.draftModelName === `${prevMeta?.defaultName ?? ''}` ||
        current.draftModelName.startsWith('Sparks-')
      return {
        ...current,
        selectedDomain: domain,
        trainingSource: undefined,
        currentEpoch: 0,
        history: [],
        status: 'idle',
        draftModelName: isDefaultDraft && meta ? `${meta.defaultName}-Custom` : current.draftModelName,
      }
    })
    setLayerIndex(0)
  }

  function handleChangeSource(trainingSource?: AiTrainingSource) {
    setLayerIndex(0)
    updateState((current) => ({ ...current, trainingSource, currentEpoch: 0, history: [], status: 'idle' }))
  }

  function handleChangeOutputFormat(outputFormat: AiOutputFormat) {
    updateState((current) => ({ ...current, outputFormat }))
  }

  function handleChangeModelName(name: string) {
    updateState((current) => ({ ...current, draftModelName: name }))
  }

  function handleToggleNeuron(neuronId: string) {
    updateState((current) => ({
      ...current,
      status: current.status === 'training' ? 'paused' : current.status,
      neurons: current.neurons.map((node) => (node.id === neuronId ? { ...node, enabled: !node.enabled } : node)),
    }))
  }

  function handleBulkNeurons(mode: 'all' | 'prune20' | 'restore') {
    if (mode === 'restore') {
      const defaults = createInitialAiState().neurons
      updateState((current) => ({
        ...current,
        status: current.status === 'training' ? 'paused' : current.status,
        neurons: defaults,
      }))
      notify('Topología neuronal restaurada (18/18 activas).')
      return
    }
    if (mode === 'all') {
      updateState((current) => ({
        ...current,
        neurons: current.neurons.map((node) => ({ ...node, enabled: true })),
      }))
      notify('Todas las neuronas quedaron activas.')
      return
    }
    updateState((current) => ({
      ...current,
      status: current.status === 'training' ? 'paused' : current.status,
      neurons: current.neurons.map((node) => {
        if ((node.layer === 'hidden1' || node.layer === 'hidden2') && node.weightNorm < 0.76) {
          return { ...node, enabled: false }
        }
        return { ...node, enabled: true }
      }),
    }))
    notify('Poda selectiva aplicada sobre unidades de menor norma.')
  }

  function handleUpdateHyperparams(patch: Partial<TrainingHyperparams>) {
    updateState((current) => ({
      ...current,
      hyperparams: { ...current.hyperparams, ...patch },
      status:
        patch.targetEpochs && current.currentEpoch < patch.targetEpochs && current.status === 'completed'
          ? 'paused'
          : current.status,
    }))
  }

  function handleStartPause() {
    setSingleEpoch(false)
    updateState((current) => ({
      ...current,
      status: current.status === 'training' ? 'paused' : 'training',
    }))
  }

  function handleStepEpoch() {
    setLayerIndex(0)
    setSingleEpoch(true)
    updateState((current) => ({ ...current, status: 'training' }))
  }

  function handleResetTraining() {
    setLayerIndex(0)
    const fresh = createInitialAiState()
    updateState((current) => ({
      ...current,
      currentEpoch: 0,
      status: 'idle',
      history: [],
      hyperparams: fresh.hyperparams,
    }))
    notify('Entrenamiento reiniciado.')
  }

  function handleSaveTrainedModel() {
    const latest = state.history.at(-1)
    const modelName = state.draftModelName.trim()
    if (!latest || !modelName) return
    const domainMeta = aiDomains.find((item) => item.id === state.selectedDomain) ?? aiDomains[0]
    const activeNeurons = state.neurons.filter((node) => node.enabled).length
    const source = state.trainingSource ?? trainingSourceFor(domainMeta.id)
    const allowedRoles: DemoRole[] = domainMeta.id === 'coordination-stats'
      ? ['coordinator', 'admin']
      : ['student', 'teacher', 'admin']
    const nextMinor = state.models.length + 1
    const savedModel: AiTrainedModel = {
      id: createId(),
      name: modelName,
      version: `v1.${nextMinor}.0`,
      domain: domainMeta.id,
      domainLabel: domainMeta.label,
      architecture: `GRU + Densa (${activeNeurons}/${state.neurons.length} neuronas)`,
      activeNeurons,
      totalNeurons: state.neurons.length,
      neuronMask: buildNeuronMask(state.neurons),
      epochsTrained: state.currentEpoch,
      valAccuracy: latest.accuracy,
      valLoss: latest.valLoss,
      latencyMs: Math.max(18, Math.round(18 + activeNeurons * 1.15)),
      createdAt: dateKey(),
      enabledForStudents: allowedRoles.includes('student'),
      enabledForTeachers: allowedRoles.includes('teacher'),
      isActive: true,
      allowedRoles,
      targetArea: domainMeta.label,
      inputDataset: source.label,
      examples: source.examples,
      outputFormat: state.outputFormat ?? 'explanation',
    }
    updateState((current) => ({
      ...current,
      models: [savedModel, ...current.models],
    }))
    commit(`Guardó el modelo «${modelName}» (${domainMeta.shortLabel})`, (workspace) => workspace)
    notify(`Modelo «${modelName}» guardado en Modelos entrenados.`)
  }

  function handleLoadInTrainer(model: AiTrainedModel) {
    setLayerIndex(0)
    updateState((current) => ({
      ...current,
      selectedDomain: model.domain,
      draftModelName: model.name,
      status: 'paused',
      currentEpoch: 0,
      history: [],
      trainingSource: model.examples?.length ? { label: model.inputDataset ?? model.name, examples: model.examples } : undefined,
      outputFormat: model.outputFormat,
      neurons: current.neurons.map((node) => ({
        ...node,
        enabled: model.neuronMask[node.id] ?? true,
      })),
    }))
    onNavigateSection('ai-neural')
    notify(`Topología de «${model.name}» cargada en el laboratorio.`)
  }

  function handleModelStatus(modelId: string) {
    updateState((current) => ({
      ...current,
      models: current.models.map((model) =>
        model.id === modelId ? { ...model, isActive: model.isActive === false } : model,
      ),
    }))
  }

  function handleToggleRoleAccess(modelId: string, role: DemoRole) {
    const target = state.models.find((item) => item.id === modelId)
    if (!target) return
    const allowedRoles = rolesForModel(target)
    const nextRoles = allowedRoles.includes(role) ? allowedRoles.filter((item) => item !== role) : [...allowedRoles, role]
    updateState((current) => ({
      ...current,
      models: current.models.map((item) => {
        if (item.id !== modelId) return item
        return {
          ...item,
          allowedRoles: nextRoles,
          enabledForStudents: nextRoles.includes('student'),
          enabledForTeachers: nextRoles.includes('teacher'),
        }
      }),
    }))
  }

  function handleTargetArea(id: string, targetArea: string) {
    updateState((current) => ({
      ...current,
      models: current.models.map((model) => model.id === id ? { ...model, targetArea } : model),
    }))
  }

  function handleSaveConfig(nextConfig: AiGuardrailsConfig) {
    updateState((current) => ({
      ...current,
      config: nextConfig,
    }))
    commit('Actualizó políticas globales de acceso e IA', (workspace) => workspace)
  }

  if (!loaded) {
    return (
      <div className="campus-loading">
        <LoadingMark label="Cargando motor de IA" />
      </div>
    )
  }

  const activeStudentsCount = state.config.studentGlobalEnabled
    ? state.models.filter((model) => model.isActive !== false && model.enabledForStudents).length
    : 0
  const activeTeachersCount = state.config.teacherGlobalEnabled
    ? state.models.filter((model) => model.isActive !== false && model.enabledForTeachers).length
    : 0
  const heading = sectionMeta[section]

  return (
    <section className="ai-root" aria-labelledby="ai-page-heading">
      <header className="p-section-heading">
        <div>
          <h1 id="ai-page-heading">{heading.title}</h1>
          <p>{heading.subtitle}</p>
        </div>
        <span className="p-badge tone-soft-accent ai-header-badge">
          <Sparkles size={15} aria-hidden="true" /> Activos: {activeStudentsCount} alumnos · {activeTeachersCount}{' '}
          docentes
        </span>
      </header>
      {storageError && <p className="p-warning" role="alert">{storageError}</p>}

      {section === 'ai-neural' && (
        <NeuralTrainingSubmodule
          state={state}
          activeLayer={state.status === 'training' ? trainingLayers[layerIndex] : undefined}
          onChangeSource={handleChangeSource}
          onChangeOutputFormat={handleChangeOutputFormat}
          onChangeDomain={handleChangeDomain}
          onChangeModelName={handleChangeModelName}
          onToggleNeuron={handleToggleNeuron}
          onBulkNeurons={handleBulkNeurons}
          onUpdateHyperparams={handleUpdateHyperparams}
          onStartPause={handleStartPause}
          onStepEpoch={handleStepEpoch}
          onResetTraining={handleResetTraining}
          onSaveTrainedModel={handleSaveTrainedModel}
        />
      )}

      {section === 'ai-trained' && (
        <TrainedModelsSubmodule
          models={state.models}
          onLoadInTrainer={handleLoadInTrainer}
          onOpenAccess={() => onNavigateSection('ai-access')}
          onToggleActive={handleModelStatus}
          onChangeArea={handleTargetArea}
        />
      )}

      {section === 'ai-access' && (
        <ModelAccessSubmodule
          config={state.config}
          models={state.models}
          onSaveConfig={handleSaveConfig}
          onToggleRoleAccess={handleToggleRoleAccess}
        />
      )}
    </section>
  )
}
