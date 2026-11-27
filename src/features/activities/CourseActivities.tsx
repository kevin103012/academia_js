import { ArrowLeft, BookOpen, CalendarDays, ClipboardList, Plus, X } from 'lucide-react'
import { useState } from 'react'
import type { DemoUser } from '../../types/auth'
import type { Activity, Commit, Course, Workspace } from '../../types/workspace'
import { formatDate } from '../../utils/date'
import { createId } from '../../utils/id'
import { courseRoster } from '../../utils/roster'
import { ActivityForm, type ActivityDraft } from './ActivityForm'
import { StudentDelivery, submissionStatus } from './StudentDelivery'
import { SubmissionRoster } from './SubmissionRoster'

interface CourseActivitiesProps {
  user: DemoUser
  course: Course
  workspace: Workspace
  commit: Commit
  onBack: () => void
}

export function CourseActivities({ user, course, workspace, commit, onBack }: CourseActivitiesProps) {
  const [activeId, setActiveId] = useState<string>()
  const [adding, setAdding] = useState(false)
  const [editing, setEditing] = useState(false)
  const student = user.role === 'student'
  // Administración gestiona cualquier curso; el docente, solo los suyos.
  const canManage = user.role === 'admin' || (user.role === 'teacher' && course.teacher === user.name)
  const activities = workspace.activities
    .filter((activity) => activity.courseId === course.id)
    .sort((a, b) => a.due.localeCompare(b.due))
  const active = activities.find((activity) => activity.id === activeId)
  const roster = courseRoster(workspace, course)

  function select(id?: string) {
    setActiveId(id)
    setAdding(false)
    setEditing(false)
  }

  function createActivity(draft: ActivityDraft) {
    if (!canManage) return
    const activity: Activity = { ...draft, id: createId(), courseId: course.id }
    commit(`Publicó la actividad «${draft.title}»`, (current) => ({
      ...current,
      activities: [...current.activities, activity],
    }))
    select(activity.id)
  }

  function editActivity(activity: Activity, draft: ActivityDraft) {
    if (!canManage) return
    commit(`Editó la actividad «${draft.title}» de «${course.name}»`, (current) => ({
      ...current,
      activities: current.activities.map((item) => (item.id === activity.id ? { ...item, ...draft } : item)),
    }))
    setEditing(false)
  }

  return (
    <section aria-labelledby="course-activities-title">
      <header className="p-section-heading">
        <div>
          <h1 id="course-activities-title">{course.name}</h1>
          <p>
            {course.group} · {course.teacher}
          </p>
        </div>
        <div className="p-heading-actions">
          <button type="button" className="p-button p-button-short" onClick={onBack}>
            <ArrowLeft size={16} aria-hidden="true" /> Volver a cursos
          </button>
          {canManage && (
            <button
              type="button"
              className="p-button p-button-primary"
              onClick={() => {
                setAdding(!adding)
                setActiveId(undefined)
                setEditing(false)
              }}
            >
              <span>{adding ? 'Cancelar' : 'Nueva actividad'}</span>
              {adding ? <X size={16} /> : <Plus size={16} />}
            </button>
          )}
        </div>
      </header>

      {adding && canManage && (
        <div className="p-card p-activity-new">
          <ActivityForm heading="Publicar actividad" submitLabel="Publicar actividad" onSave={createActivity} />
        </div>
      )}

      <div className="p-activity-layout">
        <div className="p-card p-list">
          {activities.map((activity) => {
            const own = workspace.submissions.find(
              (item) => item.activityId === activity.id && item.studentId === user.id,
            )
            const delivered = roster.filter((person) =>
              workspace.submissions.some((item) => item.activityId === activity.id && item.studentId === person.id),
            ).length
            return (
              <button
                type="button"
                key={activity.id}
                className="p-list-action"
                aria-pressed={activity.id === activeId}
                onClick={() => select(activity.id)}
              >
                <span className={`p-kind-icon p-${course.color}`}>
                  <ClipboardList size={20} />
                </span>
                <span className="p-list-copy">
                  <strong>{activity.title}</strong>
                  <small>Entrega: {formatDate(activity.due)}</small>
                </span>
                <span className={`p-badge${student && own?.score !== undefined ? ' tone-soft-accent' : ''}`}>
                  {student ? submissionStatus(activity, own) : `Entregas: ${delivered} de ${roster.length}`}
                </span>
              </button>
            )
          })}
          {!activities.length && (
            <div className="p-empty">
              <ClipboardList size={26} />
              <p>Este curso aún no tiene actividades.</p>
            </div>
          )}
        </div>

        {active && !adding && (
          <article className="p-card p-activity-detail" aria-label="Detalle de actividad" key={active.id}>
            {editing && canManage ? (
              <ActivityForm
                heading="Editar actividad"
                submitLabel="Guardar cambios"
                initial={active}
                onSave={(draft) => editActivity(active, draft)}
                onCancel={() => setEditing(false)}
              />
            ) : (
              <>
                <div className="p-card-head">
                  <h2>{active.title}</h2>
                  <button type="button" aria-label="Cerrar detalle" className="p-icon-button" onClick={() => select()}>
                    <X size={19} />
                  </button>
                </div>
                <p className="p-meta">
                  <CalendarDays size={15} /> Entrega el {formatDate(active.due, { day: 'numeric', month: 'long' })}
                </p>
                <p className="p-long-text">{active.instructions}</p>
                {canManage && (
                  <button type="button" className="p-button p-button-short p-activity-edit" onClick={() => setEditing(true)}>
                    Editar actividad
                  </button>
                )}
                {student ? (
                  <StudentDelivery user={user} activity={active} workspace={workspace} commit={commit} />
                ) : (
                  <SubmissionRoster
                    activity={active}
                    roster={roster}
                    workspace={workspace}
                    commit={commit}
                    canGrade={canManage}
                  />
                )}
              </>
            )}
          </article>
        )}

        {!active && !adding && activities.length > 0 && (
          <div className="p-card p-empty p-activity-placeholder">
            <BookOpen size={30} />
            <p>Selecciona una actividad para ver los detalles.</p>
          </div>
        )}
      </div>
    </section>
  )
}
