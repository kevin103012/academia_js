import { BookOpen, Check, Clock3, KeyRound, Plus, Search, Trash2, UserCheck, UsersRound, X } from 'lucide-react'
import { useEffect, useState, type FormEvent } from 'react'
import { env } from '../../config/env'
import { SegmentedControl } from '../../components/ui/SegmentedControl'
import { communityService, workspaceService } from '../../services'
import { teachesCourse } from '../../utils/campusAccess'
import type { DemoUser } from '../../types/auth'
import {
  courseCategories,
  type AcademicPeriod,
  type AccessRequest,
  type Commit,
  type Course,
  type CourseCategoryId,
  type Workspace,
} from '../../types/workspace'
import { dateKey, formatDate } from '../../utils/date'
import { createId } from '../../utils/id'
import { initials } from '../../utils/text'

interface ManageViewProps {
  user: DemoUser
  workspace: Workspace
  commit: Commit
  notify?: (message: string) => void
}

type ManagementTab = 'courses' | 'students' | 'periods' | 'requests'

const tabs = [
  { value: 'courses' as const, label: 'Cursos', icon: <BookOpen size={16} aria-hidden="true" /> },
  { value: 'students' as const, label: 'Bloques', icon: <UsersRound size={16} aria-hidden="true" /> },
  { value: 'periods' as const, label: 'Periodos', icon: <Clock3 size={16} aria-hidden="true" /> },
  { value: 'requests' as const, label: 'Solicitudes', icon: <UserCheck size={16} aria-hidden="true" /> },
]

export function ManageView({ user, workspace, commit, notify }: ManageViewProps) {
  const [tab, setTab] = useState<ManagementTab>('courses')
  const [editing, setEditing] = useState<string>()
  const [query, setQuery] = useState('')
  const [block, setBlock] = useState('Todos')
  const [addingPeriod, setAddingPeriod] = useState(false)
  const [editingPeriodId, setEditingPeriodId] = useState<string>()
  const [processingRequestId, setProcessingRequestId] = useState<string>()
  const [instructors, setInstructors] = useState<{id: string; name: string}[]>([])

  const isAdmin = user.role === 'admin'
  const isCoordinator = user.role === 'coordinator'
  const canCreateCourse = isAdmin || isCoordinator
  const visibleTabs = isAdmin ? tabs : tabs.filter((item) => item.value === 'courses' || (isCoordinator && item.value === 'students'))
  const course = workspace.courses.find((item) => item.id === editing)
  const requests = workspace.accessRequests ?? []
  const periods = workspace.periods ?? []
  const editingPeriod = periods.find((period) => period.id === editingPeriodId)
  const blocks = ['Todos', ...new Set(workspace.students.map((student) => student.group))]
  const matches = (value: string) => value.toLocaleLowerCase('es').includes(query.trim().toLocaleLowerCase('es'))

  const courses = workspace.courses.filter(
    (item) => (canCreateCourse || teachesCourse(user, item)) && matches(`${item.name} ${item.group} ${item.period ?? ''}`),
  )
  const students = workspace.students.filter(
    (item) => (block === 'Todos' || item.group === block) && matches(`${item.name} ${item.group}`),
  )
  const filteredRequests = requests.filter((req) => matches(`${req.name} ${req.email} ${req.group} ${req.roleLabel}`))

  useEffect(() => {
    if (!canCreateCourse) return
    let active = true
    communityService.teachers().then((people) => { if (active) setInstructors(people) }).catch(() => {})
    return () => { active = false }
  }, [canCreateCourse])

  function selectTab(next: ManagementTab) {
    setTab(next)
    setEditing(undefined)
    setAddingPeriod(false)
    setEditingPeriodId(undefined)
    setQuery('')
  }

  function createOrUpdateCourse(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const data = new FormData(event.currentTarget)
    const nextEvaluationDate = String(data.get('nextEvaluationDate') ?? '').trim() || undefined

    if (!canCreateCourse) {
      if (!course) return
      const next: Course = { ...course, nextEvaluationDate }
      commit(`Actualizó la fecha de evaluación de «${course.name}»`, (current) => ({
        ...current,
        courses: current.courses.map((item) => (item.id === next.id ? next : item)),
      }))
      setEditing(undefined)
      return
    }

    const name = String(data.get('name') ?? '').trim()
    const group = String(data.get('group') ?? '').trim()
    const description = String(data.get('description') ?? '').trim()
    const instructor = instructors.find((item) => item.id === data.get('teacher'))
    const startDate = String(data.get('startDate') ?? '')
    const endDate = String(data.get('endDate') ?? '')
    if (!startDate || !endDate || endDate < startDate) {
      notify?.('La fecha de cierre debe ser igual o posterior al inicio.')
      return
    }
    if (!instructor && !course) {
      notify?.('Selecciona un instructor para crear el curso.')
      return
    }
    if (!name || !group || !description) return

    const next: Course = {
      id: course?.id ?? createId(),
      category: String(data.get('category') ?? 'frameworks') as CourseCategoryId,
      teacher: instructor?.name ?? course?.teacher ?? '',
      teacherId: instructor?.id ?? course?.teacherId,
      color: course?.color ?? 'teal',
      name,
      group,
      description,
      period: String(data.get('period') ?? '2026-II'),
      startDate,
      endDate,
      durationWeeks: Number(data.get('durationWeeks') ?? course?.durationWeeks ?? 16),
      evaluationMethod:
        String(data.get('evaluationMethod') ?? '').trim() ||
        course?.evaluationMethod ||
        'Continua: Laboratorios + Proyecto + Examen',
      scheduleSummary:
        String(data.get('scheduleSummary') ?? '').trim() ||
        course?.scheduleSummary ||
        'Mar y Jue · 09:00 - 11:15',
      nextEvaluationDate,
    }
    commit(`${course ? 'Actualizó' : 'Creó'} el curso «${name}»`, (current) => ({
      ...current,
      courses: course ? current.courses.map((item) => (item.id === next.id ? next : item)) : [...current.courses, next],
    }))
    notify?.(course ? `Curso «${name}» actualizado.` : `Curso «${name}» creado.`)
    setEditing(undefined)
  }

  function deleteCourse(item: Course) {
    if (!isAdmin) return
    if (!window.confirm(`¿Eliminar «${item.name}» del catálogo?`)) return
    commit(`Eliminó el curso «${item.name}»`, (current) => ({
      ...current,
      courses: current.courses.filter((courseItem) => courseItem.id !== item.id),
      activities: current.activities.filter((activity) => activity.courseId !== item.id),
    }))
  }

  function savePeriod(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!isAdmin) return
    const data = new FormData(event.currentTarget)
    const name = String(data.get('name') ?? '').trim()
    const startDate = String(data.get('startDate') ?? '')
    const endDate = String(data.get('endDate') ?? '')
    const status = String(data.get('status') ?? 'upcoming') as AcademicPeriod['status']
    if (!name || !startDate || !endDate || endDate < startDate) {
      notify?.('Ingresa un rango de fechas válido para el periodo.')
      return
    }
    const idSlug = name.toUpperCase().replace(/[^A-Z0-9-]+/g, '-').slice(0, 16) || createId()
    if (!editingPeriod && periods.some((period) => period.id === idSlug)) {
      notify?.('Ya existe un periodo con ese nombre.')
      return
    }
    const next: AcademicPeriod = { id: editingPeriod?.id ?? idSlug, name, startDate, endDate, status }
    commit(`${editingPeriod ? 'Actualizó' : 'Creó'} el periodo «${name}»`, (current) => ({
      ...current,
      periods: editingPeriod ? current.periods.map((period) => period.id === next.id ? next : period) : [next, ...current.periods],
    }))
    setAddingPeriod(false)
    setEditingPeriodId(undefined)
  }

  async function handleApproveRequest(request: AccessRequest) {
    setProcessingRequestId(request.id)
    try {
      const updated = await workspaceService.approveAccessRequest(request.id, user.name)
      commit(`Aprobó y emitió credenciales para ${request.email}`, (current) => ({
        ...current,
        accessRequests: (current.accessRequests ?? []).map((item) => (item.id === request.id ? updated : item)),
        students:
          request.requestedRole === 'student' &&
          !(current.students ?? []).some((s) => s.email === request.email)
            ? [
                ...current.students,
                { id: updated.approvedProfileId ?? `usr-${request.id}`, name: request.name, group: request.group, email: request.email },
              ]
            : current.students,
      }))
      notify?.(env.hasSupabase && env.managedAuth
        ? `Invitación enviada a ${request.name}.`
        : `Se aprobó el acceso de ${request.name}. Las credenciales aparecen en la solicitud.`)
    } catch (error) {
      notify?.(error instanceof Error ? error.message : 'No pudimos completar la aprobación en este momento.')
    } finally {
      setProcessingRequestId(undefined)
    }
  }

  async function handleRejectRequest(request: AccessRequest) {
    setProcessingRequestId(request.id)
    try {
      await workspaceService.rejectAccessRequest(request.id, user.name)
      commit(`Rechazó la solicitud de ${request.name}`, (current) => ({
        ...current,
        accessRequests: (current.accessRequests ?? []).map((item) =>
          item.id === request.id ? { ...item, status: 'rejected' } : item,
        ),
      }))
      notify?.(`Solicitud de ${request.name} marcada como rechazada.`)
    } catch {
      notify?.('No pudimos actualizar la solicitud.')
    } finally {
      setProcessingRequestId(undefined)
    }
  }

  const pendingCount = requests.filter((r) => r.status === 'pending').length

  return (
    <section>
      <header className="p-section-heading">
        <div>
          <h1>{isAdmin ? 'Centro de administración' : isCoordinator ? 'Coordinación académica y cursos' : 'Gestión de mis cursos'}</h1>
          <p>
            {isAdmin
              ? 'Controla catálogo, periodos, bloques académicos y aprueba solicitudes emitiendo credenciales.'
              : isCoordinator
                ? 'Crea cursos, define horarios y método de evaluación, asigna docentes y supervisa periodos y bloques.'
                : 'Consulta tus cursos asignados y actualiza fechas de evaluación.'}
          </p>
        </div>
        {isAdmin && (
          <span className="p-badge tone-soft-accent">
            {pendingCount} {pendingCount === 1 ? 'solicitud pendiente' : 'solicitudes pendientes'}
          </span>
        )}
      </header>

      {(isAdmin || isCoordinator) && (
        <SegmentedControl
          className="p-tabs"
          label="Módulos de gestión"
          options={visibleTabs}
          value={tab}
          onChange={selectTab}
        />
      )}

      <div className="p-manage-bar">
        <label className="p-search">
          <Search size={16} aria-hidden="true" />
          <span className="p-sr-only">Buscar</span>
          <input
            type="search"
            placeholder="Buscar por nombre, curso o bloque"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </label>
        {tab === 'courses' && canCreateCourse && (
          <button className="p-button p-button-primary" onClick={() => setEditing(editing ? undefined : 'new')}>
            {editing ? 'Cancelar' : 'Crear curso'} {!editing && <Plus size={16} aria-hidden="true" />}
          </button>
        )}
        {tab === 'periods' && isAdmin && (
          <button className="p-button p-button-primary" onClick={() => {
            setEditingPeriodId(undefined)
            setAddingPeriod(!addingPeriod)
          }}>
            {addingPeriod ? 'Cancelar' : 'Nuevo periodo'} {!addingPeriod && <Plus size={16} aria-hidden="true" />}
          </button>
        )}
      </div>

      {tab === 'courses' && editing && (
        <form className="p-card p-form" key={editing} onSubmit={createOrUpdateCourse}>
          <h2>
            {canCreateCourse
              ? course
                ? 'Modificar curso y fechas'
                : 'Crear curso'
              : `Fecha de evaluación · ${course?.name}`}
          </h2>

          {canCreateCourse ? (
            <div className="p-form-workbench">
              <div className="p-form-col">
                <div className="p-form-row-asymmetric">
                  <label htmlFor="course-name">
                    Nombre del curso
                    <input id="course-name" required name="name" defaultValue={course?.name} />
                  </label>
                  <label htmlFor="course-category">
                    Categoría
                    <select id="course-category" name="category" defaultValue={course?.category ?? 'frameworks'}>
                      {courseCategories.map((cat) => (
                        <option key={cat.id} value={cat.id}>
                          {cat.label}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
                <div className="p-form-grid-3">
                  <label htmlFor="course-group">
                    Bloque
                    <input id="course-group" required name="group" defaultValue={course?.group ?? 'Ing. de Sistemas · Ciclo III'} />
                  </label>
                  <label htmlFor="course-teacher">
                    Docente asignado
                    <select id="course-teacher" name="teacher" defaultValue={course?.teacherId ?? ''} required={!course}>
                      <option value="">{course?.teacher ?? 'Selecciona un instructor'}</option>
                      {instructors.map((instructor) => <option key={instructor.id} value={instructor.id}>{instructor.name}</option>)}
                    </select>
                  </label>
                  <label htmlFor="course-period">
                    Periodo
                    <select
                      id="course-period"
                      name="period"
                      defaultValue={course?.period ?? periods[0]?.id ?? '2026-II'}
                    >
                      {(periods.length ? periods : [{ id: '2026-II', name: '2026-II' }]).map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.id}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
                <div className="p-form-grid-3">
                  <label htmlFor="course-start">
                    Inicio
                    <input id="course-start" type="date" name="startDate" defaultValue={course?.startDate ?? dateKey()} />
                  </label>
                  <label htmlFor="course-end">
                    Cierre
                    <input id="course-end" type="date" name="endDate" defaultValue={course?.endDate ?? dateKey()} />
                  </label>
                  <label htmlFor="course-eval-date">
                    Próxima evaluación
                    <input id="course-eval-date" type="date" name="nextEvaluationDate" defaultValue={course?.nextEvaluationDate ?? dateKey()} />
                  </label>
                </div>
                <div className="p-form-grid-3">
                  <label htmlFor="course-duration">
                    Duración (semanas)
                    <input
                      id="course-duration"
                      type="number"
                      min={1}
                      max={52}
                      name="durationWeeks"
                      defaultValue={course?.durationWeeks ?? 16}
                    />
                  </label>
                  <label htmlFor="course-schedule">
                    Horario de clases
                    <input id="course-schedule" name="scheduleSummary" defaultValue={course?.scheduleSummary ?? 'Mar y Jue · 09:00 - 11:15'} />
                  </label>
                  <label htmlFor="course-eval-method">
                    Método de evaluación sugerido
                    <input
                      id="course-eval-method"
                      name="evaluationMethod"
                      defaultValue={course?.evaluationMethod ?? 'Continua: Laboratorios + Proyecto + Examen'}
                    />
                  </label>
                </div>
              </div>

              <div className="p-form-col--stretch">
                <label className="p-form-label-grow" htmlFor="course-description">
                  Descripción del curso y competencias
                  <textarea id="course-description" required name="description" rows={5} defaultValue={course?.description} />
                </label>
                <div className="p-actions-row">
                  <button type="submit" className="p-button p-button-primary">
                    Guardar curso
                  </button>
                  <button type="button" className="p-button" onClick={() => setEditing(undefined)}>
                    Cancelar
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="p-form-inline-bar">
              <label htmlFor="course-eval-date-teacher">
                Fecha de próxima evaluación
                <input
                  id="course-eval-date-teacher"
                  type="date"
                  name="nextEvaluationDate"
                  required
                  defaultValue={course?.nextEvaluationDate ?? dateKey()}
                />
              </label>
              <button type="submit" className="p-button p-button-primary">
                Actualizar fecha
              </button>
              <button type="button" className="p-button" onClick={() => setEditing(undefined)}>
                Cancelar
              </button>
            </div>
          )}
        </form>
      )}

      {tab === 'students' && (
        <div className="p-filter-row">
          <label className="p-heading-control">
            <span>Bloque</span>
            <select value={block} onChange={(event) => setBlock(event.target.value)}>
              {blocks.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </label>
          <span className="p-badge">
            {students.length} {students.length === 1 ? 'estudiante' : 'estudiantes'}
          </span>
        </div>
      )}

      {tab === 'periods' && addingPeriod && (
        <form className="p-card p-form" onSubmit={savePeriod} key={editingPeriod?.id ?? 'new-period'}>
          <h2>{editingPeriod ? 'Editar periodo académico' : 'Crear periodo académico'}</h2>
          <div className="p-form-workbench">
            <div className="p-form-col">
            <label htmlFor="period-name">
              Nombre
              <input id="period-name" name="name" required maxLength={100} defaultValue={editingPeriod?.name} placeholder="Periodo académico 2027-I" />
            </label>
            <label htmlFor="period-start">
              Inicio
              <input id="period-start" type="date" name="startDate" required defaultValue={editingPeriod?.startDate ?? dateKey()} />
            </label>
            </div>
            <div className="p-form-col">
            <label htmlFor="period-end">
              Cierre
              <input id="period-end" type="date" name="endDate" required defaultValue={editingPeriod?.endDate ?? dateKey()} />
            </label>
            <label>Estado
              <select name="status" defaultValue={editingPeriod?.status ?? 'upcoming'}>
                <option value="upcoming">Próximo</option><option value="active">Activo</option><option value="closed">Cerrado</option>
              </select>
            </label>
            </div>
          </div>
          <div className="p-actions-row">
            <button type="submit" className="p-button p-button-primary">
              Guardar periodo
            </button>
          </div>
        </form>
      )}

      {tab === 'requests' && (
        <div className="p-card p-roster">
          {filteredRequests.map((request) => {
            const busy = processingRequestId === request.id
            return (
              <div className="p-person" key={request.id}>
                <span className="p-avatar">{initials(request.name)}</span>
                <div className="p-list-copy">
                  <strong>
                    {request.name} <span className="p-badge">{request.roleLabel}</span>
                  </strong>
                  <small>
                    {request.email} · {request.group} · {formatDate(request.requestedAt)}
                  </small>
                  {request.status === 'approved' && request.issuedTempPassword && (
                    <small className="p-issued-creds">
                      Acceso activo · Correo: <code>{request.issuedEmail ?? request.email}</code> · Clave temporal:{' '}
                      <code>{request.issuedTempPassword}</code>
                    </small>
                  )}
                </div>
                {request.status === 'pending' ? (
                  <>
                    <button
                      type="button"
                      className="p-button p-button-primary p-button-short"
                      disabled={busy}
                      onClick={() => handleApproveRequest(request)}
                    >
                      <Check size={14} aria-hidden="true" />{' '}
                      {busy ? 'Emitiendo...' : 'Aprobar y entregar credenciales'}
                    </button>
                    <button
                      type="button"
                      className="p-button p-button-short tone-danger"
                      disabled={busy}
                      aria-label={`Rechazar a ${request.name}`}
                      onClick={() => handleRejectRequest(request)}
                    >
                      <X size={14} aria-hidden="true" />
                    </button>
                  </>
                ) : (
                  <span className={`p-badge ${request.status === 'approved' ? 'tone-soft-accent' : ''}`}>
                    {request.status === 'approved' ? (
                      <>
                        <KeyRound size={13} aria-hidden="true" /> Credenciales entregadas
                      </>
                    ) : (
                      'Rechazada'
                    )}
                  </span>
                )}
              </div>
            )
          })}
          {!filteredRequests.length && (
            <div className="p-empty">
              <UserCheck size={24} aria-hidden="true" />
              <p>No hay solicitudes registradas.</p>
            </div>
          )}
        </div>
      )}

      {tab === 'periods' && (
        <div className="p-card p-roster">
          {periods.map((period) => (
            <div className="p-person" key={period.id}>
              <span className="p-kind-icon p-teal">
                <Clock3 size={19} aria-hidden="true" />
              </span>
              <div className="p-list-copy">
                <strong>{period.name}</strong>
                <small>
                  {formatDate(period.startDate)} → {formatDate(period.endDate)}
                </small>
              </div>
              <span className="p-badge tone-soft-accent">{period.status === 'active' ? 'Activo' : period.status === 'upcoming' ? 'Próximo' : 'Cerrado'}</span>
              <button type="button" className="p-button p-button-short" onClick={() => { setEditingPeriodId(period.id); setAddingPeriod(true) }}>
                Editar
              </button>
              <button
                type="button"
                className="p-button p-button-short"
                disabled={period.status === 'closed'}
                onClick={() =>
                  commit(`Cerró el periodo «${period.name}»`, (current) => ({
                    ...current,
                    periods: (current.periods ?? []).map((item) =>
                      item.id === period.id ? { ...item, status: 'closed' } : item,
                    ),
                  }))
                }
              >
                Cerrar
              </button>
            </div>
          ))}
        </div>
      )}

      {tab === 'courses' && (
        <div className="p-card p-roster">
          {courses.map((item) => {
            const attRows = workspace.attendance.filter((a) => a.courseId === item.id)
            const attPresent = attRows.filter((a) => a.status === 'Presente' || a.status === 'Justificada').length
            const avgAtt = attRows.length ? `${Math.round((attPresent / attRows.length) * 100)}%` : 'sin datos'
            return (
              <div className="p-person" key={item.id}>
                <span className={`p-kind-icon p-${item.color}`}>
                  <BookOpen size={19} aria-hidden="true" />
                </span>
                <div className="p-list-copy">
                  <strong>
                    {item.name} <span className="p-badge tone-soft-accent">{item.period ?? '2026-II'}</span>{' '}
                    <span className="p-badge">Asistencia {avgAtt}</span>
                  </strong>
                  <small>
                    {item.group} · {item.teacher} ·{' '}
                    {item.startDate ? `${formatDate(item.startDate)} → ${formatDate(item.endDate ?? item.startDate)}` : 'Fechas por definir'}
                    {item.nextEvaluationDate ? ` · Evaluación: ${formatDate(item.nextEvaluationDate)}` : ''}
                  </small>
                </div>
                <button type="button" className="p-button p-button-short" onClick={() => setEditing(item.id)}>
                  {canCreateCourse ? 'Editar' : 'Fecha evaluación'}
                </button>
                {isAdmin && (
                  <button
                    type="button"
                    className="p-button p-button-short tone-danger"
                    aria-label={`Eliminar ${item.name}`}
                    onClick={() => deleteCourse(item)}
                  >
                    <Trash2 size={15} aria-hidden="true" />
                  </button>
                )}
              </div>
            )
          })}
          {!courses.length && (
            <div className="p-empty">
              <BookOpen size={24} aria-hidden="true" />
              <p>No encontramos resultados.</p>
            </div>
          )}
        </div>
      )}

      {tab === 'students' && (
        <div className="p-card p-roster">
          {students.map((item) => (
            <div className="p-person" key={item.id}>
              <span className="p-avatar">{initials(item.name)}</span>
              <div className="p-list-copy">
                <strong>{item.name}</strong>
                <small>
                  {item.group}
                  {item.email ? ` · ${item.email}` : ''}
                </small>
              </div>
              <span className="p-badge">Bloque asignado</span>
            </div>
          ))}
          {!students.length && (
            <div className="p-empty">
              <UsersRound size={24} aria-hidden="true" />
              <p>No encontramos estudiantes.</p>
            </div>
          )}
        </div>
      )}
    </section>
  )
}
