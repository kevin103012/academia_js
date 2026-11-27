import { Eye, Plus } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { labCheck, moveItem, prepareLesson, splitLines, splitParagraphs } from '../../services'
import type { Lesson, LessonLabKind, Sublesson } from '../../types/learning'
import { createId } from '../../utils/id'
import { LessonContent } from '../learning/LessonContent'
import { BlockEditor, ItemTools } from './BlockEditor'
import '../../styles/course-editor.css'

interface LessonEditorProps {
  lesson: Lesson
  onSave: (lesson: Lesson) => void
  onCancel: () => void
}

const labOptions: { value: LessonLabKind; label: string }[] = [
  { value: 'circuit', label: 'Simulador lógico digital' },
  { value: 'matrix', label: 'Laboratorio Gauss-Jordan' },
  { value: 'architecture', label: 'Validador de arquitectura' },
]

export function LessonEditor({ lesson, onSave, onCancel }: LessonEditorProps) {
  const [draft, setDraft] = useState(lesson)
  const [reading, setReading] = useState(() => lesson.reading.join('\n\n'))
  const [steps, setSteps] = useState(() => lesson.keySteps?.join('\n') ?? '')
  const [errors, setErrors] = useState<string[]>([])
  const [preview, setPreview] = useState(false)
  const [confirmDiscard, setConfirmDiscard] = useState(false)
  const [initial] = useState(() => JSON.stringify([lesson, reading, steps]))
  // Los apartados opcionales arrancan abiertos solo si ya tienen contenido.
  const [extrasOpen] = useState(() => Boolean(lesson.keySteps?.length || lesson.formulaOrCode))
  const [labOpen] = useState(() => Boolean(lesson.exercise || lesson.labKind))
  const dirty = JSON.stringify([draft, reading, steps]) !== initial
  const sublessons = draft.sublessons ?? []

  const patch = (changes: Partial<Lesson>) => {
    setDraft((current) => ({ ...current, ...changes }))
    setConfirmDiscard(false)
  }
  const patchSublesson = (next: Sublesson) =>
    patch({ sublessons: sublessons.map((item) => (item.id === next.id ? next : item)) })
  const prepared = () => prepareLesson({ ...draft, reading: splitParagraphs(reading), keySteps: splitLines(steps) })

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const result = prepared()
    setErrors(result.errors)
    if (!result.errors.length) onSave(result.lesson)
  }

  if (preview) {
    return (
      <div className="p-card p-editor-panel">
        <div className="p-card-head">
          <h2>Vista previa</h2>
          <button type="button" className="p-button" onClick={() => setPreview(false)}>
            Seguir editando
          </button>
        </div>
        <p className="p-editor-hint">
          Así se verá el contenido. Aún no está guardado y los ejercicios no registran respuestas.
          {draft.labKind && ' El laboratorio aparece junto a la lección.'}
        </p>
        <div className="learn-root">
          <h2>{draft.title.trim() || 'Lección sin título'}</h2>
          <LessonContent lesson={prepared().lesson} answers={[]} />
        </div>
      </div>
    )
  }

  return (
    <form className="p-card p-form p-editor-panel le-form" onSubmit={submit} noValidate>
      <section className="le-section">
        <header className="le-head">
          <h2>Datos de la lección</h2>
          <p className="p-editor-hint">Lo primero que ve el alumno en la lista del curso.</p>
        </header>
        <div className="le-grid">
          <label>
            Título de la lección
            <input
              maxLength={120}
              placeholder="Ej. Compuertas lógicas y conductores"
              value={draft.title}
              onChange={(event) => patch({ title: event.target.value })}
            />
          </label>
          <label>
            Duración (minutos)
            <input
              type="number"
              min={1}
              max={600}
              value={Number.isNaN(draft.minutes) ? '' : draft.minutes}
              onChange={(event) => patch({ minutes: event.target.valueAsNumber })}
            />
          </label>
        </div>
        <label>
          Resumen
          <textarea
            rows={2}
            maxLength={300}
            placeholder="Una o dos frases sobre lo que aprenderá el alumno."
            value={draft.summary}
            onChange={(event) => patch({ summary: event.target.value })}
          />
          <span className="le-count">{(draft.summary ?? '').length}/300</span>
        </label>
      </section>

      <section className="le-section">
        <header className="le-head">
          <h2>Contenido</h2>
          <p className="p-editor-hint">Empieza por la teoría y añade videos o ejercicios en el orden en que los verá el alumno.</p>
        </header>
        <label>
          Teoría principal
          <span className="le-help">Separa los párrafos con una línea en blanco.</span>
          <textarea
            rows={7}
            maxLength={8000}
            value={reading}
            onChange={(event) => {
              setReading(event.target.value)
              setConfirmDiscard(false)
            }}
          />
        </label>
        <BlockEditor place="la lección" blocks={draft.blocks ?? []} onChange={(blocks) => patch({ blocks })} />

        <details className="le-more" open={extrasOpen}>
          <summary>
            Pasos clave y fórmula o código <small>Opcional</small>
          </summary>
          <div className="le-more-body">
            <label>
              Pasos clave
              <span className="le-help">Uno por línea.</span>
              <textarea
                rows={3}
                maxLength={2000}
                value={steps}
                onChange={(event) => {
                  setSteps(event.target.value)
                  setConfirmDiscard(false)
                }}
              />
            </label>
            <label>
              Fórmula o código
              <textarea
                rows={3}
                maxLength={4000}
                spellCheck={false}
                value={draft.formulaOrCode ?? ''}
                onChange={(event) => patch({ formulaOrCode: event.target.value })}
              />
            </label>
          </div>
        </details>
      </section>

      <section className="le-section">
        <header className="le-head">
          <h2>Sublecciones</h2>
          <p className="p-editor-hint">
            {sublessons.length ? 'Divide la lección en partes más cortas.' : 'Esta lección no tiene sublecciones.'}
          </p>
        </header>
        {sublessons.map((sublesson, index) => (
          <div className="le-block" role="group" aria-labelledby={`sublesson-${sublesson.id}`} key={sublesson.id}>
            <div className="le-block-head">
              <span className="le-kind" id={`sublesson-${sublesson.id}`}>
                Sublección {index + 1}
              </span>
              <ItemTools
                label={`la sublección ${index + 1}`}
                index={index}
                count={sublessons.length}
                onMove={(direction) => patch({ sublessons: moveItem(sublessons, index, direction) })}
                onRemove={() => patch({ sublessons: sublessons.filter((item) => item.id !== sublesson.id) })}
              />
            </div>
            <label>
              Título de la sublección
              <input
                maxLength={120}
                value={sublesson.title}
                onChange={(event) => patchSublesson({ ...sublesson, title: event.target.value })}
              />
            </label>
            <BlockEditor
              place={`la sublección ${index + 1}`}
              blocks={sublesson.blocks}
              onChange={(blocks) => patchSublesson({ ...sublesson, blocks })}
            />
          </div>
        ))}
        <button
          type="button"
          className="p-button le-inline-button"
          onClick={() => patch({ sublessons: [...sublessons, { id: createId(), title: '', blocks: [] }] })}
        >
          <Plus size={15} aria-hidden="true" /> Añadir sublección
        </button>
      </section>

      <details className="le-more" open={labOpen}>
        <summary>
          Reto y laboratorio <small>Opcional</small>
        </summary>
        <div className="le-more-body">
          <label>
            Reto de la lección
            <textarea rows={2} maxLength={600} value={draft.exercise} onChange={(event) => patch({ exercise: event.target.value })} />
          </label>
          <label>
            Laboratorio interactivo
            <select
              value={draft.labKind ?? ''}
              onChange={(event) => patch({ labKind: (event.target.value || undefined) as LessonLabKind | undefined })}
            >
              <option value="">Sin laboratorio</option>
              {labOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          {draft.labKind && (
            <>
              <p className="p-editor-hint">{labCheck(draft.id, draft.labKind)} Esta comprobación no es editable.</p>
              <div className="le-grid le-grid-even">
                <label>
                  Objetivo del laboratorio
                  <input maxLength={300} value={draft.labGoal ?? ''} onChange={(event) => patch({ labGoal: event.target.value })} />
                </label>
                <label>
                  Pista
                  <input maxLength={300} value={draft.labHint ?? ''} onChange={(event) => patch({ labHint: event.target.value })} />
                </label>
              </div>
            </>
          )}
        </div>
      </details>

      {errors.length > 0 && (
        <div className="p-warning" role="alert">
          <ul className="p-editor-errors">
            {errors.map((error) => (
              <li key={error}>{error}</li>
            ))}
          </ul>
        </div>
      )}

      <div className="le-bar">
        <button type="submit" className="p-button p-button-primary">
          Guardar lección
        </button>
        <button type="button" className="p-button le-inline-button" onClick={() => setPreview(true)}>
          <Eye size={15} aria-hidden="true" /> Vista previa
        </button>
        <button
          type="button"
          className={`p-button${confirmDiscard ? ' tone-danger' : ''}`}
          onClick={() => (!dirty || confirmDiscard ? onCancel() : setConfirmDiscard(true))}
        >
          {confirmDiscard ? 'Confirmar: descartar cambios' : 'Cancelar'}
        </button>
        {dirty && (
          <small className="le-dirty" aria-live="polite">
            Cambios sin guardar
          </small>
        )}
      </div>
    </form>
  )
}
