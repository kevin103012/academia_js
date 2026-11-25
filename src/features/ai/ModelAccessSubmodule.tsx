import { useState, type FormEvent } from 'react'
import { BookOpen, Check, GraduationCap, Power, ShieldCheck } from 'lucide-react'
import type { AiGuardrailsConfig, AiTrainedModel } from '../../types/ai'

interface ModelAccessSubmoduleProps {
  config: AiGuardrailsConfig
  models: AiTrainedModel[]
  onSaveConfig: (next: AiGuardrailsConfig) => void
  onToggleRoleAccess: (modelId: string, role: 'student' | 'teacher') => void
}

const policySwitches: {
  key: keyof Pick<
    AiGuardrailsConfig,
    | 'studentGlobalEnabled'
    | 'teacherGlobalEnabled'
    | 'stepByStepStudentMode'
    | 'humanReviewRequired'
    | 'strictPseudonymization'
  >
  title: string
  description: string
}[] = [
  {
    key: 'studentGlobalEnabled',
    title: 'Habilitar motor de IA para Alumnos',
    description: 'Interruptor maestro: si está apagado, ningún alumno verá asistentes especializados en el Tutor.',
  },
  {
    key: 'teacherGlobalEnabled',
    title: 'Habilitar copiloto de IA para Docentes',
    description: 'Permite a docentes y coordinación usar modelos activos para preparar clases y analizar brechas.',
  },
  {
    key: 'stepByStepStudentMode',
    title: 'Modo socrático paso a paso para Alumnos',
    description: 'En Álgebra Lineal y Código guía con pistas y pasos intermedios sin entregar la solución final directa.',
  },
  {
    key: 'humanReviewRequired',
    title: 'Revisión docente obligatoria en alertas académicas',
    description: 'Impide calificaciones o decisiones automáticas sin validación de un docente.',
  },
  {
    key: 'strictPseudonymization',
    title: 'Seudonimización estricta en inferencia (Ley N.° 29733)',
    description: 'Excluye identificadores directos del estudiante al consultar los modelos entrenados.',
  },
]

export function ModelAccessSubmodule({
  config,
  models,
  onSaveConfig,
  onToggleRoleAccess,
}: ModelAccessSubmoduleProps) {
  const [draft, setDraft] = useState<AiGuardrailsConfig>(config)

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    onSaveConfig(draft)
  }

  return (
    <div className="ai-root">
      <section className="p-card ai-panel" aria-labelledby="ai-role-matrix-heading">
        <div className="p-card-head">
          <div>
            <h2 id="ai-role-matrix-heading">Control de activación por modelo entrenado</h2>
            <p className="p-meta">
              Activa o apaga cada modelo especializado de forma independiente para Alumnos y para Docentes.
            </p>
          </div>
          <span className="p-badge tone-soft-accent">
            <ShieldCheck size={14} aria-hidden="true" /> Control por rol
          </span>
        </div>

        <div className="ai-models-list">
          {models.map((model) => (
            <article className="ai-model-row" key={model.id}>
              <div className="ai-model-info">
                <div className="ai-model-title">
                  <strong>{model.name}</strong>
                  <span className="p-badge">{model.version}</span>
                  <span className="p-badge tone-soft-accent">{model.domainLabel}</span>
                </div>
                <div className="ai-model-metrics">
                  <span>
                    Neuronas: {model.activeNeurons}/{model.totalNeurons}
                  </span>
                  <span>Precisión val: {model.valAccuracy.toFixed(1)}%</span>
                </div>
              </div>

              <div className="ai-role-toggles" role="group" aria-label={`Acceso de ${model.name}`}>
                <button
                  type="button"
                  className={`ai-mini-btn ${model.enabledForStudents ? 'tone-soft-accent' : 'tone-pill'}`}
                  aria-pressed={model.enabledForStudents}
                  onClick={() => onToggleRoleAccess(model.id, 'student')}
                >
                  <GraduationCap size={15} aria-hidden="true" />
                  <span>{model.enabledForStudents ? 'Activo para alumnos' : 'Apagado para alumnos'}</span>
                  <Power size={13} aria-hidden="true" />
                </button>
                <button
                  type="button"
                  className={`ai-mini-btn ${model.enabledForTeachers ? 'tone-soft-accent' : 'tone-pill'}`}
                  aria-pressed={model.enabledForTeachers}
                  onClick={() => onToggleRoleAccess(model.id, 'teacher')}
                >
                  <BookOpen size={15} aria-hidden="true" />
                  <span>{model.enabledForTeachers ? 'Activo para docentes' : 'Apagado para docentes'}</span>
                  <Power size={13} aria-hidden="true" />
                </button>
              </div>
            </article>
          ))}
        </div>
      </section>

      <form className="p-card ai-panel" onSubmit={handleSubmit} aria-labelledby="ai-policy-heading">
        <div className="p-card-head">
          <div>
            <h2 id="ai-policy-heading">Políticas globales y guardrails</h2>
            <p className="p-meta">Define interruptores maestros por rol, umbral mínimo de confianza y seguridad.</p>
          </div>
        </div>

        <div className="ai-config-grid">
          <div className="ai-range-wrap">
            <label htmlFor="ai-min-confidence">
              Umbral de confianza para respuestas ({draft.minConfidence}%)
            </label>
            <input
              id="ai-min-confidence"
              type="range"
              min={50}
              max={95}
              step={1}
              value={draft.minConfidence}
              onChange={(event) => setDraft({ ...draft, minConfidence: Number(event.target.value) })}
            />
          </div>

          <label>
            Sensibilidad de alerta académica
            <select
              value={draft.riskSensitivity}
              onChange={(event) =>
                setDraft({ ...draft, riskSensitivity: event.target.value as AiGuardrailsConfig['riskSensitivity'] })
              }
            >
              <option value="baja">Baja (solo señales sostenidas)</option>
              <option value="media">Media (equilibrio recomendado)</option>
              <option value="alta">Alta (acompañamiento preventivo)</option>
            </select>
          </label>

          <label>
            Sugerencias máximas por sesión
            <input
              type="number"
              min={1}
              max={10}
              value={draft.maxDailySuggestions}
              onChange={(event) =>
                setDraft({ ...draft, maxDailySuggestions: Math.min(10, Math.max(1, Number(event.target.value) || 1)) })
              }
            />
          </label>
        </div>

        <div className="ai-guardrail-list" role="group" aria-label="Políticas globales por perfil">
          {policySwitches.map((item) => {
            const active = draft[item.key]
            return (
              <div className="ai-guardrail-item" key={item.key}>
                <div>
                  <strong>{item.title}</strong>
                  <small>{item.description}</small>
                </div>
                <button
                  type="button"
                  className={`ai-mini-btn ${active ? 'tone-soft-accent' : 'tone-pill'}`}
                  aria-pressed={active}
                  onClick={() => setDraft({ ...draft, [item.key]: !active })}
                >
                  {active ? (
                    <>
                      <Check size={15} aria-hidden="true" /> Activo
                    </>
                  ) : (
                    'Desactivado'
                  )}
                </button>
              </div>
            )
          })}
        </div>

        <div className="ai-actions-row">
          <button type="submit" className="p-button tone-accent">
            Guardar políticas globales
          </button>
        </div>
      </form>
    </div>
  )
}
