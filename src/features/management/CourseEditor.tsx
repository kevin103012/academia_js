import { ChevronDown, ChevronUp, Pencil, Plus, Trash2 } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { courseMaterial, moveItem, newLesson } from '../../services'
import type { Lesson } from '../../types/learning'
import type { ClassSchedule, Commit, Course, Workspace } from '../../types/workspace'
import { scheduledDates, scheduleError, weekdayOptions } from '../../utils/attendance'
import { formatDate } from '../../utils/date'
import { LessonEditor } from './LessonEditor'
import '../../styles/attendance.css'
import '../../styles/course-editor.css'

interface CourseEditorProps {
  course: Course
  workspace: Workspace
  commit: Commit
  onBack: () => void
}

export function CourseEditor({ course, workspace, commit, onBack }: CourseEditorProps) {
  const [open, setOpen] = useState<{ lesson: Lesson; isNew: boolean }>()
  const [confirmId, setConfirmId] = useState<string>()
  const [scheduleMessage, setScheduleMessage] = useState<string>()
  const [scheduleSaved, setScheduleSaved] = useState<string>()
  const { lessons } = courseMaterial(course)
  const activities = workspace.activities.filter((activity) => activity.courseId === course.id)
  const totalMinutes = lessons.reduce((sum, lesson) => sum + (Number.isFinite(lesson.minutes) ? lesson.minutes : 0), 0)

  // Solo se listan respuestas de ejercicios que siguen en el curso.
  const exercises = new Map(
    lessons
      .flatMap((lesson) => [
        ...(lesson.blocks ?? []).map((block) => ({ block, place: lesson.title })),
        ...(lesson.sublessons ?? []).flatMap((sublesson) =>
          sublesson.blocks.map((block) => ({ block, place: `${lesson.title} · ${sublesson.title}` })),
        ),
      ])
      .map((item) => [item.block.id, item] as const),
  )
  const answers = (workspace.exerciseAnswers ?? []).flatMap((answer) => {
    const exercise = answer.courseId === course.id ? exercises.get(answer.blockId) : undefined
    return exercise && (exercise.block.kind === 'choice' || exercise.block.kind === 'text')
      ? [{ answer, block: exercise.block, place: exercise.place }]
      : []
  })

  function changeLessons(action: string, update: (current: Lesson[]) => Lesson[]) {
    commit(action, (current) => ({
      ...current,
      courses: current.courses.map((item) =>
        item.id === course.id ? { ...item, lessons: update(courseMaterial(item).lessons) } : item,
      ),
    }))
    setConfirmId(undefined)
  }

  function saveLesson(lesson: Lesson, isNew: boolean) {
    changeLessons(`${isNew ? 'Creó' : 'Editó'} la lección «${lesson.title}» de «${course.name}»`, (current) =>
      current.some((item) => item.id === lesson.id)
        ? current.map((item) => (item.id === lesson.id ? lesson : item))
        : [...current, lesson],
    )
    setOpen(undefined)
  }

  function saveSchedule(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const data = new FormData(event.currentTarget)
    const schedule: ClassSchedule = {
      weekdays: data.getAll('weekday').map(Number).sort((a, b) => a - b),
      startDate: String(data.get('start') ?? ''),
      endDate: String(data.get('end') ?? ''),
    }
    const error = scheduleError(schedule)
    setScheduleMessage(error)
    setScheduleSaved(undefined)
    if (error) return
    const total = scheduledDates(schedule).length
    setScheduleSaved(`Horario guardado: ${total} ${total === 1 ? 'clase' : 'clases'}. Ya aparecen en la asistencia de este curso.`)
    commit(`Definió el horario de clases de «${course.name}»`, (current) => ({
      ...current,
      courses: current.courses.map((item) => (item.id === course.id ? { ...item, schedule } : item)),
    }))
  }

  function clearSchedule() {
    setScheduleMessage(undefined)
    setScheduleSaved(undefined)
    commit(`Quitó el horario de clases de «${course.name}»`, (current) => ({
      ...current,
      courses: current.courses.map((item) => (item.id === course.id ? { ...item, schedule: undefined } : item)),
    }))
  }

  function saveDates(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const data = new FormData(event.currentTarget)
    const assessmentDate = String(data.get('assessment') ?? '') || undefined
    const dates = new Map(activities.map((activity) => [activity.id, String(data.get(`due-${activity.id}`) ?? '')]))
    const changed =
      assessmentDate !== course.assessmentDate ||
      activities.some((activity) => dates.get(activity.id) && dates.get(activity.id) !== activity.due)
    if (!changed) return
    commit(`Actualizó las fechas de evaluaciones de «${course.name}»`, (current) => ({
      ...current,
      courses: current.courses.map((item) => (item.id === course.id ? { ...item, assessmentDate } : item)),
      activities: current.activities.map((item) => ({ ...item, due: dates.get(item.id) || item.due })),
    }))
  }

  if (open) {
    return (
      <section>
        <header className="p-section-heading">
          <div>
            <h1>{open.isNew ? 'Nueva lección' : 'Editar lección'}</h1>
            <p>{course.name}</p>
          </div>
        </header>
        <LessonEditor
          key={open.lesson.id}
          lesson={open.lesson}
          onSave={(lesson) => saveLesson(lesson, open.isNew)}
          onCancel={() => setOpen(undefined)}
        />
      </section>
    )
  }

  return (
    <section>
      <header className="p-section-heading">
        <div>
          <h1>{course.name}</h1>
          <p>Lecciones, contenido, horario de clases y fechas de evaluación.</p>
        </div>
        <button type="button" className="p-button" onClick={onBack}>
          Volver a cursos
        </button>
      </header>
      <div className="p-editor-stack">
        <div className="p-card p-editor-panel">
          <div className="ce-head">
            <div>
              <h2>Lecciones</h2>
              <small>
                {lessons.length} {lessons.length === 1 ? 'lección' : 'lecciones'} · {totalMinutes} min
              </small>
            </div>
            <button type="button" className="p-button p-button-primary" onClick={() => setOpen({ lesson: newLesson(), isNew: true })}>
              <Plus size={16} aria-hidden="true" /> Nueva lección
            </button>
          </div>
          <ol className="ce-list">
            {lessons.map((lesson, index) => {
              const parts = lesson.sublessons?.length ?? 0
              return (
                <li className="ce-row" key={lesson.id}>
                  <span className="ce-num" aria-hidden="true">
                    {index + 1}
                  </span>
                  <div className="p-list-copy">
                    <strong>{lesson.title}</strong>
                    <small>
                      {lesson.minutes} min · {parts} {parts === 1 ? 'sublección' : 'sublecciones'}
                    </small>
                  </div>
                  <div className="ce-actions">
                    <button
                      type="button"
                      className="p-button p-button-short ce-icon"
                      aria-label={`Subir ${lesson.title}`}
                      title="Subir"
                      disabled={index === 0}
                      onClick={() => changeLessons(`Reordenó las lecciones de «${course.name}»`, (current) => moveItem(current, index, -1))}
                    >
                      <ChevronUp size={16} aria-hidden="true" />
                    </button>
                    <button
                      type="button"
                      className="p-button p-button-short ce-icon"
                      aria-label={`Bajar ${lesson.title}`}
                      title="Bajar"
                      disabled={index === lessons.length - 1}
                      onClick={() => changeLessons(`Reordenó las lecciones de «${course.name}»`, (current) => moveItem(current, index, 1))}
                    >
                      <ChevronDown size={16} aria-hidden="true" />
                    </button>
                    <button
                      type="button"
                      className="p-button p-button-short"
                      aria-label={`Editar ${lesson.title}`}
                      onClick={() => {
                        setConfirmId(undefined)
                        setOpen({ lesson, isNew: false })
                      }}
                    >
                      <Pencil size={14} aria-hidden="true" /> Editar
                    </button>
                    <button
                      type="button"
                      className={`p-button p-button-short tone-danger${confirmId === lesson.id ? '' : ' ce-icon'}`}
                      aria-label={`${confirmId === lesson.id ? 'Confirmar eliminación de' : 'Eliminar'} ${lesson.title}`}
                      title="Eliminar"
                      disabled={lessons.length === 1}
                      onClick={() =>
                        confirmId === lesson.id
                          ? changeLessons(`Eliminó la lección «${lesson.title}» de «${course.name}»`, (current) =>
                              current.filter((item) => item.id !== lesson.id),
                            )
                          : setConfirmId(lesson.id)
                      }
                    >
                      {confirmId === lesson.id ? 'Confirmar' : <Trash2 size={15} aria-hidden="true" />}
                    </button>
                  </div>
                </li>
              )
            })}
          </ol>
          {lessons.length === 1 && <p className="p-editor-hint">El curso debe conservar al menos una lección.</p>}
        </div>

        <form
          className="p-card p-form p-editor-panel"
          // Vuelve a cargar los campos cuando el horario cambia.
          key={JSON.stringify(course.schedule ?? null)}
          onSubmit={saveSchedule}
        >
          <h2>Horario de clases</h2>
          <p className="p-editor-hint">
            Define qué días toca clase. De aquí sale la cantidad de clases en la asistencia de cada alumno.
          </p>
          <fieldset className="att-weekdays">
            <legend>Días de clase</legend>
            {weekdayOptions.map((day) => (
              <label key={day.value} title={day.full}>
                <input
                  type="checkbox"
                  name="weekday"
                  value={day.value}
                  defaultChecked={course.schedule?.weekdays.includes(day.value)}
                />
                <span>{day.short}</span>
              </label>
            ))}
          </fieldset>
          <div className="att-dates">
            <label>
              Primer día del ciclo
              <input type="date" name="start" defaultValue={course.schedule?.startDate ?? ''} required />
            </label>
            <label>
              Último día del ciclo
              <input type="date" name="end" defaultValue={course.schedule?.endDate ?? ''} required />
            </label>
          </div>
          {course.schedule && (
            <p className="p-editor-hint">
              {scheduledDates(course.schedule).length} clases programadas en total.
            </p>
          )}
          {scheduleMessage && (
            <p className="p-warning" role="alert">
              {scheduleMessage}
            </p>
          )}
          {scheduleSaved && (
            <p className="p-editor-hint" role="status">
              {scheduleSaved}
            </p>
          )}
          <div className="att-form-actions">
            <button type="submit" className="p-button p-button-primary">
              Guardar horario
            </button>
            {course.schedule && (
              <button type="button" className="p-button" onClick={clearSchedule}>
                Quitar horario
              </button>
            )}
          </div>
        </form>

        <form
          className="p-card p-form p-editor-panel"
          // Vuelve a cargar los campos cuando las fechas cambian.
          key={[course.assessmentDate, ...activities.map((activity) => activity.due)].join('|')}
          onSubmit={saveDates}
        >
          <h2>Fechas de evaluaciones</h2>
          <label>
            Evaluación del curso (opcional)
            <input type="date" name="assessment" defaultValue={course.assessmentDate ?? ''} />
          </label>
          {activities.map((activity) => (
            <label key={activity.id}>
              {activity.title}
              <input type="date" name={`due-${activity.id}`} defaultValue={activity.due} required />
            </label>
          ))}
          {!activities.length && <p className="p-editor-hint">Este curso aún no tiene actividades con fecha de entrega.</p>}
          <button type="submit" className="p-button p-button-primary">
            Guardar fechas
          </button>
        </form>

        <div className="p-card p-editor-panel">
          <h2>Respuestas de alumnos</h2>
          {!answers.length && <p className="p-editor-hint">Aún no hay respuestas a los ejercicios.</p>}
          {answers.map(({ answer, block, place }) => (
            <div className="p-editor-row" key={`${answer.blockId}-${answer.studentId}`}>
              <div className="p-list-copy">
                <strong>{answer.studentName}</strong>
                <small>
                  {place} · {formatDate(answer.answeredAt)}
                </small>
                <small>{block.prompt}</small>
                <p className="p-long-text">{answer.response}</p>
              </div>
              {block.kind === 'choice' && (
                <span className="p-badge">{answer.response === block.options[block.answer] ? 'Correcta' : 'Incorrecta'}</span>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
