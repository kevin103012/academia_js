import { useState, type FormEvent } from 'react'
import { Plus } from 'lucide-react'
import { demoUsers } from '../../data/demoUsers'
import { courseCategories, type Course, type Workspace, type Commit } from '../../types/workspace'
import { createId } from '../../utils/id'
import { formatDate } from '../../utils/date'
import { buildScheduledCourse, dayNames, type Planning } from './scheduledCourse'
import './coordinatorCourses.css'

export interface CourseTools { workspace: Workspace; commit: Commit }

export function CourseCreator({ commit, onCreated }: { commit: Commit; onCreated: (id: string) => void }) {
  const [open, setOpen] = useState(false)
  const [error, setError] = useState('')
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const data = new FormData(event.currentTarget)
    const field = (key: string) => String(data.get(key) ?? '')
    try {
      const course = buildScheduledCourse({ name: field('name'), category: field('category'),
        teacherId: field('teacher'), description: field('description'), group: field('group'),
        period: field('period'), start: field('start'), end: field('end'), days: data.getAll('day').map(String),
        from: field('from'), until: field('until') }, demoUsers, createId(), courseCategories)
      commit('Creó el curso ' + course.name, current => ({...current, courses: [...current.courses, course]}))
      onCreated(course.id)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'No se pudo crear el curso.')
    }
  }

  if (!open) return <button className="p-button p-button-primary" type="button" onClick={() => setOpen(true)}>
    <Plus size={16} aria-hidden="true" /> Crear curso
  </button>

  return <form className="p-card p-form cc-form" onSubmit={submit}>
    <header><h2>Nuevo curso</h2><p>Define quién dicta el curso y cuándo se reúne. Este registro es local a la demo.</p></header>
    <label>Nombre del curso<input name="name" maxLength={100} required autoFocus /></label>
    <label>Categoría<select name="category">{courseCategories.map(cat => <option key={cat.id} value={cat.id}>{cat.label}</option>)}</select></label>
    <label>Instructor<select name="teacher" required defaultValue=""><option value="" disabled>Selecciona un instructor</option>
      {demoUsers.filter(user => user.role === 'teacher').map(user => <option key={user.id} value={user.id}>{user.name}</option>)}</select></label>
    <div className="cc-pair"><label>Período académico<input name="period" maxLength={50} placeholder="2026-II" required /></label>
      <label>Bloque o grupo<input name="group" maxLength={90} required /></label></div>
    <div className="cc-pair"><label>Fecha de inicio<input type="date" name="start" required /></label>
      <label>Fecha de fin<input type="date" name="end" required /></label></div>
    <fieldset><legend>Días de clase</legend><div className="cc-days">
      {[1,2,3,4,5,6,0].map(day => <label key={day}><input type="checkbox" name="day" value={day} /> {dayNames[day]}</label>)}
    </div></fieldset>
    <div className="cc-pair"><label>Hora de inicio<input type="time" name="from" required /></label>
      <label>Hora de fin<input type="time" name="until" required /></label></div>
    <label>Descripción (opcional)<textarea name="description" maxLength={600} rows={2} /></label>
    {error && <p role="alert">{error}</p>}
    <div className="cc-actions"><button className="p-button p-button-primary" type="submit">Guardar curso</button>
      <button className="p-button" type="button" onClick={() => {setOpen(false); setError('')}}>Cancelar</button></div>
  </form>
}

export function CourseOperations({ course, workspace }: { course: Course; workspace: Workspace }) {
  const plan = (course as Course & { planning?: Planning }).planning
  const activities = workspace.activities.filter(item => item.courseId === course.id)
  return <section className="p-card cc-overview" aria-label="Seguimiento de Coordinación">
    <h2>Seguimiento de Coordinación</h2>
    <p>{course.teacher} · {course.group}</p>
    {plan && <p><strong>{plan.period}</strong> · {formatDate(plan.start)} – {formatDate(plan.end)}<br />
      {plan.days.map(day => dayNames[day]).join(', ')} · {plan.from}–{plan.until}</p>}
    <h3>Actividades del curso</h3>
    {activities.length ? <ul>{activities.map(activity => <li key={activity.id}>
      <strong>{activity.title}</strong> · Vence el {formatDate(activity.due)} · Entregas: {workspace.submissions.filter(s => s.activityId === activity.id).length}
    </li>)}</ul> : <p>Todavía no hay actividades asignadas a este curso.</p>}
    <h3>Asistencia por estudiante</h3>
    <p>Sin datos por curso. Los registros de asistencia de la demo no identifican la clase.</p>
  </section>
}
