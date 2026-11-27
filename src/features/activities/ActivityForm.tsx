import type { FormEvent } from 'react'
import type { Activity } from '../../types/workspace'
import { dateKey } from '../../utils/date'

export type ActivityDraft = Pick<Activity, 'title' | 'instructions' | 'due'>

interface ActivityFormProps {
  heading: string
  submitLabel: string
  initial?: ActivityDraft
  onSave: (draft: ActivityDraft) => void
  onCancel?: () => void
}

export function ActivityForm({ heading, submitLabel, initial, onSave, onCancel }: ActivityFormProps) {
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    const title = String(form.get('title') ?? '').trim()
    const instructions = String(form.get('instructions') ?? '').trim()
    const due = String(form.get('due') ?? '')
    if (!title || !instructions || !due) return
    onSave({ title, instructions, due })
  }

  return (
    <form className="p-form p-form-plain" onSubmit={submit}>
      <h2>{heading}</h2>
      <label>
        Título
        <input name="title" required maxLength={100} defaultValue={initial?.title} />
      </label>
      <label>
        Fecha de entrega
        <input name="due" type="date" defaultValue={initial?.due ?? dateKey()} required />
      </label>
      <label>
        Indicaciones
        <textarea name="instructions" rows={4} required maxLength={2000} defaultValue={initial?.instructions} />
      </label>
      <button className="p-button p-button-primary" type="submit">
        {submitLabel}
      </button>
      {onCancel && (
        <button className="p-button" type="button" onClick={onCancel}>
          Cancelar
        </button>
      )}
    </form>
  )
}
