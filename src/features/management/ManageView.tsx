import { BookOpen, Plus, Search, UsersRound } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { SegmentedControl } from '../../components/ui/SegmentedControl'
import type { DemoUser } from '../../types/auth'
import { courseCategories, type Commit, type Course, type CourseCategoryId, type Workspace } from '../../types/workspace'
import { createId } from '../../utils/id'
import { initials } from '../../utils/text'
import { CourseAttendance } from './CourseAttendance'
import { CourseEditor } from './CourseEditor'

interface ManageViewProps {
  user: DemoUser
  workspace: Workspace
  commit: Commit
}

type ManagementTab = 'courses' | 'students'

const managementTabs = [
  { value: 'courses', label: 'Catálogo', icon: <BookOpen size={17} aria-hidden="true" /> },
  { value: 'students', label: 'Estudiantes', icon: <UsersRound size={17} aria-hidden="true" /> },
] as const

export function ManageView({ user, workspace, commit }: ManageViewProps) {
  const [tab, setTab] = useState<ManagementTab>('courses')
  const [editing, setEditing] = useState<string>()
  const [query, setQuery] = useState('')
  const [attendanceId, setAttendanceId] = useState<string>()
  const [contentId, setContentId] = useState<string>()
  const isAdmin = user.role === 'admin'
  const course = workspace.courses.find((item) => item.id === editing)
  const matches = (value: string) => value.toLocaleLowerCase('es').includes(query.trim().toLocaleLowerCase('es'))
  const courses = workspace.courses.filter(
    (item) => (isAdmin || item.teacher === user.name) && matches(`${item.name} ${item.group}`),
  )
  const students = workspace.students.filter((student) => matches(`${student.name} ${student.group}`))

  function selectTab(next: ManagementTab) {
    setTab(next)
    setEditing(undefined)
    setQuery('')
  }

  function saveCourse(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const data = new FormData(event.currentTarget)
    const name = String(data.get('name') ?? '').trim()
    const category = (String(data.get('category') ?? '') || 'frameworks') as CourseCategoryId
    const group = String(data.get('group') ?? '').trim()
    const description = String(data.get('description') ?? '').trim()
    if (!name || !group || !description) return
    // Solo administración puede crear cursos; el docente edita los que tiene a cargo.
    if (!course && !isAdmin) return
    const next: Course = {
      ...course,
      id: course?.id ?? createId(),
      category,
      teacher: course?.teacher ?? 'Mateo Salazar',
      color: course?.color ?? 'teal',
      name,
      group,
      description,
    }
    commit(`${course ? 'Actualizó' : 'Creó'} el curso «${name}»`, (current) => ({
      ...current,
      courses: course ? current.courses.map((item) => (item.id === next.id ? next : item)) : [...current.courses, next],
    }))
    setEditing(undefined)
    setQuery('')
  }

  function addStudent(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const data = new FormData(event.currentTarget)
    const name = String(data.get('name') ?? '').trim()
    const group = String(data.get('group') ?? '').trim()
    if (!name || !group) return
    const next = { id: createId(), name, group }
    commit(`Registró a ${name} en el padrón`, (current) => ({ ...current, students: [...current.students, next] }))
    setEditing(undefined)
    setQuery('')
  }

  const attendanceCourse = workspace.courses.find(
    (item) => item.id === attendanceId && (isAdmin || item.teacher === user.name),
  )
  if (attendanceCourse) {
    return (
      <CourseAttendance
        key={attendanceCourse.id}
        course={attendanceCourse}
        workspace={workspace}
        commit={commit}
        onBack={() => setAttendanceId(undefined)}
      />
    )
  }

  const contentCourse = workspace.courses.find(
    (item) => item.id === contentId && (isAdmin || item.teacher === user.name),
  )
  if (contentCourse) {
    return (
      <CourseEditor
        key={contentCourse.id}
        course={contentCourse}
        workspace={workspace}
        commit={commit}
        onBack={() => setContentId(undefined)}
      />
    )
  }

  return (
    <section>
      <header className="p-section-heading">
        <div>
          <h1>{isAdmin ? 'Administración' : 'Gestión de cursos'}</h1>
          <p>
            {isAdmin
              ? 'Mantén actualizado el catálogo y el padrón académico.'
              : 'Edita tus cursos, sus lecciones y fechas de evaluación, y registra la asistencia.'}
          </p>
        </div>
        {(isAdmin || editing) && (
          <button className="p-button p-button-primary" onClick={() => setEditing(editing ? undefined : 'new')}>
            {editing ? 'Cancelar' : tab === 'courses' ? 'Crear curso' : 'Registrar estudiante'}
            {!editing && <Plus size={17} />}
          </button>
        )}
      </header>
      <div className="p-manage-bar">
        {isAdmin && (
          <SegmentedControl className="p-tabs" label="Administración" options={managementTabs} value={tab} onChange={selectTab} />
        )}
        <label className="p-search">
          <Search size={16} />
          <span className="p-sr-only">Buscar {tab === 'courses' ? 'cursos' : 'estudiantes'}</span>
          <input
            type="search"
            placeholder={tab === 'courses' ? 'Buscar cursos' : 'Buscar estudiantes'}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </label>
      </div>
      {editing && (
        <form className="p-card p-form" key={tab + editing} onSubmit={tab === 'courses' ? saveCourse : addStudent}>
          <h2>{tab === 'courses' ? (course ? 'Editar curso' : 'Nuevo curso') : 'Nuevo registro de estudiante'}</h2>
          <label>
            {tab === 'courses' ? 'Nombre del curso' : 'Nombre completo'}
            <input required maxLength={100} name="name" defaultValue={course?.name} />
          </label>
          {tab === 'courses' && (
            <label>
              Categoría académica
              <select name="category" defaultValue={course?.category ?? 'frameworks'}>
                {courseCategories.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.label}
                  </option>
                ))}
              </select>
            </label>
          )}
          <label>
            Grupo
            <input required maxLength={90} name="group" defaultValue={course?.group ?? 'Ing. de Sistemas · Ciclo III'} />
          </label>
          {tab === 'courses' && (
            <label>
              Descripción
              <textarea name="description" rows={4} required maxLength={600} defaultValue={course?.description} />
            </label>
          )}
          <button type="submit" className="p-button p-button-primary">
            Guardar {tab === 'courses' ? 'curso' : 'registro'}
          </button>
        </form>
      )}
      <div className="p-card p-roster">
        {tab === 'courses' &&
          courses.map((item) => {
            const cat = courseCategories.find((c) => c.id === item.category)
            return (
              <div className="p-person" key={item.id}>
                <span className={`p-kind-icon p-${item.color}`}>
                  <BookOpen size={20} />
                </span>
                <div className="p-list-copy">
                  <strong>
                    {item.name}{' '}
                    {cat && <span className="p-badge tone-soft-accent">{cat.shortLabel}</span>}
                  </strong>
                  <small>
                    {cat?.label ?? item.category} · {item.group} · {item.teacher}
                  </small>
                </div>
                <button
                  className="p-button p-button-short"
                  type="button"
                  aria-label={`Lecciones y fechas de ${item.name}`}
                  onClick={() => {
                    setEditing(undefined)
                    setContentId(item.id)
                  }}
                >
                  Lecciones
                </button>
                <button
                  className="p-button p-button-short"
                  type="button"
                  aria-label={`Asistencia de ${item.name}`}
                  onClick={() => {
                    setEditing(undefined)
                    setAttendanceId(item.id)
                  }}
                >
                  Asistencia
                </button>
                <button
                  className="p-button p-button-short"
                  type="button"
                  aria-label={`Editar ${item.name}`}
                  onClick={() => setEditing(item.id)}
                >
                  Editar
                </button>
              </div>
            )
          })}
        {tab === 'students' &&
          students.map((item) => (
            <div className="p-person" key={item.id}>
              <span className="p-avatar">{initials(item.name)}</span>
              <div className="p-list-copy">
                <strong>{item.name}</strong>
                <small>{item.group}</small>
              </div>
            </div>
          ))}
        {(tab === 'courses' ? !courses.length : !students.length) && (
          <div className="p-empty">
            <Search size={25} />
            <p>No encontramos resultados para esta búsqueda.</p>
          </div>
        )}
      </div>
    </section>
  )
}
