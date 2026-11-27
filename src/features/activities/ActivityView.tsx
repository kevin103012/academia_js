import { BookOpen, CalendarDays, Check, ClipboardList, FileText, Plus, X } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import type { DemoUser } from '../../types/auth'
import type { Activity, Commit, Submission, Workspace } from '../../types/workspace'
import { dateKey, formatDate } from '../../utils/date'
import { createId } from '../../utils/id'

type ActivityViewProps = {
  user: DemoUser
  workspace: Workspace
  commit: Commit
}

function submissionStatus(activity: Activity, submission?: Submission) {
  if (submission?.score !== undefined) return 'Calificada'
  if (submission) return 'Entregada'
  return activity.due < dateKey() ? 'Vencida' : 'Pendiente'
}

export function ActivityView({ user, workspace, commit }: ActivityViewProps) {
  const [activeId, setActiveId] = useState<string>()
  const [courseFilter, setCourseFilter] = useState('')
  const [adding, setAdding] = useState(false)
  const staff = user.role === 'teacher' || user.role === 'admin'
  const student = user.role === 'student'
  const active = workspace.activities.find((activity) => activity.id === activeId)
  const activities = workspace.activities
    .filter((activity) => !courseFilter || activity.courseId === courseFilter)
    .sort((a, b) => a.due.localeCompare(b.due))
  const submissions = workspace.submissions.filter((submission) => submission.activityId === activeId)
  const currentSubmission = submissions.find((submission) => submission.studentId === user.id)

  function createActivity(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    const title = String(form.get('title') ?? '').trim()
    const instructions = String(form.get('instructions') ?? '').trim()
    const courseId = String(form.get('courseId') ?? '')
    const due = String(form.get('due') ?? '')
    if (!title || !instructions || !due || !workspace.courses.some((course) => course.id === courseId)) return
    const activity = { id: createId(), title, instructions, courseId, due }
    commit(`Publicó la actividad «${title}»`, (current) => ({ ...current, activities: [...current.activities, activity] }))
    setCourseFilter('')
    setAdding(false)
    setActiveId(activity.id)
  }

  function submit(event: FormEvent<HTMLFormElement>, activity: Activity) {
    event.preventDefault()
    const content = String(new FormData(event.currentTarget).get('content') ?? '').trim()
    if (!content || currentSubmission?.score !== undefined) return
    const submission: Submission = {
      id: currentSubmission?.id ?? createId(),
      activityId: activity.id,
      studentId: user.id,
      content,
      submittedAt: dateKey(),
    }
    commit(`Entregó «${activity.title}»`, (current) => ({
      ...current,
      submissions: [...current.submissions.filter((item) => item.id !== submission.id), submission],
    }))
  }

  function grade(event: FormEvent<HTMLFormElement>, submission: Submission) {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    const score = Number(form.get('score'))
    const feedback = String(form.get('feedback') ?? '').trim()
    if (!Number.isFinite(score) || score < 0 || score > 20 || !feedback) return
    commit('Guardó una calificación', (current) => ({
      ...current,
      submissions: current.submissions.map((item) => (item.id === submission.id ? { ...item, score, feedback } : item)),
    }))
  }

  return (
    <section aria-labelledby="activities-title">
      <header className="p-section-heading">
        <div>
          <h1 id="activities-title">Actividades</h1>
          <p>
            {student
              ? 'Indicaciones, entregas y retroalimentación.'
              : 'Organización por curso y revisión de entregas.'}
          </p>
        </div>
        <div className="p-heading-actions">
          <label className="p-heading-control">
            <span>Curso</span>
            <select
              aria-label="Filtrar por curso"
              value={courseFilter}
              onChange={(event) => {
                setCourseFilter(event.target.value)
                setActiveId(undefined)
              }}
            >
              <option value="">Todos los cursos</option>
              {workspace.courses.map((course) => (
                <option key={course.id} value={course.id}>
                  {course.name}
                </option>
              ))}
            </select>
          </label>
          <span className="p-badge">
            {activities.length} {activities.length === 1 ? 'actividad' : 'actividades'}
          </span>
          {staff && (
            <button
              className="p-button p-button-primary"
              onClick={() => {
                setAdding(!adding)
                setActiveId(undefined)
              }}
            >
              <span>{adding ? 'Cancelar' : 'Nueva actividad'}</span>
              {adding ? <X size={16} /> : <Plus size={16} />}
            </button>
          )}
        </div>
      </header>

      {adding && staff && (
        <form className="p-card p-form" onSubmit={createActivity}>
          <h2>Publicar actividad</h2>
          <label>
            Título
            <input name="title" required maxLength={100} />
          </label>
          <div className="p-form-row">
            <label>
              Curso
              <select name="courseId" required>
                {workspace.courses.map((course) => (
                  <option key={course.id} value={course.id}>
                    {course.name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Fecha de entrega
              <input name="due" type="date" defaultValue={dateKey()} required />
            </label>
          </div>
          <label>
            Indicaciones
            <textarea name="instructions" rows={4} required maxLength={2000} />
          </label>
          <button className="p-button p-button-primary" type="submit">
            Publicar actividad
          </button>
        </form>
      )}

      <div className="p-activity-layout">
        <div className="p-card p-list">
          {activities.length ? (
            activities.map((activity) => {
              const course = workspace.courses.find((item) => item.id === activity.courseId)
              const personal = workspace.submissions.find(
                (item) => item.activityId === activity.id && item.studentId === user.id,
              )
              const submissionCount = workspace.submissions.filter((item) => item.activityId === activity.id).length
              const status = submissionStatus(activity, personal)
              return (
                <button
                  key={activity.id}
                  className="p-list-action"
                  aria-pressed={activity.id === activeId}
                  onClick={() => {
                    setActiveId(activity.id)
                    setAdding(false)
                  }}
                >
                  <span className={`p-kind-icon p-${course?.color ?? 'teal'}`}>
                    <ClipboardList size={20} />
                  </span>
                  <span className="p-list-copy">
                    <strong>{activity.title}</strong>
                    <small>
                      {course?.name} · {formatDate(activity.due)}
                    </small>
                  </span>
                  <span className={`p-badge${status === 'Calificada' && student ? ' tone-soft-accent' : ''}`}>
                    {student ? status : `${submissionCount}${submissionCount === 1 ? ' entrega' : ' entregas'}`}
                  </span>
                </button>
              )
            })
          ) : (
            <div className="p-empty">
              <ClipboardList size={26} />
              <p>No hay actividades para este curso.</p>
            </div>
          )}
        </div>

        {active && !adding && (
          <article className="p-card p-activity-detail" aria-label="Detalle de actividad" key={active.id}>
            <div className="p-card-head">
              <h2>{active.title}</h2>
              <button aria-label="Cerrar detalle" className="p-icon-button" onClick={() => setActiveId(undefined)}>
                <X size={19} />
              </button>
            </div>
            <p className="p-meta">
              <CalendarDays size={15} /> Entrega el {formatDate(active.due, { day: 'numeric', month: 'long' })}
            </p>
            <p className="p-long-text">{active.instructions}</p>
            {student &&
              (currentSubmission?.score !== undefined ? (
                <div className="p-feedback">
                  <span className="p-badge tone-soft-accent">
                    <Check size={14} /> Calificada
                  </span>
                  <h3>{currentSubmission.score}/20</h3>
                  <p>{currentSubmission.feedback}</p>
                  <details>
                    <summary>Ver mi entrega</summary>
                    <p className="p-long-text">{currentSubmission.content}</p>
                  </details>
                </div>
              ) : (
                <form className="p-form p-form-plain" onSubmit={(event) => submit(event, active)}>
                  <label>
                    Tu entrega
                    <textarea
                      name="content"
                      rows={5}
                      defaultValue={currentSubmission?.content}
                      required
                      maxLength={5000}
                      placeholder="Escribe tu respuesta o pega un enlace a tu trabajo."
                    />
                  </label>
                  {currentSubmission && (
                    <p className="p-meta">
                      <Check size={15} /> Guardada el {formatDate(currentSubmission.submittedAt)}
                    </p>
                  )}
                  <button type="submit" className="p-button p-button-primary">
                    {currentSubmission ? 'Actualizar entrega' : 'Entregar actividad'}
                  </button>
                </form>
              ))}
            {!student && (
              <section className="p-submissions">
                <h3>Entregas</h3>
                {!submissions.length && (
                  <div className="p-empty">
                    <FileText size={23} />
                    <p>Aún no hay entregas para esta actividad.</p>
                  </div>
                )}
                {submissions.map((submission) => (
                  <details className="p-submission" key={submission.id}>
                    <summary>
                      <strong>
                        {workspace.students.find((person) => person.id === submission.studentId)?.name ?? 'Estudiante'}
                      </strong>
                      <span>{submission.score === undefined ? 'Por revisar' : `${submission.score}/20`}</span>
                    </summary>
                    <p className="p-long-text">{submission.content}</p>
                    {staff ? (
                      <form className="p-form p-form-plain" onSubmit={(event) => grade(event, submission)}>
                        <label>
                          Nota sobre 20
                          <input
                            name="score"
                            type="number"
                            min={0}
                            max={20}
                            step={0.5}
                            required
                            defaultValue={submission.score}
                          />
                        </label>
                        <label>
                          Retroalimentación
                          <textarea rows={3} name="feedback" defaultValue={submission.feedback} required maxLength={1600} />
                        </label>
                        <button type="submit" className="p-button p-button-primary">
                          Guardar calificación
                        </button>
                      </form>
                    ) : (
                      submission.feedback && <p>{submission.feedback}</p>
                    )}
                  </details>
                ))}
              </section>
            )}
          </article>
        )}

        {!active && activities.length > 0 && (
          <div className="p-card p-empty p-activity-placeholder">
            <BookOpen size={30} />
            <p>Selecciona una actividad para ver los detalles.</p>
          </div>
        )}
      </div>
    </section>
  )
}
