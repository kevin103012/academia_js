import { useMemo, useState } from 'react'
import {
  AlertTriangle,
  BookmarkPlus,
  Pause,
  Play,
  Power,
  RotateCcw,
  Scissors,
  Sparkles,
  StepForward,
  TrendingDown,
} from 'lucide-react'
import { aiDomains } from '../../data/aiSeed'
import type { AiControlState, AiDomainId, NeuronLayerId, NeuronNode, TrainingHyperparams } from '../../types/ai'

interface NeuralTrainingSubmoduleProps {
  state: AiControlState
  onChangeDomain: (domain: AiDomainId) => void
  onChangeModelName: (name: string) => void
  onToggleNeuron: (neuronId: string) => void
  onBulkNeurons: (mode: 'all' | 'prune20' | 'restore') => void
  onUpdateHyperparams: (patch: Partial<TrainingHyperparams>) => void
  onStartPause: () => void
  onStepEpoch: () => void
  onResetTraining: () => void
  onSaveTrainedModel: () => void
}

const layerMeta: { id: NeuronLayerId; title: string; short: string; x: number }[] = [
  { id: 'input', title: 'Entrada técnica', short: 'Entrada', x: 92 },
  { id: 'hidden1', title: 'Rama temporal GRU', short: 'GRU', x: 282 },
  { id: 'hidden2', title: 'Fusión densa ReLU', short: 'Densa', x: 472 },
  { id: 'output', title: 'Cabezas de salida', short: 'Salida', x: 662 },
]

const statusLabels = {
  idle: 'Detenido',
  training: 'Entrenando',
  paused: 'Pausado',
  completed: 'Completado',
} as const

function nodeY(index: number, count: number) {
  const top = 46
  const height = 180
  if (count <= 1) return top + height / 2
  const step = height / (count - 1)
  return top + index * step
}

function buildLossCurvePoints(values: number[], width: number, height: number, maxVal: number, minVal: number) {
  if (values.length === 0) return ''
  if (values.length === 1) {
    const y = height - ((values[0] - minVal) / (maxVal - minVal || 1)) * height
    return `12,${y.toFixed(1)} ${width - 12},${y.toFixed(1)}`
  }
  const padX = 12
  const usableW = width - padX * 2
  return values
    .map((val, idx) => {
      const x = padX + (idx / (values.length - 1)) * usableW
      const norm = Math.max(0, Math.min(1, (val - minVal) / (maxVal - minVal || 1)))
      const y = height - norm * (height - 16) - 8
      return `${x.toFixed(1)},${y.toFixed(1)}`
    })
    .join(' ')
}

export function NeuralTrainingSubmodule({
  state,
  onChangeDomain,
  onChangeModelName,
  onToggleNeuron,
  onBulkNeurons,
  onUpdateHyperparams,
  onStartPause,
  onStepEpoch,
  onResetTraining,
  onSaveTrainedModel,
}: NeuralTrainingSubmoduleProps) {
  const [selectedId, setSelectedId] = useState<string>(() => state.neurons[0]?.id ?? '')

  const selectedNeuron: NeuronNode | undefined =
    state.neurons.find((node) => node.id === selectedId) ?? state.neurons[0]

  const activeDomainMeta = aiDomains.find((domain) => domain.id === state.selectedDomain) ?? aiDomains[0]
  const activeCount = state.neurons.filter((node) => node.enabled).length
  const totalCount = state.neurons.length
  const capacityPct = Math.round((activeCount / (totalCount || 1)) * 100)
  const latest = state.history.at(-1)

  const neuronsByLayer = useMemo(() => {
    return layerMeta.map((layer) => ({
      ...layer,
      nodes: state.neurons.filter((node) => node.layer === layer.id),
    }))
  }, [state.neurons])

  const blockedLayer = neuronsByLayer.find((layer) => layer.nodes.every((node) => !node.enabled))
  const canTrain = !blockedLayer && state.currentEpoch < state.hyperparams.targetEpochs

  const positionedNodes = useMemo(() => {
    const map = new Map<string, { x: number; y: number; node: NeuronNode }>()
    neuronsByLayer.forEach((layer) => {
      layer.nodes.forEach((node, index) => {
        map.set(node.id, { x: layer.x, y: nodeY(index, layer.nodes.length), node })
      })
    })
    return map
  }, [neuronsByLayer])

  const synapses = useMemo(() => {
    const edges: { id: string; d: string; weightWidth: number; active: boolean }[] = []
    for (let i = 0; i < neuronsByLayer.length - 1; i++) {
      const fromLayer = neuronsByLayer[i]
      const toLayer = neuronsByLayer[i + 1]
      for (const source of fromLayer.nodes) {
        const p1 = positionedNodes.get(source.id)
        if (!p1) continue
        for (const target of toLayer.nodes) {
          const p2 = positionedNodes.get(target.id)
          if (!p2) continue
          const midX = (p1.x + p2.x) / 2
          const avgWeight = (source.weightNorm + target.weightNorm) / 2
          const weightWidth = Number((0.85 + avgWeight * 1.9).toFixed(2))
          edges.push({
            id: `${source.id}->${target.id}`,
            d: `M ${p1.x},${p1.y} C ${midX},${p1.y} ${midX},${p2.y} ${p2.x},${p2.y}`,
            weightWidth,
            active: source.enabled && target.enabled,
          })
        }
      }
    }
    return edges
  }, [neuronsByLayer, positionedNodes])

  const chartSeries = useMemo(() => {
    const trainVals = state.history.map((item) => item.trainLoss)
    const valVals = state.history.map((item) => item.valLoss)
    const allLoss = [...trainVals, ...valVals]
    const maxLoss = allLoss.length ? Math.max(...allLoss, 0.8) : 1
    const minLoss = allLoss.length ? Math.max(0, Math.min(...allLoss) * 0.85) : 0
    return {
      trainPoints: buildLossCurvePoints(trainVals, 320, 108, maxLoss, minLoss),
      valPoints: buildLossCurvePoints(valVals, 320, 108, maxLoss, minLoss),
    }
  }, [state.history])

  function handleNodeInteraction(node: NeuronNode) {
    setSelectedId(node.id)
    onToggleNeuron(node.id)
  }

  return (
    <div className="ai-root">
      <div className="ai-playground-bar" role="region" aria-label="Barra de ejecución e hiperparámetros">
        <div className="ai-playground-transport">
          <button
            type="button"
            className={`ai-play-btn ${state.status === 'training' ? 'tone-pill' : 'tone-accent'}`}
            disabled={state.status !== 'training' && !canTrain}
            aria-label={state.status === 'training' ? 'Pausar entrenamiento' : 'Iniciar entrenamiento'}
            onClick={onStartPause}
          >
            {state.status === 'training' ? <Pause size={16} aria-hidden="true" /> : <Play size={16} aria-hidden="true" />}
            <span>{state.status === 'training' ? 'Pausar' : 'Entrenar'}</span>
          </button>
          <button
            type="button"
            className="ai-mini-btn tone-pill"
            disabled={!canTrain || state.status === 'training'}
            aria-label="Avanzar 1 época"
            onClick={onStepEpoch}
          >
            <StepForward size={15} aria-hidden="true" /> +1
          </button>
          <button
            type="button"
            className="ai-mini-btn tone-danger"
            aria-label="Reiniciar entrenamiento"
            onClick={onResetTraining}
          >
            <RotateCcw size={15} aria-hidden="true" />
          </button>
          <div className="ai-epoch-counter">
            <span>Época</span>
            <strong>
              {String(state.currentEpoch).padStart(2, '0')} / {state.hyperparams.targetEpochs}
            </strong>
          </div>
        </div>

        <div className="ai-playground-params">
          <label>
            <span>Learning rate</span>
            <select
              value={state.hyperparams.learningRate}
              onChange={(event) => onUpdateHyperparams({ learningRate: Number(event.target.value) })}
            >
              <option value={0.001}>0.001</option>
              <option value={0.003}>0.003</option>
              <option value={0.01}>0.010</option>
            </select>
          </label>
          <label>
            <span>Épocas</span>
            <select
              value={state.hyperparams.targetEpochs}
              onChange={(event) => onUpdateHyperparams({ targetEpochs: Number(event.target.value) })}
            >
              <option value={10}>10</option>
              <option value={20}>20</option>
              <option value={30}>30</option>
            </select>
          </label>
          <label>
            <span>Lote</span>
            <select
              value={state.hyperparams.batchSize}
              onChange={(event) =>
                onUpdateHyperparams({ batchSize: Number(event.target.value) as TrainingHyperparams['batchSize'] })
              }
            >
              <option value={16}>16</option>
              <option value={32}>32</option>
              <option value={64}>64</option>
            </select>
          </label>
          <label>
            <span>Dropout</span>
            <select
              value={state.hyperparams.dropoutRate}
              onChange={(event) => onUpdateHyperparams({ dropoutRate: Number(event.target.value) })}
            >
              <option value={0}>0%</option>
              <option value={0.15}>15%</option>
              <option value={0.3}>30%</option>
            </select>
          </label>
        </div>

        <div className="ai-playground-telemetry">
          <div>
            <span>Estado</span>
            <strong>{statusLabels[state.status]}</strong>
          </div>
          <div>
            <span>Capacidad</span>
            <strong>
              {activeCount}/{totalCount} ({capacityPct}%)
            </strong>
          </div>
          <div>
            <span>Val Loss</span>
            <strong>{latest ? latest.valLoss.toFixed(3) : '—'}</strong>
          </div>
          <div>
            <span>Precisión</span>
            <strong className="ai-telemetry-accent">{latest ? `${latest.accuracy.toFixed(1)}%` : '—'}</strong>
          </div>
        </div>
      </div>

      {blockedLayer && (
        <div className="ai-alert" role="alert">
          <AlertTriangle size={18} aria-hidden="true" />
          <span>
            La capa «{blockedLayer.title}» no tiene neuronas activas. Activa al menos una neurona en esa capa para
            reanudar el flujo de gradientes.
          </span>
        </div>
      )}

      <div className="ai-workspace-grid">
        <section className="p-card ai-canvas-card theme-dark" aria-labelledby="ai-topology-heading">
          <div className="ai-canvas-toolbar">
            <div>
              <h2 id="ai-topology-heading">Topología neuronal interactiva · {activeDomainMeta.shortLabel}</h2>
              <p>Grosor de sinapsis proporcional al peso. Haz clic en una neurona para encenderla o podarla.</p>
            </div>
            <div className="ai-toolbar-actions">
              <button
                type="button"
                className="ai-mini-btn tone-soft-accent"
                onClick={() => onBulkNeurons('all')}
              >
                <Sparkles size={14} aria-hidden="true" /> Activar todas
              </button>
              <button
                type="button"
                className="ai-mini-btn tone-pill"
                onClick={() => onBulkNeurons('prune20')}
              >
                <Scissors size={14} aria-hidden="true" /> Poda (20%)
              </button>
              <button
                type="button"
                className="ai-mini-btn tone-pill"
                onClick={() => onBulkNeurons('restore')}
              >
                <RotateCcw size={14} aria-hidden="true" /> Restaurar
              </button>
            </div>
          </div>

          <div className="ai-svg-wrap">
            <svg
              className="ai-svg"
              viewBox="0 0 760 258"
              role="img"
              aria-label={`Red neuronal para ${activeDomainMeta.label} con ${activeCount} de ${totalCount} neuronas activas`}
            >
              {neuronsByLayer.map((layer) => (
                <text key={layer.id} x={layer.x} y="19" textAnchor="middle" className="ai-svg-layer-title">
                  {layer.short} ({layer.nodes.filter((n) => n.enabled).length}/{layer.nodes.length})
                </text>
              ))}

              {synapses.map((edge) => (
                <path
                  key={edge.id}
                  d={edge.d}
                  style={{ strokeWidth: edge.active ? edge.weightWidth : 1 }}
                  className={
                    !edge.active
                      ? 'ai-synapse ai-synapse--off'
                      : state.status === 'training'
                        ? 'ai-synapse ai-synapse--training'
                        : 'ai-synapse'
                  }
                />
              ))}

              {Array.from(positionedNodes.values()).map(({ x, y, node }) => {
                const isSelected = selectedNeuron?.id === node.id
                return (
                  <g
                    key={node.id}
                    className="ai-node-group"
                    role="button"
                    tabIndex={0}
                    aria-label={`${node.label}, ${node.enabled ? 'activa' : 'apagada'}`}
                    aria-pressed={node.enabled}
                    onClick={() => handleNodeInteraction(node)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault()
                        handleNodeInteraction(node)
                      }
                    }}
                  >
                    <circle
                      cx={x}
                      cy={y}
                      r={14}
                      className={`ai-node-circle ${node.enabled ? 'ai-node-circle--on' : 'ai-node-circle--off'}${isSelected ? ' ai-node-circle--selected' : ''}`}
                    />
                    <circle
                      cx={x}
                      cy={y}
                      r={4.5}
                      className={node.enabled ? 'ai-node-core--on' : 'ai-node-core--off'}
                    />
                    <text
                      x={x}
                      y={y + 23}
                      textAnchor="middle"
                      className={`ai-node-label${node.enabled ? '' : ' ai-node-label--off'}`}
                    >
                      {node.label.length > 16 ? `${node.label.slice(0, 15)}…` : node.label}
                    </text>
                  </g>
                )
              })}
            </svg>
          </div>

          <div className="ai-layers-grid" aria-label="Control por capa neuronal">
            {neuronsByLayer.map((layer) => (
              <div className="ai-layer-col" key={layer.id}>
                <header>
                  <span>{layer.short}</span>
                  <span>
                    {layer.nodes.filter((n) => n.enabled).length}/{layer.nodes.length}
                  </span>
                </header>
                {layer.nodes.map((node) => (
                  <button
                    key={node.id}
                    type="button"
                    className={`ai-node-pill ${node.enabled ? 'tone-soft-accent' : 'tone-pill'}`}
                    aria-pressed={node.enabled}
                    data-selected={selectedNeuron?.id === node.id}
                    onClick={() => handleNodeInteraction(node)}
                  >
                    <span>{node.label}</span>
                    <Power size={13} aria-hidden="true" />
                  </button>
                ))}
              </div>
            ))}
          </div>
        </section>

        <div className="ai-side-stack">
          <section className="p-card ai-panel ai-chart-card" aria-labelledby="ai-curve-heading">
            <div className="p-card-head">
              <h2 id="ai-curve-heading">
                <TrendingDown size={16} aria-hidden="true" /> Curva de convergencia
              </h2>
              <div className="ai-chart-legend">
                <span>
                  <i className="ai-legend-val" /> Val Loss
                </span>
                <span>
                  <i className="ai-legend-train" /> Train Loss
                </span>
              </div>
            </div>

            {state.history.length > 0 ? (
              <div className="ai-chart-box">
                <svg className="ai-chart-svg" viewBox="0 0 320 108" role="img" aria-label="Curva de pérdida por época">
                  <line x1="12" y1="27" x2="308" y2="27" className="ai-chart-grid" />
                  <line x1="12" y1="54" x2="308" y2="54" className="ai-chart-grid" />
                  <line x1="12" y1="81" x2="308" y2="81" className="ai-chart-grid" />
                  <polyline points={chartSeries.trainPoints} className="ai-chart-line--train" />
                  <polyline points={chartSeries.valPoints} className="ai-chart-line--val" />
                </svg>
              </div>
            ) : (
              <p className="p-meta">Presiona «Entrenar» o «+1» para trazar la pérdida por época.</p>
            )}

            <div className="ai-epochs-list" aria-label="Historial de épocas">
              {[...state.history].reverse().slice(0, 4).map((item) => (
                <div className="ai-epoch-row" key={item.epoch}>
                  <strong>Época {item.epoch}</strong>
                  <span>
                    Train {item.trainLoss.toFixed(3)} · Val {item.valLoss.toFixed(3)}
                  </span>
                  <span className="p-badge tone-soft-accent">{item.accuracy.toFixed(1)}%</span>
                </div>
              ))}
            </div>
          </section>

          <section className="p-card ai-panel" aria-labelledby="ai-specialty-heading">
            <h2 id="ai-specialty-heading">Especialidad y guardado</h2>
            <div className="ai-hyper-grid">
              <label>
                Dominio de entrenamiento
                <select
                  value={state.selectedDomain}
                  onChange={(event) => onChangeDomain(event.target.value as AiDomainId)}
                >
                  {aiDomains.map((domain) => (
                    <option key={domain.id} value={domain.id}>
                      {domain.label}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Nombre del modelo
                <input
                  type="text"
                  maxLength={42}
                  value={state.draftModelName}
                  placeholder={activeDomainMeta.defaultName}
                  onChange={(event) => onChangeModelName(event.target.value)}
                />
              </label>
            </div>
            <div className="ai-domain-box">
              <small>{activeDomainMeta.description}</small>
            </div>
            <button
              type="button"
              className="p-button tone-accent"
              disabled={Boolean(blockedLayer) || state.history.length === 0 || !state.draftModelName.trim()}
              onClick={onSaveTrainedModel}
            >
              <BookmarkPlus size={16} aria-hidden="true" /> Guardar en modelos entrenados
            </button>
          </section>

          {selectedNeuron && (
            <section className="p-card ai-panel" aria-labelledby="ai-inspector-heading">
              <div className="p-card-head">
                <h2 id="ai-inspector-heading">Inspector · {selectedNeuron.label}</h2>
                <span className={`p-badge ${selectedNeuron.enabled ? 'tone-soft-accent' : ''}`}>
                  {selectedNeuron.enabled ? 'Activa' : 'Apagada'}
                </span>
              </div>
              <p className="p-meta">{selectedNeuron.detail}</p>
              <div className="ai-inspector-meta">
                <div>
                  <span>Activación</span>
                  <strong>{selectedNeuron.activation}</strong>
                </div>
                <div>
                  <span>Norma de peso</span>
                  <strong>{selectedNeuron.enabled ? selectedNeuron.weightNorm.toFixed(2) : '0.00 (poda)'}</strong>
                </div>
              </div>
              <button
                type="button"
                className={`p-button ${selectedNeuron.enabled ? 'tone-danger' : 'tone-accent'}`}
                onClick={() => onToggleNeuron(selectedNeuron.id)}
              >
                <Power size={15} aria-hidden="true" />
                {selectedNeuron.enabled ? 'Apagar neurona' : 'Activar neurona'}
              </button>
            </section>
          )}
        </div>
      </div>
    </div>
  )
}
