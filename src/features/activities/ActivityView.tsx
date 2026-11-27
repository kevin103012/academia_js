import { BookOpen, ChevronRight } from 'lucide-react'
import { useState } from 'react'
import type { DemoUser } from '../../types/auth'
import type { Commit, Course, Workspace } from '../../types/workspace'
import { belongsToCourse } from '../../utils/roster'
import { CourseActivities } from './CourseActivities'

type ActivityViewProps = {
  user: DemoUser
  workspace: Workspace
  commit: Commit
}

export function ActivityView({ user, workspace, commit }: ActivityViewProps) {
  const [courseId, setCourseId] = useState<string>()
  const student = user.role === 'student'
  const teacher = user.role === 'teacher'
  // El docente ve los cursos a su cargo; el alumno, los suyos; coordinación y administración, todos.
  const courses = workspace.courses.filter((course) => {
    if (teacher) return course.teacher === user.name
    if (student) {
      return belongsToCourse(workspace, course, {
        id: user.id,
        group: workspace.students.find((item) => item.id === user.id)?.group ?? '',
      })
    }
    return true
  })
  const course = courses.find((item) => item.id === courseId)

  if (course) {
    return (
      <CourseActivities
        key={course.id}
        user={user}
        course={course}
        workspace={workspace}
        commit={commit}
        onBack={() => setCourseId(undefined)}
      />
    )
  }

  function summary(item: Course) {
    const ids = workspace.activities.filter((activity) => activity.courseId === item.id).map((activity) => activity.id)
    const total = `${ids.length} ${ids.length === 1 ? 'actividad' : 'actividades'}`
    if (student) {
      const pending = ids.filter(
        (id) => !workspace.submissions.some((entry) => entry.activityId === id && entry.studentId === user.id),
      ).length
      return { total, alert: pending ? `${pending} sin entregar` : '' }
    }
    const toReview = workspace.submissions.filter(
      (entry) => ids.includes(entry.activityId) && entry.score === undefined,
    ).length
    return { total, alert: toReview ? `${toReview} por revisar` : '' }
  }

  return (
    <section aria-labelledby="activities-title">
      <header className="p-section-heading">
        <div>
          <h1 id="activities-title">Actividades</h1>
          <p>
            {student
              ? 'Elige un curso para ver sus actividades y tus entregas.'
              : 'Elige un curso para ver sus actividades y quiénes las entregaron.'}
          </p>
        </div>
        <span className="p-badge">
          {courses.length} {courses.length === 1 ? 'curso' : 'cursos'}
        </span>
      </header>
      <div className="p-card p-list">
        {courses.map((item) => {
          const { total, alert } = summary(item)
          return (
            <button type="button" key={item.id} className="p-list-action" onClick={() => setCourseId(item.id)}>
              <span className={`p-kind-icon p-${item.color}`}>
                <BookOpen size={20} aria-hidden="true" />
              </span>
              <span className="p-list-copy">
                <strong>{item.name}</strong>
                <small>
                  {item.group} · {!teacher && `${item.teacher} · `}
                  {total}
                </small>
              </span>
              {alert && <span className="p-badge tone-soft-accent">{alert}</span>}
              <ChevronRight size={18} aria-hidden="true" />
            </button>
          )
        })}
        {!courses.length && (
          <div className="p-empty">
            <BookOpen size={26} />
            <p>
              {student
                ? 'Matricúlate en un curso desde «Cursos» para ver sus actividades.'
                : 'No tienes cursos a cargo.'}
            </p>
          </div>
        )}
      </div>
    </section>
  )
}
