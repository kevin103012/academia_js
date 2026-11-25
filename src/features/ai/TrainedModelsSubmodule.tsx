import { useState } from 'react'
import { BrainCircuit, Database, RefreshCw, SlidersHorizontal, Trash2, Upload } from 'lucide-react'
import { aiDomains } from '../../data/aiSeed'
import type { AiDatasetSummary, AiDomainId, AiTrainedModel } from '../../types/ai'
import { formatDate } from '../../utils/date'

interface TrainedModelsSubmoduleProps {
  dataset: AiDatasetSummary
  models: AiTrainedModel[]
  onValidateDataset: () => void
  onLoadInTrainer: (model: AiTrainedModel) => void
  onOpenAccess: () => void
  onDeleteModel: (modelId: string) => void
}

export function TrainedModelsSubmodule({
  dataset,
  models,
  onValidateDataset,
  onLoadInTrainer,
  onOpenAccess,
  onDeleteModel,
}: TrainedModelsSubmoduleProps) {
  const [domainFilter, setDomainFilter] = useState<'all' | AiDomainId>('all')

  const filtered = domainFilter === 'all' ? models : models.filter((model) => model.domain === domainFilter)

  return (
    <div className="ai-root">
      <section className="p-card ai-panel" aria-labelledby="ai-trained-heading">
        <div className="p-card-head">
          <div>
            <h2 id="ai-trained-heading">Modelos entrenados por especialidad</h2>
            <p className="p-meta">
              Modelos guardados desde el laboratorio neuronal. Carga uno para reajustar sus neuronas o configura quién puede usarlo.
            </p>
          </div>
          <span className="p-badge">
            <BrainCircuit size={14} aria-hidden="true" /> {models.length} guardados
          </span>
        </div>

        <div className="ai-filter-row" role="group" aria-label="Filtrar modelos por especialidad">
          <button
            type="button"
            className={`ai-mini-btn ${domainFilter === 'all' ? 'tone-soft-accent' : 'tone-pill'}`}
            aria-pressed={domainFilter === 'all'}
            onClick={() => setDomainFilter('all')}
          >
            Todos ({models.length})
          </button>
          {aiDomains.map((domain) => {
            const count = models.filter((item) => item.domain === domain.id).length
            return (
              <button
                key={domain.id}
                type="button"
                className={`ai-mini-btn ${domainFilter === domain.id ? 'tone-soft-accent' : 'tone-pill'}`}
                aria-pressed={domainFilter === domain.id}
                onClick={() => setDomainFilter(domain.id)}
              >
                {domain.shortLabel} ({count})
              </button>
            )
          })}
        </div>

        <div className="ai-models-list">
          {filtered.map((model) => (
            <article className="ai-model-row" key={model.id}>
              <div className="ai-model-info">
                <div className="ai-model-title">
                  <strong>{model.name}</strong>
                  <span className="p-badge">{model.version}</span>
                  <span className="p-badge tone-soft-accent">{model.domainLabel}</span>
                  <span className={`p-badge ${model.enabledForStudents ? 'tone-soft-accent' : ''}`}>
                    {model.enabledForStudents ? 'Alumnos: activo' : 'Alumnos: apagado'}
                  </span>
                  <span className={`p-badge ${model.enabledForTeachers ? 'tone-soft-accent' : ''}`}>
                    {model.enabledForTeachers ? 'Docentes: activo' : 'Docentes: apagado'}
                  </span>
                </div>
                <small>{model.architecture}</small>
                <div className="ai-model-metrics">
                  <span>
                    Neuronas: {model.activeNeurons}/{model.totalNeurons}
                  </span>
                  <span>Épocas: {model.epochsTrained}</span>
                  <span>Precisión val: {model.valAccuracy.toFixed(1)}%</span>
                  <span>Loss val: {model.valLoss.toFixed(3)}</span>
                  <span>Latencia: {model.latencyMs} ms</span>
                  <span>Guardado: {formatDate(model.createdAt)}</span>
                </div>
              </div>

              <div className="ai-model-actions">
                <button
                  type="button"
                  className="ai-mini-btn tone-pill"
                  onClick={() => onLoadInTrainer(model)}
                >
                  <Upload size={15} aria-hidden="true" /> Cargar en laboratorio
                </button>
                <button
                  type="button"
                  className="ai-mini-btn tone-soft-accent"
                  onClick={onOpenAccess}
                >
                  <SlidersHorizontal size={15} aria-hidden="true" /> Configurar acceso
                </button>
                <button
                  type="button"
                  className="ai-mini-btn tone-danger"
                  disabled={models.length <= 1}
                  aria-label={`Eliminar ${model.name}`}
                  onClick={() => onDeleteModel(model.id)}
                >
                  <Trash2 size={15} aria-hidden="true" /> Eliminar
                </button>
              </div>
            </article>
          ))}
          {filtered.length === 0 && (
            <p className="p-meta">No hay modelos guardados en esta especialidad. Entrena y guarda uno desde la primera pestaña.</p>
          )}
        </div>
      </section>

      <section className="p-card ai-panel" aria-labelledby="ai-dataset-heading">
        <div className="p-card-head">
          <div>
            <h2 id="ai-dataset-heading">Dataset académico de ingeniería</h2>
            <p className="p-meta">
              Versión {dataset.version} · Verificado el {formatDate(dataset.lastVerifiedAt)}
            </p>
          </div>
          <button type="button" className="ai-mini-btn tone-pill" onClick={onValidateDataset}>
            <RefreshCw size={15} aria-hidden="true" /> Validar y reindexar dataset
          </button>
        </div>

        <div className="ai-dataset-grid">
          <div className="ai-kpi">
            <span>Registros seudonimizados</span>
            <strong>{dataset.records}</strong>
            <small>Eventos trazables</small>
          </div>
          <div className="ai-kpi">
            <span>Completitud</span>
            <strong>{dataset.completeness.toFixed(1)}%</strong>
            <small>Mínimo requerido: 98%</small>
          </div>
          <div className="ai-kpi">
            <span>Duplicados</span>
            <strong>{dataset.duplicates}</strong>
            <small>Deduplicación idempotente</small>
          </div>
          <div className="ai-kpi">
            <span>Corte temporal</span>
            <strong>
              {dataset.trainSplit}/{dataset.valSplit}/{dataset.testSplit}
            </strong>
            <small>
              <Database size={12} aria-hidden="true" /> Train / Val / Test
            </small>
          </div>
        </div>
      </section>
    </div>
  )
}
