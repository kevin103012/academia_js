import { useState } from 'react'
import { Power, SlidersHorizontal, Upload } from 'lucide-react'
import { aiDomains } from '../../data/aiSeed'
import { aiOutputFormats } from '../../data/aiTrainingSources'
import type { AiDomainId, AiTrainedModel } from '../../types/ai'

interface TrainedModelsSubmoduleProps {
  models: AiTrainedModel[]
  onLoadInTrainer: (model: AiTrainedModel) => void
  onOpenAccess: () => void
  onToggleActive: (id: string) => void
  onChangeArea: (id: string, area: string) => void
}

export function TrainedModelsSubmodule({
  models,
  onLoadInTrainer,
  onOpenAccess,
  onToggleActive,
  onChangeArea,
}: TrainedModelsSubmoduleProps) {
  const [domainFilter, setDomainFilter] = useState<AiDomainId | 'all'>('all')
  const filtered = domainFilter === 'all' ? models : models.filter((model) => model.domain === domainFilter)

  return (
    <section className="ai-model-library" aria-label="Biblioteca de modelos">
      <div className="p-section-heading">
        <label className="ai-library-filter">
          Especialidad
          <select value={domainFilter} onChange={(event) => setDomainFilter(event.target.value as AiDomainId | 'all')}>
            <option value="all">Todas</option>
            {aiDomains.map((domain) => <option key={domain.id} value={domain.id}>{domain.label}</option>)}
          </select>
        </label>
        <button type="button" className="p-button" onClick={onOpenAccess}>
          <SlidersHorizontal size={16} aria-hidden="true" /> Acceso por rol
        </button>
      </div>
      {filtered.map((model) => (
        <article className="ai-library-model" key={model.id}>
          <div>
            <div className="ai-model-title">
              <h2>{model.name}</h2>
              <span className="p-meta">{model.version}</span>
            </div>
            <p className="p-meta">{model.domainLabel} · {aiOutputFormats[model.outputFormat ?? 'explanation']}</p>
            <details>
              <summary>Configuración del laboratorio</summary>
              <p className="p-meta">{model.inputDataset ?? 'Ejemplos de la especialidad'} · {model.epochsTrained} épocas simuladas</p>
              <label className="ai-library-filter">
                Área de destino
                <input
                  type="text"
                  maxLength={64}
                  key={model.targetArea}
                  defaultValue={model.targetArea ?? model.domainLabel}
                  onBlur={(event) => {
                    const next = event.currentTarget.value.trim() || model.domainLabel
                    event.currentTarget.value = next
                    if (next !== (model.targetArea ?? model.domainLabel)) onChangeArea(model.id, next)
                  }}
                />
              </label>
            </details>
          </div>
          <div className="ai-model-actions">
            <button type="button" className="p-button p-button-short" onClick={() => onLoadInTrainer(model)}>
              <Upload size={15} aria-hidden="true" /> Abrir en laboratorio
            </button>
            <button
              type="button"
              className={model.isActive === false ? 'ai-mini-btn tone-pill' : 'ai-mini-btn tone-soft-accent'}
              aria-label={model.isActive === false ? 'Activar ' + model.name : 'Desactivar ' + model.name}
              onClick={() => onToggleActive(model.id)}
            >
              <Power size={15} aria-hidden="true" /> {model.isActive === false ? 'Inactivo' : 'Activo'}
            </button>
          </div>
        </article>
      ))}
      {filtered.length === 0 && <p className="p-meta">No hay modelos guardados para esta especialidad.</p>}
    </section>
  )
}
