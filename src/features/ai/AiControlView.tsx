import { useEffect, useRef, useState } from 'react'
import { Sparkles } from 'lucide-react'
import { LoadingMark } from '../../components/ui/LoadingMark'
import { aiDomains, buildNeuronMask, createInitialAiState } from '../../data/aiSeed'
import { aiService, computeNextEpoch } from '../../services'
import type {
  AiControlState,
  AiDomainId,
  AiGuardrailsConfig,
  AiTrainedModel,
  TrainingHyperparams,
} from '../../types/ai'
import type { Commit } from '../../types/workspace'
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
      'Configura la especialidad de ingeniería, enciende o apaga neuronas por capa y entrena el modelo por épocas.',
  },
  'ai-trained': {
    title: 'Modelos entrenados',
    subtitle:
      'Consulta los modelos especializados guardados, recárgalos en el laboratorio o valida el dataset académico.',
  },
  'ai-access': {
    title: 'Acceso alumnos y docentes',
    subtitle:
      'Activa o apaga de forma independiente qué modelos entrenados pueden usar los alumnos y los docentes.',
  },
}

export function AiControlView({ section, onNavigateSection, commit, notify }: AiControlViewProps) {
  const [state, setState] = useState<AiControlState>(createInitialAiState)
  const [loaded, setLoaded] = useState(false)
  const shouldPersistRef = useRef(false)

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
        if (active) setLoaded(true)
      })
    return () => {
      active = false
    }
  }, [])

  useEffect(() => {
    if (!loaded || !shouldPersistRef.current) return
    void aiService.save(state)
  }, [state, loaded])

  useEffect(() => {
    if (!loaded || state.status !== 'training') return
    const timer = window.setInterval(() => {
      shouldPersistRef.current = true
      setState((current) => {
        if (current.status !== 'training') return current
        if (current.currentEpoch >= current.hyperparams.targetEpochs) {
          return { ...current, status: 'completed' }
        }
        const metric = computeNextEpoch(current)
        const nextStatus = metric.epoch >= current.hyperparams.targetEpochs ? 'completed' : 'training'
        return {
          ...current,
          currentEpoch: metric.epoch,
          status: nextStatus,
          history: [...current.history, metric],
        }
      })
    }, 650)
    return () => window.clearInterval(timer)
  }, [loaded, state.status])

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
        draftModelName: isDefaultDraft && meta ? `${meta.defaultName}-Custom` : current.draftModelName,
      }
    })
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
    updateState((current) => ({
      ...current,
      status: current.status === 'training' ? 'paused' : 'training',
    }))
  }

  function handleStepEpoch() {
    updateState((current) => {
      if (current.currentEpoch >= current.hyperparams.targetEpochs) return current
      const metric = computeNextEpoch(current)
      return {
        ...current,
        currentEpoch: metric.epoch,
        status: metric.epoch >= current.hyperparams.targetEpochs ? 'completed' : 'paused',
        history: [...current.history, metric],
      }
    })
  }

  function handleResetTraining() {
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
      enabledForStudents: true,
      enabledForTeachers: true,
    }
    updateState((current) => ({
      ...current,
      models: [savedModel, ...current.models],
    }))
    commit(`Guardó el modelo «${modelName}» (${domainMeta.shortLabel})`, (workspace) => workspace)
    notify(`Modelo «${modelName}» guardado en Modelos entrenados.`)
  }

  function handleLoadInTrainer(model: AiTrainedModel) {
    updateState((current) => ({
      ...current,
      selectedDomain: model.domain,
      draftModelName: model.name,
      status: 'paused',
      neurons: current.neurons.map((node) => ({
        ...node,
        enabled: model.neuronMask[node.id] ?? true,
      })),
    }))
    onNavigateSection('ai-neural')
    notify(`Topología de «${model.name}» cargada en el laboratorio.`)
  }

  function handleDeleteModel(modelId: string) {
    if (state.models.length <= 1) return
    const target = state.models.find((item) => item.id === modelId)
    updateState((current) => ({
      ...current,
      models: current.models.filter((item) => item.id !== modelId),
    }))
    if (target) {
      commit(`Eliminó el modelo «${target.name}»`, (workspace) => workspace)
      notify(`Modelo «${target.name}» eliminado.`)
    }
  }

  function handleToggleRoleAccess(modelId: string, role: 'student' | 'teacher') {
    const target = state.models.find((item) => item.id === modelId)
    if (!target) return
    const nextValue = role === 'student' ? !target.enabledForStudents : !target.enabledForTeachers
    updateState((current) => ({
      ...current,
      models: current.models.map((item) => {
        if (item.id !== modelId) return item
        return role === 'student'
          ? { ...item, enabledForStudents: nextValue }
          : { ...item, enabledForTeachers: nextValue }
      }),
    }))
    const roleLabel = role === 'student' ? 'alumnos' : 'docentes'
    commit(
      `${nextValue ? 'Activó' : 'Apagó'} «${target.name}» para ${roleLabel}`,
      (workspace) => workspace,
    )
    notify(`«${target.name}» ${nextValue ? 'activado' : 'apagado'} para ${roleLabel}.`)
  }

  function handleSaveConfig(nextConfig: AiGuardrailsConfig) {
    updateState((current) => ({
      ...current,
      config: nextConfig,
    }))
    commit('Actualizó políticas globales de acceso e IA', (workspace) => workspace)
    notify('Políticas globales de acceso e IA guardadas.')
  }

  function handleValidateDataset() {
    updateState((current) => ({
      ...current,
      dataset: {
        ...current.dataset,
        lastVerifiedAt: dateKey(),
      },
    }))
    commit('Validó la calidad del dataset de ingeniería', (workspace) => workspace)
    notify('Dataset validado: 0 duplicados y esquema íntegro.')
  }

  if (!loaded) {
    return (
      <div className="campus-loading">
        <LoadingMark label="Cargando motor de IA" />
      </div>
    )
  }

  const activeStudentsCount = state.config.studentGlobalEnabled
    ? state.models.filter((model) => model.enabledForStudents).length
    : 0
  const activeTeachersCount = state.config.teacherGlobalEnabled
    ? state.models.filter((model) => model.enabledForTeachers).length
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

      {section === 'ai-neural' && (
        <NeuralTrainingSubmodule
          state={state}
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
          dataset={state.dataset}
          models={state.models}
          onValidateDataset={handleValidateDataset}
          onLoadInTrainer={handleLoadInTrainer}
          onOpenAccess={() => onNavigateSection('ai-access')}
          onDeleteModel={handleDeleteModel}
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
