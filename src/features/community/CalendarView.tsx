import { CalendarDays, ChevronLeft, ChevronRight, Clock3, MapPin, Plus, X } from 'lucide-react'
import { useState } from 'react'
import type { DemoUser } from '../../types/auth'
import { demoUsers } from '../../data/demoUsers'
import type { CalendarEvent, Commit, Workspace } from '../../types/workspace'
import { byDateAndTime, canSeeEvent, isUpcoming, timeRange } from '../../utils/calendar'
import { dateAt, dateKey, formatDate, readDate } from '../../utils/date'
import { createId } from '../../utils/id'
import { EventForm, type EventDraft } from './EventForm'

interface CalendarViewProps {
  user: DemoUser
  workspace: Workspace
  commit: Commit
}

const daysOfWeek = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom']
const upcomingDays = 14

function audienceLabel(event: CalendarEvent, userId: string) {
  if (event.audience === 'private') return 'Solo tú'
  if (event.audience !== 'invited') return 'Todo el campus'
  if (event.createdById !== userId) return `Te citó ${event.createdByName ?? 'otra persona'}`
  const names = demoUsers.filter((person) => event.participantIds?.includes(person.id)).map((person) => person.name)
  return `Citaste a ${names.join(', ')}`
}

export function CalendarView({ user, workspace, commit }: CalendarViewProps) {
  const today = dateKey()
  const [selected, setSelected] = useState(today)
  const [month, setMonth] = useState(today.slice(0, 7))
  const [adding, setAdding] = useState(false)
  const [confirmId, setConfirmId] = useState<string>()
  const visibleEvents = workspace.events.filter((event) => canSeeEvent(event, user.id))
  const first = readDate(`${month}-01`)
  const lead = (first.getDay() + 6) % 7
  const dayCount = new Date(first.getFullYear(), first.getMonth() + 1, 0).getDate()
  const weekCells = Math.ceil((lead + dayCount) / 7) * 7
  const events = visibleEvents.filter((event) => event.date.split('-').slice(0, 2).join('-') === month)
  // Fechas académicas: entregas de actividades y evaluaciones de curso.
  const deadlines = [
    ...workspace.activities.map((activity) => ({
      key: `activity-${activity.id}`,
      date: activity.due,
      title: activity.title,
      category: 'Entrega',
      label: 'Fecha de entrega',
      detail: workspace.courses.find((course) => course.id === activity.courseId)?.name ?? 'Actividad de curso',
    })),
    ...workspace.courses.flatMap((course) =>
      course.assessmentDate
        ? [
            {
              key: `assessment-${course.id}`,
              date: course.assessmentDate,
              title: `Evaluación: ${course.name}`,
              category: 'Evaluación',
              label: 'Evaluación del curso',
              detail: course.name,
            },
          ]
        : [],
    ),
  ]
  const monthDeadlines = deadlines.filter((item) => item.date.slice(0, 7) === month)
  const activeEvents = events
    .filter((event) => event.date === selected)
    .sort((a, b) => a.time.localeCompare(b.time))
  const activeDeadlines = monthDeadlines.filter((item) => item.date === selected)

  function changeMonth(offset: number) {
    const next = new Date(first.getFullYear(), first.getMonth() + offset, 1)
    const key = dateKey(next)
    setMonth(key.slice(0, 7))
    setSelected(key)
  }

  const limit = dateAt(upcomingDays)
  const upcoming = [
    ...visibleEvents
      .filter((event) => isUpcoming(event) && event.date <= limit)
      .map((event) => ({
        key: event.id,
        date: event.date,
        time: event.time,
        title: event.title,
        category: event.category ?? 'Otro',
        detail: `${timeRange(event)} · ${event.location}`,
      })),
    ...deadlines
      .filter((item) => item.date >= today && item.date <= limit)
      .map((item) => ({ ...item, time: '23:59' })),
  ].sort(byDateAndTime)

  function showDate(date: string) {
    setMonth(date.slice(0, 7))
    setSelected(date)
  }

  // El historial lo ve el personal: no se anotan títulos de eventos personales ni citas.
  const auditText = (verb: string, event: { audience?: string; title: string }) =>
    event.audience === 'private' || event.audience === 'invited'
      ? `${verb} una actividad en su calendario`
      : `${verb} «${event.title}»`

  function addEvent(draft: EventDraft) {
    const item: CalendarEvent = { ...draft, id: createId(), createdById: user.id, createdByName: user.name }
    commit(auditText('Programó', item), (current) => ({ ...current, events: [...current.events, item] }))
    showDate(item.date)
    setAdding(false)
  }

  function removeEvent(item: CalendarEvent) {
    if (item.createdById !== user.id) return
    commit(auditText('Eliminó', item), (current) => ({
      ...current,
      events: current.events.filter((event) => event.id !== item.id),
    }))
    setConfirmId(undefined)
  }

  return (
    <section>
      <header className="p-section-heading">
        <div>
          <h1>Calendario</h1>
          <p>Agenda tus actividades, cita a otras personas y revisa entregas y evaluaciones.</p>
        </div>
        <button className="p-button p-button-primary" onClick={() => setAdding(!adding)}>
          {adding ? 'Cancelar' : 'Agendar'}
          {adding ? <X size={17} /> : <Plus size={17} />}
        </button>
      </header>
      {adding && <EventForm user={user} defaultDate={selected} onSave={addEvent} />}
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
                monthDeadlines.filter((item) => item.date === key).length
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
          {activeEvents.length === 0 && activeDeadlines.length === 0 && (
            <div className="p-empty">
              <CalendarDays size={26} />
              <p>No hay eventos, entregas ni evaluaciones este día.</p>
            </div>
          )}
          {activeEvents.map((event) => (
            <article key={event.id}>
              <h3>{event.title}</h3>
              <span className="p-badge tone-soft-accent">{event.category ?? 'Otro'}</span>
              <p className="p-meta">
                <Clock3 size={15} /> {timeRange(event)}
              </p>
              <p className="p-meta">
                <MapPin size={15} /> {event.location}
              </p>
              <p className="p-meta">{audienceLabel(event, user.id)}</p>
              {event.createdById === user.id && (
                <button
                  type="button"
                  className="p-button p-button-short tone-danger"
                  onClick={() => (confirmId === event.id ? removeEvent(event) : setConfirmId(event.id))}
                >
                  {confirmId === event.id ? 'Confirmar eliminación' : 'Eliminar'}
                </button>
              )}
            </article>
          ))}
          {activeDeadlines.map((item) => (
            <article key={item.key}>
              <h3>{item.title}</h3>
              <span className="p-badge">{item.label}</span>
            </article>
          ))}
        </div>
      </div>
      <section className="p-card p-upcoming" aria-labelledby="upcoming-heading">
        <h2 id="upcoming-heading">Actividades cercanas</h2>
        <p className="p-meta">De hoy a los próximos {upcomingDays} días.</p>
        {upcoming.length === 0 && (
          <div className="p-empty">
            <CalendarDays size={26} />
            <p>No tienes actividades cercanas.</p>
          </div>
        )}
        {upcoming.map((item) => (
          <button type="button" className="p-list-action" key={item.key} onClick={() => showDate(item.date)}>
            <span className="p-list-copy">
              <strong>{item.title}</strong>
              <small>
                {formatDate(item.date, { weekday: 'short', day: 'numeric', month: 'short' })} · {item.detail}
              </small>
            </span>
            <span className="p-badge">{item.category}</span>
          </button>
        ))}
      </section>
    </section>
  )
}
