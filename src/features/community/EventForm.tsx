import { useState, type FormEvent } from 'react'
import { demoUsers } from '../../data/demoUsers'
import type { DemoUser } from '../../types/auth'
import { eventCategories, type CalendarEvent, type EventAudience, type EventCategory } from '../../types/workspace'

export type EventDraft = Omit<CalendarEvent, 'id' | 'createdById' | 'createdByName'>

interface EventFormProps {
  user: DemoUser
  defaultDate: string
  onSave: (draft: EventDraft) => void
}

export function EventForm({ user, defaultDate, onSave }: EventFormProps) {
  const [audience, setAudience] = useState<EventAudience>('private')
  const [participantIds, setParticipantIds] = useState<string[]>([])
  const [error, setError] = useState('')
  const people = demoUsers.filter((person) => person.id !== user.id)

  function toggle(id: string) {
    setParticipantIds((current) => (current.includes(id) ? current.filter((item) => item !== id) : [...current, id]))
    setError('')
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const data = new FormData(event.currentTarget)
    const value = (key: string) => String(data.get(key) ?? '').trim()
    const draft: EventDraft = {
      title: value('title'),
      category: value('category') as EventCategory,
      location: value('location'),
      date: value('date'),
      time: value('time'),
      endTime: value('endTime'),
      audience,
      participantIds: audience === 'invited' ? participantIds : [],
    }
    if (!draft.title || !draft.category || !draft.location || !draft.date || !draft.time || !draft.endTime) {
      setError('Completa todos los campos.')
      return
    }
    if (draft.endTime <= draft.time) {
      setError('La hora de fin debe ser posterior a la hora de inicio.')
      return
    }
    if (audience === 'invited' && !participantIds.length) {
      setError('Selecciona al menos una persona para citar.')
      return
    }
    onSave(draft)
  }

  return (
    <form className="p-card p-form" onSubmit={submit} onChange={() => setError('')}>
      <h2>Agendar actividad o cita</h2>
      <label>
        Título
        <input name="title" required maxLength={100} />
      </label>
      <div className="p-form-row">
        <label>
          Categoría
          <select name="category" required defaultValue="">
            <option value="" disabled>
              Selecciona una categoría
            </option>
            {eventCategories.map((category) => (
              <option key={category}>{category}</option>
            ))}
          </select>
        </label>
        <label>
          Lugar
          <input name="location" required maxLength={100} placeholder="Aula, laboratorio o enlace" />
        </label>
      </div>
      <label>
        Fecha
        <input type="date" name="date" defaultValue={defaultDate} required />
      </label>
      <div className="p-form-row">
        <label>
          Hora de inicio
          <input type="time" name="time" required />
        </label>
        <label>
          Hora de fin
          <input type="time" name="endTime" required />
        </label>
      </div>
      <label>
        Para quién
        <select value={audience} onChange={(event) => setAudience(event.target.value as EventAudience)}>
          <option value="private">Solo para mí</option>
          <option value="invited">Citar a personas</option>
          {user.role !== 'student' && <option value="campus">Todo el campus</option>}
        </select>
      </label>
      {audience === 'invited' && (
        <fieldset className="p-participants">
          <legend>Personas citadas</legend>
          {people.map((person) => (
            <label key={person.id}>
              <input type="checkbox" checked={participantIds.includes(person.id)} onChange={() => toggle(person.id)} />
              <span>
                {person.name} · {person.roleLabel}
              </span>
            </label>
          ))}
        </fieldset>
      )}
      {error && (
        <p className="p-warning" role="alert">
          {error}
        </p>
      )}
      <button className="p-button p-button-primary" type="submit">
        Guardar
      </button>
    </form>
  )
}
