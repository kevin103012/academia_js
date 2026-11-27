import { useState, type FormEvent } from 'react'
import { demoUsers } from '../../data/demoUsers'
import { currentPeriod, periodPattern } from '../../services'
import type { CommunityGroup, GroupDetails } from '../../types/community'
import { courseCategories, type Course, type CourseCategoryId } from '../../types/workspace'

export function CreateGroupForm({
  onCreate,
}: {
  onCreate: (details: GroupDetails & { category: CourseCategoryId }) => void
}) {
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const data = new FormData(event.currentTarget)
    const value = (key: string) => String(data.get(key) ?? '').trim()
    const details = { name: value('name'), description: value('description'), pinnedNote: value('pinnedNote') }
    if (!details.name || !details.description) return
    onCreate({ ...details, category: value('category') as CourseCategoryId })
  }

  return (
    <form className="p-card p-form" onSubmit={submit}>
      <h2>Nuevo grupo de estudio</h2>
      <div className="p-form-row">
        <label>
          Nombre del grupo
          <input name="name" required maxLength={80} />
        </label>
        <label>
          Categoría
          <select name="category">
            {courseCategories.map((cat) => (
              <option key={cat.id} value={cat.id}>
                {cat.label}
              </option>
            ))}
          </select>
        </label>
      </div>
      <label>
        Descripción
        <textarea name="description" rows={3} required maxLength={300} />
      </label>
      <label>
        Nota fijada (opcional)
        <input name="pinnedNote" maxLength={200} />
      </label>
      <button type="submit" className="p-button p-button-primary">
        Crear grupo
      </button>
    </form>
  )
}

export function AssignGroupForm({
  courses,
  groups,
  onAssign,
}: {
  courses: Course[]
  groups: CommunityGroup[]
  onAssign: (course: Course, period: string, teacherName: string) => void
}) {
  const [courseId, setCourseId] = useState(courses[0]?.id ?? '')
  const [period, setPeriod] = useState(() => currentPeriod())
  const [chosenTeacher, setChosenTeacher] = useState<string>()
  const course = courses.find((item) => item.id === courseId)
  const existing = groups.find((group) => group.courseId === courseId && group.period === period)
  const teachers = Array.from(
    new Set([
      ...demoUsers.filter((user) => user.role === 'teacher').map((user) => user.name),
      ...courses.map((item) => item.teacher),
    ]),
  )
  const teacherName = chosenTeacher ?? existing?.managerName ?? course?.teacher ?? ''
  const assigned = groups.filter((group) => group.courseId)

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (course && periodPattern.test(period)) onAssign(course, period, teacherName)
  }

  return (
    <form className="p-card p-form" onSubmit={submit}>
      <h2>Asignar grupo a un curso</h2>
      <label>
        Curso
        <select
          value={courseId}
          onChange={(event) => {
            setCourseId(event.target.value)
            setChosenTeacher(undefined)
          }}
        >
          {courses.map((item) => (
            <option key={item.id} value={item.id}>
              {item.name}
            </option>
          ))}
        </select>
      </label>
      <div className="p-form-row">
        <label>
          Periodo (ej. 2026-II)
          <input
            value={period}
            required
            pattern="\d{4}-(I|II)"
            maxLength={7}
            onChange={(event) => {
              setPeriod(event.target.value.toUpperCase())
              setChosenTeacher(undefined)
            }}
          />
        </label>
        <label>
          Docente responsable
          <select value={teacherName} onChange={(event) => setChosenTeacher(event.target.value)}>
            {teachers.map((name) => (
              <option key={name}>{name}</option>
            ))}
          </select>
        </label>
      </div>
      {existing && <p className="p-meta">Este curso ya tiene grupo en {period}. Solo puedes cambiar su docente.</p>}
      <button
        type="submit"
        className="p-button p-button-primary"
        disabled={!course || existing?.managerName === teacherName}
      >
        {existing ? 'Cambiar docente' : 'Asignar grupo'}
      </button>
      {assigned.length > 0 && (
        <>
          <h3>Grupos asignados</h3>
          <ul>
            {assigned.map((group) => (
              <li className="p-meta" key={group.id}>
                {group.name} — {group.managerName}
              </li>
            ))}
          </ul>
        </>
      )}
    </form>
  )
}
