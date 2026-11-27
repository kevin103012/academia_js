import { ArrowLeft, Check, ChevronLeft, ChevronRight, Clock, ShieldCheck, X, type LucideIcon } from 'lucide-react'
import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react'
import type { Attendance, AttendanceStatus, Commit, Course, Student, Workspace } from '../../types/workspace'
import { attendanceLabels, courseDays, parseKey, rateTone, scheduledDates, summarize } from '../../utils/attendance'
import { dateKey, formatDate } from '../../utils/date'
import { courseRoster } from '../../utils/roster'
import { initials } from '../../utils/text'

/* Estilos de la pantalla de asistencia (prefijo ax- para no chocar con attendance.css). */
const styles = `
/* Asistencia: hoja de registro, historial y horario de clases. Usa las variables del tema de la web. */

.ax-summary { margin: 0 0 6px; font-size: .86rem; color: var(--text-muted); }
.ax-hint { margin: 0 0 6px; font-size: .8rem; color: var(--text-muted); }

/* ---------- Selector Registrar / Historial ---------- */
.ax-toggle {
  display: inline-flex;
  padding: 3px;
  border: 1px solid var(--border-tonal);
  border-radius: var(--radius-pill);
  background: var(--surface-l2);
}
.ax-toggle button {
  min-height: 34px;
  padding: 4px 14px;
  border: 0;
  border-radius: var(--radius-pill);
  background: transparent;
  color: var(--text-muted);
  font: inherit;
  font-size: .84rem;
  font-weight: 650;
  cursor: pointer;
}
.ax-toggle button:hover { color: var(--text-primary); }
.ax-toggle button[aria-pressed='true'] { background: var(--accent-soft); color: var(--text-primary); }
.ax-toggle button:focus-visible { outline: 2px solid var(--border-focus); outline-offset: 2px; }

/* ---------- Hoja ---------- */
.ax-card { margin-top: 10px; overflow: hidden; }
.ax-scroll { overflow-x: auto; }
.ax-scroll:focus-visible { outline: 2px solid var(--border-focus); outline-offset: -2px; }

.ax-sheet { width: 100%; border-collapse: separate; border-spacing: 0; font-size: .86rem; }
.ax-sheet th,
.ax-sheet td {
  padding: 8px 10px;
  border-bottom: 1px solid var(--border-tonal);
  background: var(--surface-l1);
  text-align: center;
  vertical-align: middle;
}
.ax-sheet tbody tr:last-child th,
.ax-sheet tbody tr:last-child td { border-bottom: 0; }
.ax-sheet thead th { padding: 4px 6px; font-weight: 650; color: var(--text-muted); }

/* Primera columna fija al desplazar. */
.ax-sheet th:first-child {
  position: sticky;
  left: 0;
  z-index: 1;
  min-width: 210px;
  text-align: left;
}
.ax-sheet thead th:first-child { padding: 8px 12px; }
.ax-sheet tbody th { display: table-cell; padding: 8px 12px; font-weight: 600; color: var(--text-primary); }
.ax-sheet tbody th > * { vertical-align: middle; }
.ax-sheet tbody th .p-avatar { display: inline-grid; margin-inline-end: 10px; }
.ax-name { display: inline-grid; gap: 1px; }
.ax-name small { color: var(--text-muted); font-weight: 500; font-size: .74rem; }

/* Encabezados con acción (marcar a todos / abrir un día). */
.ax-col-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 5px;
  min-height: 34px;
  padding: 4px 10px;
  border: 0;
  border-radius: var(--radius-pill);
  background: transparent;
  color: inherit;
  font: inherit;
  cursor: pointer;
}
.ax-col-button:hover:not(:disabled) { background: var(--surface-l4); color: var(--text-primary); }
.ax-col-button:disabled { opacity: .5; cursor: default; }
.ax-col-button:focus-visible { outline: 2px solid var(--border-focus); outline-offset: 2px; }

/* Estado actual del día. */
.ax-state { font-size: .8rem; font-weight: 650; color: var(--text-muted); }
.ax-state[data-status='Presente'] { color: #1f9d5c; }
.ax-state[data-status='Tardanza'] { color: #c98a0a; }
.ax-state[data-status='Ausente'] { color: #d4483a; }
.ax-state[data-status='Justificada'] { color: #3b82d6; }
.ax-state[data-edited]::after { content: ' *'; }

/* Un círculo por opción: clic para marcar. */
.ax-pick { position: relative; display: inline-grid; }
.ax-pick input { position: absolute; inset: 0; width: 100%; height: 100%; margin: 0; opacity: 0; cursor: pointer; }
.ax-pick > span {
  display: inline-grid;
  place-items: center;
  width: 36px;
  height: 36px;
  border: 1px solid var(--border-tonal);
  border-radius: 50%;
  background: var(--surface-l2);
  color: var(--text-muted);
}
.ax-pick:hover > span { background: var(--surface-l4); color: var(--text-primary); }
.ax-pick input:focus-visible + span { outline: 2px solid var(--border-focus); outline-offset: 2px; }
.ax-pick input:checked + span { color: #101418; }
.ax-pick[data-status='Presente'] input:checked + span { background: #34c77b; border-color: #34c77b; }
.ax-pick[data-status='Tardanza'] input:checked + span { background: #f5b83b; border-color: #f5b83b; }
.ax-pick[data-status='Ausente'] input:checked + span { background: #ef6a5b; border-color: #ef6a5b; }
.ax-pick[data-status='Justificada'] input:checked + span { background: #6aa8f0; border-color: #6aa8f0; }
/* Cambio sin guardar: anillo alrededor del círculo marcado. */
.ax-pick[data-edited] input:checked + span { box-shadow: 0 0 0 3px var(--accent-soft); }

.ax-footer {
  position: sticky;
  bottom: 0;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  padding: 10px 14px;
  border-top: 1px solid var(--border-tonal);
  background: var(--surface-l1);
}
.ax-footer small { color: var(--text-muted); }

/* ---------- Historial ---------- */
.ax-date-button { display: inline-grid; justify-items: center; gap: 0; min-width: 64px; }
.ax-date-button small { text-transform: capitalize; font-weight: 500; }
.ax-sheet th[data-today] { box-shadow: inset 0 -2px 0 var(--border-focus); color: var(--text-primary); }
.ax-history td { min-width: 80px; }
.ax-history thead th:nth-child(n + 3) { min-width: 80px; }
.ax-history th:nth-child(2) { min-width: 110px; }

.ax-general { min-width: 110px; }
.ax-general > div { display: grid; gap: 1px; justify-items: center; }
.ax-general small { font-size: .7rem; color: var(--text-muted); }
.ax-rate { display: inline-flex; align-items: center; gap: 6px; font-weight: 750; }
.ax-rate::before {
  content: '';
  width: 9px;
  height: 9px;
  border-radius: 50%;
  background: var(--surface-l4);
}
.ax-rate[data-tone='high']::before { background: #34c77b; }
.ax-rate[data-tone='good']::before { background: #d6e84f; }
.ax-rate[data-tone='mid']::before { background: #f5a33b; }
.ax-rate[data-tone='low']::before { background: #ef6a5b; }

.ax-mark span { display: inline-grid; place-items: center; }
.ax-mark[data-status='Presente'] svg { color: #1f9d5c; }
.ax-mark[data-status='Tardanza'] svg { color: #c98a0a; }
.ax-mark[data-status='Ausente'] svg { color: #d4483a; }
.ax-mark[data-status='Justificada'] svg { color: #3b82d6; }
.ax-none { color: var(--text-muted); opacity: .6; }

.ax-legend { margin: 0; padding: 10px 14px; border-top: 1px solid var(--border-tonal); font-size: .76rem; color: var(--text-muted); }

.ax-days { display: flex; gap: 6px; margin: 10px 0 0; padding: 2px 2px 8px; overflow-x: auto; }
.ax-day {
  position: relative;
  flex: 0 0 auto;
  display: grid;
  justify-items: center;
  gap: 0;
  min-width: 62px;
  padding: 6px 12px;
  border: 1px solid var(--border-tonal);
  border-radius: 14px;
  background: var(--surface-l2);
  color: var(--text-muted);
  font: inherit;
  font-size: .82rem;
  font-weight: 650;
  cursor: pointer;
}
.ax-day small { text-transform: capitalize; font-weight: 500; font-size: .7rem; }
.ax-day:hover { background: var(--surface-l4); color: var(--text-primary); }
.ax-day:focus-visible { outline: 2px solid var(--border-focus); outline-offset: 2px; }
.ax-day[data-future] { opacity: .75; }
.ax-day[aria-pressed='true'] { opacity: 1; background: var(--accent-soft); border-color: var(--border-focus); color: var(--text-primary); }
/* Punto verde: ese día ya tiene asistencia guardada. */
.ax-day[data-recorded]::after {
  content: '';
  position: absolute;
  top: 5px;
  right: 6px;
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #34c77b;
}
.ax-sheet th[data-selected] { background: var(--accent-soft); color: var(--text-primary); }
.ax-history td[data-selected] { background: var(--accent-soft); }
.ax-history th[data-future] .ax-col-button { opacity: .6; }

.ax-pager { display: flex; align-items: center; gap: 8px; margin: 10px 0 0; }
.ax-pager select {
  min-height: 36px;
  max-width: 100%;
  padding: 4px 14px;
  border: 1px solid var(--border-tonal);
  border-radius: var(--radius-pill);
  background: var(--surface-l2);
  color: var(--text-primary);
  font: inherit;
  font-size: .84rem;
  font-weight: 650;
}
.ax-pager select:focus-visible { outline: 2px solid var(--border-focus); outline-offset: 2px; }

@media (max-width: 720px) {
  .ax-sheet th:first-child { min-width: 150px; }
  .ax-sheet th, .ax-sheet td { padding-inline: 6px; }
  .ax-col-button { padding-inline: 6px; font-size: .78rem; }
}
`

interface CourseAttendanceProps {
  course: Course
  workspace: Workspace
  commit: Commit
  onBack: () => void
}

type View = 'registro' | 'historial'
type Drafts = Record<string, Record<string, AttendanceStatus>>

/** Orden de las columnas de la hoja de registro. */
/** Clases que se muestran a la vez; si hay más, aparece un selector de rango. */
const pageSize = 9

const order: AttendanceStatus[] = ['Presente', 'Tardanza', 'Ausente', 'Justificada']

const statusIcons: Record<AttendanceStatus, LucideIcon> = {
  Presente: Check,
  Tardanza: Clock,
  Ausente: X,
  Justificada: ShieldCheck,
}

const shortFormat = new Intl.DateTimeFormat('es-PE', { day: 'numeric', month: 'short' })
const weekdayFormat = new Intl.DateTimeFormat('es-PE', { weekday: 'short' })
const shortDate = (key: string) => shortFormat.format(parseKey(key)).replace('.', '')
const weekday = (key: string) => weekdayFormat.format(parseKey(key)).replace('.', '')

function StudentCell({ student }: { student: Student }) {
  return (
    <th scope="row">
      <span className="p-avatar" aria-hidden="true">
        {initials(student.name)}
      </span>
      <span className="ax-name">
        <strong>{student.name}</strong>
        <small>{student.group}</small>
      </span>
    </th>
  )
}

export function CourseAttendance({ course, workspace, commit, onBack }: CourseAttendanceProps) {
  const today = dateKey()
  const [view, setView] = useState<View>('registro')
  const [day, setDay] = useState(() => {
    const dates = scheduledDates(course.schedule)
    if (!dates.length || dates.includes(today)) return today
    return [...dates].reverse().find((date) => date <= today) ?? dates[0]
  })
  const daysRef = useRef<HTMLDivElement>(null)
  const historyRef = useRef<HTMLDivElement>(null)
  // Rango de clases elegido a mano; mientras no se elija, se muestra el que contiene el día seleccionado.
  const [pageOverride, setPageOverride] = useState<number>()
  // Los cambios sin guardar se conservan por fecha: cambiar de día no los pierde.
  const [drafts, setDrafts] = useState<Drafts>({})

  // Solo los alumnos del curso; si ninguno coincide con el grupo se muestra el padrón completo.
  const enrolled = courseRoster(workspace, course)
  const roster: Student[] = enrolled.length ? enrolled : workspace.students

  const records = useMemo(
    () => workspace.attendance.filter((record) => record.courseId === course.id),
    [workspace.attendance, course.id],
  )
  const saved = useMemo(
    () => new Map(records.map((record) => [`${record.studentId}|${record.date}`, record.status])),
    [records],
  )
  const days = useMemo(() => courseDays(course, records, today), [course, records, today])
  // Columnas y botones de día: todas las clases del horario (también las que aún no llegan).
  const classDays = useMemo(() => [...new Set([...days.held, ...days.upcoming])].sort(), [days])
  const recordedDays = useMemo(() => new Set(records.map((record) => record.date)), [records])
  const pageCount = Math.max(1, Math.ceil(classDays.length / pageSize))
  const page = Math.min(pageOverride ?? Math.floor(Math.max(classDays.indexOf(day), 0) / pageSize), pageCount - 1)
  const pageDays = classDays.slice(page * pageSize, (page + 1) * pageSize)
  const rangeLabel = (index: number) => {
    const from = index * pageSize
    const to = Math.min(from + pageSize, classDays.length)
    return `Clases ${from + 1}–${to} · ${shortDate(classDays[from])} – ${shortDate(classDays[to - 1])}`
  }

  // Lleva la vista al día elegido (la tira de días o la columna del historial).
  useEffect(() => {
    const target = view === 'registro' ? daysRef.current : historyRef.current
    target?.querySelector('[data-focus]')?.scrollIntoView?.({ inline: 'center', block: 'nearest' })
  }, [day, view])

  const read = (studentId: string, date: string) => drafts[date]?.[studentId] ?? saved.get(`${studentId}|${date}`)

  const summaries = new Map(roster.map((student) => [student.id, summarize(student.id, days.held, records)]))
  const rated = [...summaries.values()].filter((item) => item.rate !== null)
  const average = rated.length ? Math.round(rated.reduce((sum, item) => sum + (item.rate ?? 0), 0) / rated.length) : null
  const atRisk = rated.filter((item) => (item.rate ?? 100) < 60).length

  const pending = Object.values(drafts).reduce((total, byStudent) => total + Object.keys(byStudent).length, 0)
  const withoutRecord = roster.filter((student) => !read(student.id, day)).length
  const dayLabel = day === today ? 'Hoy' : shortDate(day)

  function setStatus(studentId: string, status: AttendanceStatus) {
    setDrafts((current) => {
      const forDay = { ...current[day] }
      // Si vuelve a lo ya guardado, deja de contar como cambio.
      if (saved.get(`${studentId}|${day}`) === status) delete forDay[studentId]
      else forDay[studentId] = status
      const next = { ...current, [day]: forDay }
      if (!Object.keys(forDay).length) delete next[day]
      return next
    })
  }

  function markPending(status: AttendanceStatus) {
    setDrafts((current) => {
      const forDay = { ...current[day] }
      for (const student of roster) if (!read(student.id, day)) forDay[student.id] = status
      return { ...current, [day]: forDay }
    })
  }

  function save(event: FormEvent) {
    event.preventDefault()
    const updates: Attendance[] = Object.entries(drafts).flatMap(([date, byStudent]) =>
      Object.entries(byStudent).map(([studentId, status]) => ({ courseId: course.id, studentId, date, status })),
    )
    if (!updates.length) return
    const touched = new Set(updates.map((update) => `${update.studentId}|${update.date}`))
    const dates = Object.keys(drafts)
    commit(
      dates.length === 1
        ? `Registró la asistencia del ${formatDate(dates[0])} en «${course.name}»`
        : `Registró la asistencia de ${dates.length} días en «${course.name}»`,
      (current) => ({
        ...current,
        attendance: [
          ...current.attendance.filter(
            (record) => record.courseId !== course.id || !touched.has(`${record.studentId}|${record.date}`),
          ),
          ...updates,
        ],
      }),
    )
    setDrafts({})
  }

  function openDay(date: string) {
    setDay(date)
    setView('registro')
  }

  const summaryParts = [
    `${days.held.length} ${days.held.length === 1 ? 'clase dictada' : 'clases dictadas'}`,
    course.schedule ? `${days.upcoming.length} por dictar` : undefined,
    `promedio ${average === null ? '—' : `${average} %`}`,
    `${atRisk} bajo 60 %`,
  ].filter(Boolean)

  return (
    <section aria-labelledby="attendance-heading">
      <style>{styles}</style>
      <header className="p-section-heading">
        <div>
          <h1 id="attendance-heading">Asistencia · {course.name}</h1>
          <p>{course.group}</p>
        </div>
        <div className="p-heading-actions">
          <button type="button" className="p-button p-button-short" onClick={onBack}>
            <ArrowLeft size={16} aria-hidden="true" /> Volver a cursos
          </button>
          <div className="ax-toggle" role="group" aria-label="Vista de asistencia">
            <button type="button" aria-pressed={view === 'registro'} onClick={() => setView('registro')}>
              Registrar
            </button>
            <button type="button" aria-pressed={view === 'historial'} onClick={() => setView('historial')}>
              Historial
            </button>
          </div>
        </div>
      </header>

      <p className="ax-summary">{summaryParts.join(' · ')}</p>
      {!course.schedule && (
        <p className="ax-hint">
          Este curso aún no tiene horario de clases. Defínelo en «Lecciones» → «Horario de clases» y sus días aparecerán
          aquí.
        </p>
      )}
      {!enrolled.length && <p className="ax-hint">Ningún alumno coincide con el grupo del curso; se muestra el padrón completo.</p>}

      {pageCount > 1 && (
        <div className="ax-pager">
          <button
            type="button"
            className="p-button p-button-short"
            aria-label="Clases anteriores"
            disabled={page === 0}
            onClick={() => setPageOverride(page - 1)}
          >
            <ChevronLeft size={16} aria-hidden="true" />
          </button>
          <label>
            <span className="p-sr-only">Rango de clases</span>
            <select value={page} onChange={(event) => setPageOverride(Number(event.target.value))}>
              {Array.from({ length: pageCount }, (_, index) => (
                <option key={index} value={index}>
                  {rangeLabel(index)}
                </option>
              ))}
            </select>
          </label>
          <button
            type="button"
            className="p-button p-button-short"
            aria-label="Clases siguientes"
            disabled={page === pageCount - 1}
            onClick={() => setPageOverride(page + 1)}
          >
            <ChevronRight size={16} aria-hidden="true" />
          </button>
        </div>
      )}

      {view === 'registro' ? (
        <>
        {classDays.length > 0 && (
          <div className="ax-days" ref={daysRef} role="group" aria-label="Días de clase del curso">
            {pageDays.map((date) => (
              <button
                type="button"
                key={date}
                className="ax-day"
                aria-pressed={date === day}
                data-focus={date === day || undefined}
                data-today={date === today || undefined}
                data-future={date > today || undefined}
                data-recorded={recordedDays.has(date) || undefined}
                onClick={() => setDay(date)}
              >
                <span>{date === today ? 'Hoy' : shortDate(date)}</span>
                <small>{weekday(date)}</small>
              </button>
            ))}
          </div>
        )}
        {course.schedule && !days.scheduled.has(day) && (
          <p className="ax-hint">El {formatDate(day)} no está en el horario del curso; puedes registrarlo igual.</p>
        )}
        <form className="p-card ax-card" onSubmit={save}>
          <div className="ax-scroll" tabIndex={0} role="region" aria-label="Registro de asistencia">
            <table className="ax-sheet">
              <caption className="p-sr-only">Asistencia del {formatDate(day)}</caption>
              <thead>
                <tr>
                  <th scope="col">Estudiante</th>
                  <th scope="col">{dayLabel}</th>
                  {order.map((status) => {
                    const Icon = statusIcons[status]
                    return (
                      <th scope="col" key={status}>
                        <button
                          type="button"
                          className="ax-col-button"
                          onClick={() => markPending(status)}
                          disabled={!withoutRecord}
                          title={`Marcar como «${attendanceLabels[status]}» a todos los que faltan por registrar`}
                        >
                          <Icon size={14} aria-hidden="true" /> {attendanceLabels[status]}
                        </button>
                      </th>
                    )
                  })}
                </tr>
              </thead>
              <tbody>
                {roster.map((student) => {
                  const status = read(student.id, day)
                  const edited = drafts[day]?.[student.id] !== undefined
                  return (
                    <tr key={student.id}>
                      <StudentCell student={student} />
                      <td>
                        <span className="ax-state" data-status={status} data-edited={edited || undefined}>
                          {status ? attendanceLabels[status] : '—'}
                        </span>
                      </td>
                      {order.map((choice) => {
                        const Icon = statusIcons[choice]
                        return (
                          <td key={choice}>
                            <label className="ax-pick" data-status={choice} data-edited={edited || undefined}>
                              <input
                                type="radio"
                                name={`attendance-${student.id}`}
                                value={choice}
                                checked={status === choice}
                                onChange={() => setStatus(student.id, choice)}
                              />
                              <span>
                                <Icon size={16} aria-hidden="true" />
                                <span className="p-sr-only">
                                  {attendanceLabels[choice]}: {student.name}
                                </span>
                              </span>
                            </label>
                          </td>
                        )
                      })}
                    </tr>
                  )
                })}
              </tbody>
            </table>
            {!roster.length && <p className="p-empty">No hay alumnos registrados.</p>}
          </div>
          <div className="ax-footer">
            <small aria-live="polite">
              {pending
                ? `${pending} cambio${pending === 1 ? '' : 's'} sin guardar`
                : withoutRecord
                  ? `${withoutRecord} sin registrar`
                  : 'Todo registrado'}
            </small>
            <button className="p-button p-button-primary" type="submit" disabled={!pending}>
              Guardar asistencia
            </button>
          </div>
        </form>
        </>
      ) : (
        <div className="p-card ax-card">
          {classDays.length ? (
            <div className="ax-scroll" ref={historyRef} tabIndex={0} role="region" aria-label="Historial, desplázalo para ver más fechas">
              <table className="ax-sheet ax-history">
                <caption className="p-sr-only">Asistencia de cada alumno por fecha de clase</caption>
                <thead>
                  <tr>
                    <th scope="col">Estudiante</th>
                    <th scope="col">General</th>
                    {pageDays.map((date) => (
                      <th
                        scope="col"
                        key={date}
                        data-today={date === today || undefined}
                        data-selected={date === day || undefined}
                        data-focus={date === day || undefined}
                        data-future={date > today || undefined}
                      >
                        <button
                          type="button"
                          className="ax-col-button ax-date-button"
                          onClick={() => openDay(date)}
                          title="Registrar o corregir este día"
                        >
                          <span>{date === today ? 'Hoy' : shortDate(date)}</span>
                          <small>{weekday(date)}</small>
                        </button>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {roster.map((student) => {
                    const summary = summaries.get(student.id)!
                    return (
                      <tr key={student.id}>
                        <StudentCell student={student} />
                        <td className="ax-general">
                          <div>
                            <span className="ax-rate" data-tone={rateTone(summary.rate)}>
                              {summary.rate === null ? '—' : `${summary.rate} %`}
                            </span>
                            {summary.unrecorded > 0 && <small>{summary.unrecorded} sin registrar</small>}
                          </div>
                        </td>
                        {pageDays.map((date) => {
                          const status = saved.get(`${student.id}|${date}`)
                          const Icon = status ? statusIcons[status] : undefined
                          return (
                            <td className="ax-mark" key={date} data-status={status} data-selected={date === day || undefined}>
                              {Icon && status ? (
                                <span title={attendanceLabels[status]}>
                                  <Icon size={17} aria-hidden="true" />
                                  <span className="p-sr-only">{attendanceLabels[status]}</span>
                                </span>
                              ) : date > today ? null : (
                                <span className="ax-none" title="Sin registrar">
                                  —<span className="p-sr-only">Sin registrar</span>
                                </span>
                              )}
                            </td>
                          )
                        })}
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="p-empty">Aún no hay clases. Define el horario del curso en «Lecciones» para ver sus días aquí.</p>
          )}
          <p className="ax-legend">
            El porcentaje cuenta presentes y tardanzas sobre las clases registradas; las justificadas y las que faltan por
            registrar no cuentan.
          </p>
        </div>
      )}
    </section>
  )
}
