import { CalendarDays, ChevronLeft, ChevronRight, Clock3, MapPin, Plus, X } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import type { DemoUser } from '../../types/auth'
import type { Commit, Workspace } from '../../types/workspace'
import { dateKey, formatDate, readDate } from '../../utils/date'
import { createId } from '../../utils/id'

interface CalendarViewProps {
  user: DemoUser
  workspace: Workspace
  commit: Commit
}

const daysOfWeek = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom']

export function CalendarView({ user, workspace, commit }: CalendarViewProps) {
  const today = dateKey()
  const [selected, setSelected] = useState(today)
  const [month, setMonth] = useState(today.slice(0, 7))
  const [adding, setAdding] = useState(false)
  const canPublish = user.role !== 'student'
  const first = readDate(`${month}-01`)
  const lead = (first.getDay() + 6) % 7
  const dayCount = new Date(first.getFullYear(), first.getMonth() + 1, 0).getDate()
  const weekCells = Math.ceil((lead + dayCount) / 7) * 7
  const events = workspace.events.filter((event) => event.date.split('-').slice(0, 2).join('-') === month)
  const dueActivities = workspace.activities.filter((activity) => activity.due.slice(0, 7) === month)
  const activeEvents = events
    .filter((event) => event.date === selected)
    .sort((a, b) => a.time.localeCompare(b.time))
  const activeActivities = dueActivities.filter((activity) => activity.due === selected)

  function changeMonth(offset: number) {
    const next = new Date(first.getFullYear(), first.getMonth() + offset, 1)
    const key = dateKey(next)
    setMonth(key.slice(0, 7))
    setSelected(key)
  }

  function addEvent(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    const title = String(form.get('title') ?? '').trim()
    const location = String(form.get('location') ?? '').trim()
    const date = String(form.get('date') ?? '')
    const time = String(form.get('time') ?? '')
    if (!title || !date || !time || !location) return
    const item = { id: createId(), title, date, time, location }
    commit(`Programó «${title}»`, (current) => ({ ...current, events: [...current.events, item] }))
    setMonth(date.slice(0, 7))
    setSelected(date)
    setAdding(false)
  }

  return (
    <section>
      <header className="p-section-heading">
        <div>
          <h1>Calendario</h1>
          <p>Consulta las fechas de entrega y los encuentros de tu aula.</p>
        </div>
        {canPublish && (
          <button className="p-button p-button-primary" onClick={() => setAdding(!adding)}>
            {adding ? 'Cancelar' : 'Nuevo evento'}
            {adding ? <X size={17} /> : <Plus size={17} />}
          </button>
        )}
      </header>
      {adding && (
        <form className="p-card p-form" onSubmit={addEvent}>
          <h2>Programar evento</h2>
          <label>
            Nombre
            <input name="title" required maxLength={100} />
          </label>
          <div className="p-form-row">
            <label>
              Fecha
              <input type="date" name="date" defaultValue={selected} required />
            </label>
            <label>
              Hora
              <input type="time" name="time" required />
            </label>
          </div>
          <label>
            Lugar
            <input name="location" required maxLength={100} />
          </label>
          <button className="p-button p-button-primary" type="submit">
            Guardar evento
          </button>
        </form>
      )}
      <div className="p-calendar-layout">
        <div className="p-card p-calendar">
          <div className="p-calendar-head">
            <h2>{formatDate(`${month}-01`, { month: 'long', year: 'numeric' })}</h2>
            <div className="p-calendar-controls">
              <button
                className="p-button p-button-short"
                onClick={() => {
                  setMonth(today.slice(0, 7))
                  setSelected(today)
                }}
              >
                Hoy
              </button>
              <button className="p-icon-button" aria-label="Mes anterior" onClick={() => changeMonth(-1)}>
                <ChevronLeft size={19} />
              </button>
              <button className="p-icon-button" aria-label="Mes siguiente" onClick={() => changeMonth(1)}>
                <ChevronRight size={19} />
              </button>
            </div>
          </div>
          <div className="p-calendar-grid">
            {daysOfWeek.map((day) => (
              <span className="p-calendar-week" key={day}>
                {day}
              </span>
            ))}
            {Array.from({ length: weekCells }, (_, index) => {
              const day = index - lead + 1
              if (day < 1 || day > dayCount) return <span className="p-calendar-day p-calendar-blank" key={`blank-${index}`} />
              const key = `${month}-${String(day).padStart(2, '0')}`
              const count =
                events.filter((event) => event.date === key).length +
                dueActivities.filter((activity) => activity.due === key).length
              const label =
                formatDate(key, { day: 'numeric', month: 'long' }) +
                (count > 0 ? `, ${count}${count === 1 ? ' entrada' : ' entradas'}` : '')
              return (
                <button
                  className="p-calendar-day"
                  key={key}
                  aria-pressed={key === selected}
                  aria-label={label}
                  aria-current={key === today ? 'date' : undefined}
                  onClick={() => setSelected(key)}
                >
                  <span>{day}</span>
                  {count > 0 && <i aria-hidden="true" />}
                </button>
              )
            })}
          </div>
        </div>
        <div className="p-card p-calendar-agenda">
          <h2>{formatDate(selected, { weekday: 'long', day: 'numeric', month: 'long' })}</h2>
          {activeEvents.length === 0 && activeActivities.length === 0 && (
            <div className="p-empty">
              <CalendarDays size={26} />
              <p>No hay eventos ni entregas este día.</p>
            </div>
          )}
          {activeEvents.map((event) => (
            <article key={event.id}>
              <h3>{event.title}</h3>
              <p className="p-meta">
                <Clock3 size={15} /> {event.time}
              </p>
              <p className="p-meta">
                <MapPin size={15} /> {event.location}
              </p>
            </article>
          ))}
          {activeActivities.map((activity) => (
            <article key={activity.id}>
              <h3>{activity.title}</h3>
              <span className="p-badge">Fecha de entrega</span>
            </article>
          ))}
        </div>
      </div>
    </section>
  )
}
