import {
  BookOpen,
  CalendarDays,
  Check,
  CheckCircle2,
  ClipboardList,
  Clock3,
  Edit3,
  Plus,
  UsersRound,
  X,
} from 'lucide-react'
import { useEffect, useState, type FormEvent } from 'react'
import type { DemoUser } from '../../types/auth'
import type { Activity, Commit, Course, Submission, Workspace } from '../../types/workspace'
import { dateKey, formatDate } from '../../utils/date'
import { canSeeCourse, courseRoster } from '../../utils/campusAccess'
import { createId } from '../../utils/id'
import { initials } from '../../utils/text'

type ActivityViewProps = {
  user: DemoUser
  workspace: Workspace
  commit: Commit
}

type RosterFilter = 'all' | 'done' | 'missing'

const activityTypeLabels: Record<NonNullable<Activity['activityType']>, string> = {
  practica: 'Práctica',
  laboratorio: 'Laboratorio',
  evaluacion: 'Evaluación',
  proyecto: 'Proyecto',
}

function studentSubmissionStatus(activity: Activity, submission?: Submission) {
  if (submission?.score !== undefined) return 'Calificada'
  if (submission) return 'Entregada'
  return activity.due < dateKey() ? 'Vencida' : 'Pendiente'
}

export function ActivityView({ user, workspace, commit }: ActivityViewProps) {
  const isTeacher = user.role === 'teacher'
  const isStaff = user.role !== 'student'
  const isStudent = user.role === 'student'

  const availableCourses: Course[] = workspace.courses.filter((course) => canSeeCourse(user, workspace, course.id))

  const [selectedCourseId, setSelectedCourseId] = useState<string>(() => availableCourses[0]?.id ?? '')
  const [activeId, setActiveId] = useState<string | undefined>(undefined)
  const [formMode, setFormMode] = useState<'none' | 'create' | 'edit'>('none')
  const [rosterFilter, setRosterFilter] = useState<RosterFilter>('all')

  const selectedCourse = availableCourses.find((c) => c.id === selectedCourseId) ?? availableCourses[0]
  const enrolledStudents = selectedCourse ? courseRoster(workspace, selectedCourse) : []

  const courseActivities = workspace.activities
    .filter((activity) => activity.courseId === selectedCourse?.id)
    .sort((a, b) => a.due.localeCompare(b.due))

  useEffect(() => {
    if (!selectedCourse) return
    if (activeId && !courseActivities.some((a) => a.id === activeId)) {
      setActiveId(courseActivities[0]?.id)
    } else if (!activeId && courseActivities.length && formMode === 'none') {
      setActiveId(courseActivities[0].id)
    }
  }, [selectedCourse, courseActivities, activeId, formMode])

  const active = courseActivities.find((activity) => activity.id === activeId)
  const submissions = workspace.submissions.filter((submission) => submission.activityId === active?.id)
  const currentSubmission = submissions.find((submission) => submission.studentId === user.id)

  function selectCourse(courseId: string) {
    setSelectedCourseId(courseId)
    const firstInCourse = workspace.activities
      .filter((a) => a.courseId === courseId)
      .sort((a, b) => a.due.localeCompare(b.due))[0]
    setActiveId(firstInCourse?.id)
    setFormMode('none')
    setRosterFilter('all')
  }

  function saveActivity(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!selectedCourse || !isStaff) return
    const form = new FormData(event.currentTarget)
    const title = String(form.get('title') ?? '').trim()
    const instructions = String(form.get('instructions') ?? '').trim()
    const due = String(form.get('due') ?? '')
    const activityType = String(form.get('activityType') ?? 'practica') as Activity['activityType']
    if (!title || !instructions || !due) return

    if (formMode === 'edit' && active) {
      const updated: Activity = {
        ...active,
        title,
        instructions,
        due,
        activityType,
      }
      commit(`Actualizó la actividad «${title}» en «${selectedCourse.name}»`, (current) => ({
        ...current,
        activities: current.activities.map((item) => (item.id === updated.id ? updated : item)),
      }))
      setFormMode('none')
      setActiveId(updated.id)
      return
    }

    const created: Activity = {
      id: createId(),
      courseId: selectedCourse.id,
      title,
      instructions,
      due,
      activityType,
    }
    commit(`Publicó la actividad «${title}» en «${selectedCourse.name}»`, (current) => ({
      ...current,
      activities: [...current.activities, created],
    }))
    setFormMode('none')
    setActiveId(created.id)
  }

  function submitWork(event: FormEvent<HTMLFormElement>, activity: Activity) {
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

  function gradeSubmission(event: FormEvent<HTMLFormElement>, submission: Submission) {
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

  const studentRoster = enrolledStudents.map((studentPerson) => {
    const sub = submissions.find((s) => s.studentId === studentPerson.id)
    return {
      student: studentPerson,
      submission: sub,
      done: Boolean(sub),
    }
  })

  const doneCount = studentRoster.filter((r) => r.done).length
  const missingCount = studentRoster.length - doneCount
  const filteredRoster = studentRoster.filter((row) =>
    rosterFilter === 'all' ? true : rosterFilter === 'done' ? row.done : !row.done,
  )

  return (
    <section aria-labelledby="activities-title">
      <header className="p-section-heading">
        <div>
          <h1 id="activities-title">Actividades por curso</h1>
          <p>
            {isTeacher
              ? 'Selecciona uno de tus cursos asignados para administrar sus actividades y verificar qué alumnos cumplieron.'
              : isStudent
                ? 'Selecciona tu curso, revisa la consigna y registra o consulta tu calificación.'
                : 'Supervisa las actividades dentro de cada curso y el cumplimiento completo de los estudiantes.'}
          </p>
        </div>
        {selectedCourse && isStaff && (
          <div className="p-heading-actions">
            <button
              type="button"
              className="p-button p-button-primary"
              onClick={() => setFormMode(formMode === 'create' ? 'none' : 'create')}
            >
              <span>{formMode === 'create' ? 'Cerrar editor' : 'Nueva actividad en este curso'}</span>
              {formMode === 'create' ? <X size={16} /> : <Plus size={16} />}
            </button>
          </div>
        )}
      </header>

      <div className="p-act-course-grid" role="tablist" aria-label="Cursos disponibles">
        {availableCourses.map((course) => {
          const count = workspace.activities.filter((a) => a.courseId === course.id).length
          const isSelected = selectedCourse?.id === course.id
          return (
            <button
              key={course.id}
              type="button"
              role="tab"
              aria-selected={isSelected}
              className={`p-card p-act-course-card${isSelected ? ' is-selected' : ''}`}
              onClick={() => selectCourse(course.id)}
            >
              <div className="p-act-course-top">
                <span className={`p-kind-icon p-${course.color}`}>
                  <BookOpen size={18} aria-hidden="true" />
                </span>
                <span className="p-badge tone-soft-accent">
                  {count} {count === 1 ? 'actividad' : 'actividades'}
                </span>
              </div>
              <strong>{course.name}</strong>
              <small>
                {course.group} · {course.teacher}
              </small>
            </button>
          )
        })}
      </div>

      {formMode !== 'none' && isStaff && selectedCourse && (
        <form
          className="p-card p-form"
          key={`${selectedCourse.id}-${formMode}-${active?.id ?? 'new'}`}
          onSubmit={saveActivity}
        >
          <h2>
            {formMode === 'edit' && active
              ? `Editar actividad en ${selectedCourse.name}`
              : `Nueva actividad en ${selectedCourse.name}`}
          </h2>
          <div className="p-form-workbench">
            <div className="p-form-col">
              <label htmlFor="act-title">
                Título de la actividad
                <input
                  id="act-title"
                  name="title"
                  required
                  maxLength={100}
                  defaultValue={formMode === 'edit' ? active?.title : ''}
                  placeholder="Ej. Implementación PWM y lectura de sensores"
                />
              </label>
              <div className="p-form-row">
                <label htmlFor="act-type">
                  Tipo de actividad
                  <select
                    id="act-type"
                    name="activityType"
                    defaultValue={formMode === 'edit' ? active?.activityType ?? 'practica' : 'practica'}
                  >
                    <option value="practica">Práctica</option>
                    <option value="laboratorio">Laboratorio</option>
                    <option value="evaluacion">Evaluación</option>
                    <option value="proyecto">Proyecto</option>
                  </select>
                </label>
                <label htmlFor="act-due">
                  Fecha límite de entrega
                  <input
                    id="act-due"
                    name="due"
                    type="date"
                    defaultValue={formMode === 'edit' ? active?.due : dateKey()}
                    required
                  />
                </label>
              </div>
              <div className="p-actions-row">
                <button className="p-button p-button-primary" type="submit">
                  {formMode === 'edit' ? 'Guardar cambios' : 'Publicar en el curso'}
                </button>
                <button className="p-button" type="button" onClick={() => setFormMode('none')}>
                  Cancelar
                </button>
              </div>
            </div>
            <div className="p-form-col--stretch">
              <label className="p-form-label-grow" htmlFor="act-instructions">
                Indicaciones, entregable esperado y criterios de evaluación
                <textarea
                  id="act-instructions"
                  name="instructions"
                  rows={5}
                  required
                  maxLength={2000}
                  defaultValue={formMode === 'edit' ? active?.instructions : ''}
                  placeholder="Detalla qué debe presentar el alumno y cómo se evaluará..."
                />
              </label>
            </div>
          </div>
        </form>
      )}

      {selectedCourse && (
        <div className="p-activity-layout">
          <div className="p-card p-list">
            <div className="p-act-list-head">
              <strong>Actividades de {selectedCourse.name}</strong>
              <span className="p-badge">
                {courseActivities.length} {courseActivities.length === 1 ? 'ítem' : 'ítems'}
              </span>
            </div>
            {courseActivities.length ? (
              courseActivities.map((activity) => {
                const personal = workspace.submissions.find(
                  (item) => item.activityId === activity.id && item.studentId === user.id,
                )
                const submissionCount = workspace.submissions.filter((item) => item.activityId === activity.id).length
                const status = studentSubmissionStatus(activity, personal)
                const typeLabel = activityTypeLabels[activity.activityType ?? 'practica']
                return (
                  <button
                    key={activity.id}
                    type="button"
                    className="p-list-action"
                    aria-pressed={activity.id === active?.id}
                    onClick={() => {
                      setActiveId(activity.id)
                      setFormMode('none')
                      setRosterFilter('all')
                    }}
                  >
                    <span className={`p-kind-icon p-${selectedCourse.color}`}>
                      <ClipboardList size={19} />
                    </span>
                    <span className="p-list-copy">
                      <strong>{activity.title}</strong>
                      <small>
                        {typeLabel} · Límite: {formatDate(activity.due)}
                      </small>
                    </span>
                    <span className={`p-badge${status === 'Calificada' && isStudent ? ' tone-soft-accent' : ''}`}>
                      {isStudent ? status : `${submissionCount}/${enrolledStudents.length} realizaron`}
                    </span>
                  </button>
                )
              })
            ) : (
              <div className="p-empty">
                <ClipboardList size={26} />
                <p>Este curso aún no tiene actividades publicadas.</p>
                {isStaff && (
                  <button type="button" className="p-button p-button-primary" onClick={() => setFormMode('create')}>
                    <Plus size={15} /> Crear primera actividad
                  </button>
                )}
              </div>
            )}
          </div>

          {active ? (
            <article className="p-card p-activity-detail" aria-label="Detalle de actividad" key={active.id}>
              <div className="p-card-head">
                <div>
                  <span className="p-badge tone-soft-accent">
                    {activityTypeLabels[active.activityType ?? 'practica']} · {selectedCourse.name}
                  </span>
                  <h2>{active.title}</h2>
                </div>
                {isStaff && (
                  <button
                    type="button"
                    className="p-button"
                    onClick={() => setFormMode(formMode === 'edit' ? 'none' : 'edit')}
                  >
                    <Edit3 size={15} aria-hidden="true" />
                    <span>{formMode === 'edit' ? 'Cerrar' : 'Modificar'}</span>
                  </button>
                )}
              </div>

              <p className="p-meta">
                <CalendarDays size={15} aria-hidden="true" /> Fecha límite:{' '}
                {formatDate(active.due, { day: 'numeric', month: 'long', year: 'numeric' })}
              </p>
              <p className="p-long-text">{active.instructions}</p>

              {isStudent &&
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
                  <form className="p-form p-form-plain" onSubmit={(event) => submitWork(event, active)}>
                    <label>
                      Tu respuesta o enlace de repositorio
                      <textarea
                        name="content"
                        rows={5}
                        defaultValue={currentSubmission?.content}
                        required
                        maxLength={5000}
                        placeholder="Describe tu solución o pega el enlace al repositorio/informe."
                      />
                    </label>
                    {currentSubmission && (
                      <p className="p-meta">
                        <Check size={15} /> Última entrega guardada el {formatDate(currentSubmission.submittedAt)}
                      </p>
                    )}
                    <button type="submit" className="p-button p-button-primary">
                      {currentSubmission ? 'Actualizar entrega' : 'Entregar actividad'}
                    </button>
                  </form>
                ))}

              {!isStudent && (
                <section className="p-roster-compliance" aria-label="Cumplimiento de alumnos">
                  <div className="p-roster-compliance-head">
                    <div>
                      <h3>
                        <UsersRound size={16} aria-hidden="true" /> Alumnos que realizaron la actividad
                      </h3>
                      <small>
                        {doneCount} realizaron · {missingCount} pendientes de {studentRoster.length} alumnos
                      </small>
                    </div>
                    <div className="p-roster-filter-pills" role="group" aria-label="Filtrar cumplimiento">
                      <button
                        type="button"
                        className={`ai-mini-btn ${rosterFilter === 'all' ? 'tone-accent' : 'tone-pill'}`}
                        onClick={() => setRosterFilter('all')}
                      >
                        Todos ({studentRoster.length})
                      </button>
                      <button
                        type="button"
                        className={`ai-mini-btn ${rosterFilter === 'done' ? 'tone-accent' : 'tone-pill'}`}
                        onClick={() => setRosterFilter('done')}
                      >
                        Realizaron ({doneCount})
                      </button>
                      <button
                        type="button"
                        className={`ai-mini-btn ${rosterFilter === 'missing' ? 'tone-accent' : 'tone-pill'}`}
                        onClick={() => setRosterFilter('missing')}
                      >
                        Sin realizar ({missingCount})
                      </button>
                    </div>
                  </div>

                  <div className="p-roster-compliance-list">
                    {filteredRoster.map(({ student: person, submission }) => (
                      <div key={person.id} className="p-compliance-item">
                        <div className="p-compliance-summary">
                          <div className="p-compliance-person">
                            <span className="p-avatar">{initials(person.name)}</span>
                            <div>
                              <strong>{person.name}</strong>
                              <small>{person.group}</small>
                            </div>
                          </div>
                          {submission ? (
                            <span className="p-badge tone-soft-accent">
                              <CheckCircle2 size={13} aria-hidden="true" />{' '}
                              {submission.score !== undefined
                                ? `Calificada · ${submission.score}/20`
                                : `Realizó el ${formatDate(submission.submittedAt)}`}
                            </span>
                          ) : (
                            <span className="p-badge p-badge-warn">
                              <Clock3 size={13} aria-hidden="true" /> No la realizó
                            </span>
                          )}
                        </div>

                        {submission && (
                          <div className="p-compliance-body">
                            <p className="p-long-text">{submission.content}</p>
                            {isStaff ? (
                              <form className="p-grade-inline" onSubmit={(event) => gradeSubmission(event, submission)}>
                                <label>
                                  Nota (0–20)
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
                                  <input
                                    name="feedback"
                                    defaultValue={submission.feedback}
                                    required
                                    maxLength={1600}
                                    placeholder="Comentario técnico para el estudiante..."
                                  />
                                </label>
                                <button type="submit" className="p-button p-button-primary">
                                  Calificar
                                </button>
                              </form>
                            ) : (
                              submission.feedback && (
                                <p className="p-meta">Retroalimentación: {submission.feedback}</p>
                              )
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </section>
              )}
            </article>
          ) : (
            <div className="p-card p-empty p-activity-placeholder">
              <BookOpen size={30} />
              <p>Selecciona una actividad del curso para ver los detalles y el estado de los alumnos.</p>
            </div>
          )}
        </div>
      )}
    </section>
  )
}
