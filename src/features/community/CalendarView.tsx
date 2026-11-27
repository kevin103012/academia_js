import { CalendarDays, ChevronLeft, ChevronRight, Clock3, MapPin, Plus, X } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { env } from '../../config/env'
import { localStore } from '../../services/storage/localStore'
import type { DemoRole, DemoUser } from '../../types/auth'
import type { CalendarCategory, CalendarEvent, CalendarScope, Commit, Workspace } from '../../types/workspace'
import { canSeeCalendarEvent, canSeeCourse } from '../../utils/campusAccess'
import { dateAt, dateKey, formatDate, readDate } from '../../utils/date'
import { createId } from '../../utils/id'

interface CalendarViewProps {
  user: DemoUser
  workspace: Workspace
  commit: Commit
}

const daysOfWeek = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom']
const categoryLabels: Record<CalendarCategory, string> = {
  clase: 'Clase', evaluacion: 'Evaluación', estudio: 'Estudio', laboratorio: 'Laboratorio',
  institucional: 'Institucional', personal: 'Personal',
}
const roleLabels: Record<DemoRole, string> = { student: 'Alumnos', teacher: 'Docentes', coordinator: 'Coordinación', admin: 'Administración' }

function eventTime(event: CalendarEvent) {
  return event.time + (event.endTime && event.endTime !== event.time ? ' – ' + event.endTime : '')
}

export function CalendarView({ user, workspace, commit }: CalendarViewProps) {
  const today = dateKey()
  const [selected, setSelected] = useState(today)
  const [month, setMonth] = useState(today.slice(0, 7))
  const [adding, setAdding] = useState(false)
  const [scope, setScope] = useState<CalendarScope>('personal')
  const [error, setError] = useState('')
  const privateKey = 'junior-sparks:calendar-personal:v1:' + user.id
  const [personal, setPersonal] = useState<CalendarEvent[]>(() => localStore.getJson<CalendarEvent[]>(privateKey) ?? [])
  const isManagement = user.role === 'admin' || user.role === 'coordinator'
  const eligibleCourses = workspace.courses.filter((course) => canSeeCourse(user, workspace, course.id))
  const blocks = [...new Set(workspace.courses.map((course) => course.group))].sort()
  const first = readDate(`${month}-01`)
  const lead = (first.getDay() + 6) % 7
  const dayCount = new Date(first.getFullYear(), first.getMonth() + 1, 0).getDate()
  const weekCells = Math.ceil((lead + dayCount) / 7) * 7
  const allEvents = [...workspace.events, ...personal].filter((event) => canSeeCalendarEvent(user, workspace, event))
  const visibleActivities = workspace.activities.filter((activity) => canSeeCourse(user, workspace, activity.courseId))
  const events = allEvents.filter((event) => event.date.startsWith(month))
  const dueActivities = visibleActivities.filter((activity) => activity.due.startsWith(month))
  const activeEvents = events
    .filter((event) => event.date === selected)
    .sort((a, b) => a.time.localeCompare(b.time))
  const activeActivities = dueActivities.filter((activity) => activity.due === selected)
  const now = new Date()
  const timeNow = String(now.getHours()).padStart(2, '0') + ':' + String(now.getMinutes()).padStart(2, '0')
  const upcoming = [
    ...allEvents.filter((event) => event.date !== today || (event.endTime ?? event.time) >= timeNow)
      .map((event) => ({ id: event.id, title: event.title, date: event.date, time: event.time, detail: eventTime(event) + ' · ' + event.location })),
    ...visibleActivities.map((activity) => ({ id: activity.id, title: activity.title, date: activity.due, time: '23:59', detail: 'Fecha de entrega' })),
  ].filter((entry) => entry.date >= today && entry.date <= dateAt(7))
    .sort((a, b) => a.date.localeCompare(b.date) || a.time.localeCompare(b.time))

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
    const endTime = String(form.get('endTime') ?? '')
    const category = String(form.get('category') ?? 'personal') as CalendarCategory
    if (!title || !date || !time || !endTime || !location) return
    if (endTime <= time) {
      setError('La hora de fin debe ser posterior a la hora de inicio.')
      return
    }
    const target = String(form.get('target') ?? '')
    const course = eligibleCourses.find((item) => item.id === target)
    const role = target as DemoRole
    if ((scope === 'course' && !course) || (scope === 'block' && !blocks.includes(target)) ||
      (scope === 'role' && !Object.hasOwn(roleLabels, role))) return
    const audience = scope === 'course' ? course?.name
      : scope === 'block' ? target
      : scope === 'role' ? roleLabels[role]
      : scope === 'personal' ? 'Solo yo' : 'Toda la comunidad'
    const item: CalendarEvent = {
      id: createId(), title, date, time, endTime, location, category, audience, visibility: scope, ownerId: user.id,
      targetCourseId: scope === 'course' ? target : undefined,
      targetBlock: scope === 'block' ? target : undefined,
      targetRole: scope === 'role' ? role : undefined,
    }
    if (scope === 'personal' && !env.hasSupabase) {
      const next = [...personal, item]
      if (!localStore.setJson(privateKey, next)) {
        setError('No se pudo guardar el evento personal en este navegador.')
        return
      }
      setPersonal(next)
    } else {
      commit(scope === 'personal' ? 'Programó un evento personal' : `Programó «${title}»`, (current) => ({
        ...current, events: [...current.events, item],
      }))
    }
    setError('')
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
          <button className="p-button p-button-primary" onClick={() => { setAdding(!adding); setScope('personal'); setError('') }}>
            {adding ? 'Cancelar' : 'Nuevo evento'}
            {adding ? <X size={17} /> : <Plus size={17} />}
          </button>
      </header>
      {adding && (
        <form className="p-card p-form" onSubmit={addEvent}>
          <h2>Programar evento</h2>
          <div className="p-form-workbench">
            <div className="p-form-col">
            <label htmlFor="cal-title">
              Nombre del evento
              <input id="cal-title" name="title" required maxLength={100} placeholder="Ej. Repaso de autovalores" />
            </label>
            <label>
              Categoría
              <select name="category" defaultValue="personal">
                {Object.entries(categoryLabels).map(([id, label]) => <option value={id} key={id}>{label}</option>)}
              </select>
            </label>
            <label htmlFor="cal-location">
              Lugar / Aula
              <input id="cal-location" name="location" required maxLength={100} placeholder="Lab Hardware 204 o Sala virtual" />
            </label>
            </div>
            <div className="p-form-col">
            <label htmlFor="cal-date">
              Fecha
              <input id="cal-date" type="date" name="date" defaultValue={selected} required />
            </label>
            <label htmlFor="cal-time">
              Hora de inicio
              <input id="cal-time" type="time" name="time" required />
            </label>
            <label>Hora de fin<input type="time" name="endTime" required /></label>
            {user.role !== 'student' && <label>Público
              <select value={scope} onChange={(event) => setScope(event.target.value as CalendarScope)}>
                <option value="personal">Solo yo</option>
                {eligibleCourses.length > 0 && <option value="course">Un curso</option>}
                {isManagement && <>
                  <option value="global">Toda la comunidad</option>
                  {blocks.length > 0 && <option value="block">Un bloque</option>}
                  <option value="role">Un rol</option>
                </>}
              </select>
            </label>}
            {scope === 'course' && <label>Curso<select name="target" required>
              {eligibleCourses.map((course) => <option value={course.id} key={course.id}>{course.name}</option>)}
            </select></label>}
            {scope === 'block' && <label>Bloque<select name="target" required>
              {blocks.map((block) => <option key={block}>{block}</option>)}
            </select></label>}
            {scope === 'role' && <label>Rol<select name="target" required>
              {Object.entries(roleLabels).map(([id, label]) => <option key={id} value={id}>{label}</option>)}
            </select></label>}
            </div>
          </div>
          {error && <p className="p-warning" role="alert">{error}</p>}
          <div className="p-actions-row">
            <button className="p-button p-button-primary" type="submit">
              Guardar evento
            </button>
          </div>
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
                <Clock3 size={15} /> {eventTime(event)}
              </p>
              <p className="p-meta">{event.category ? categoryLabels[event.category] : 'Evento'}{event.audience ? ' · ' + event.audience : ''}</p>
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
      <section className="p-upcoming-events" aria-labelledby="upcoming-events-heading">
        <h2 id="upcoming-events-heading">Actividades cercanas</h2>
        {upcoming.length === 0 && <p className="p-meta">No hay eventos ni entregas en los próximos siete días.</p>}
        {upcoming.map((entry) => <button key={entry.id} type="button" className="p-upcoming-row" onClick={() => {
          setSelected(entry.date)
          setMonth(entry.date.slice(0, 7))
        }}>
          <time dateTime={entry.date}>{formatDate(entry.date)}</time>
          <strong>{entry.title}</strong><span>{entry.detail}</span>
        </button>)}
      </section>
    </section>
  )
}
