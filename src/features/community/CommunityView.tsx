import { useEffect, useRef, useState, type FormEvent } from 'react'
import { Plus, RefreshCw } from 'lucide-react'
import { LoadingMark } from '../../components/ui/LoadingMark'
import { canManageCommunity, communityService } from '../../services/community/communityService'
import type { DemoUser } from '../../types/auth'
import type { CommunityGroup, CommunityState } from '../../types/community'
import { courseCategories, type CourseCategoryId, type Workspace } from '../../types/workspace'
import { createId } from '../../utils/id'
import { teachesCourse } from '../../utils/campusAccess'
import type { CommunitySectionId } from '../campus/navigation'
import { DiscoverCommunitiesSubmodule } from './DiscoverCommunitiesSubmodule'
import { MyCommunitiesSubmodule } from './MyCommunitiesSubmodule'
import '../../styles/community.css'

interface CommunityViewProps {
  user: DemoUser
  workspace: Workspace
  section: CommunitySectionId
  onNavigateSection: (next: CommunitySectionId) => void
  notify: (message: string) => void
}

const time = new Intl.DateTimeFormat('es-PE', { hour: '2-digit', minute: '2-digit', hour12: false })

export function CommunityView({ user, workspace, section, onNavigateSection, notify }: CommunityViewProps) {
  const [state, setState] = useState<CommunityState>()
  const [working, setWorking] = useState(false)
  const [draft, setDraft] = useState<CommunityGroup | 'new'>()
  const [kind, setKind] = useState<CommunityGroup['groupKind']>('study')
  const [linkedCourse, setLinkedCourse] = useState('')
  const [teachers, setTeachers] = useState<{ id: string; name: string }[]>([])
  const [error, setError] = useState('')
  const busy = useRef(false)
  const isManagement = user.role === 'coordinator' || user.role === 'admin'
  const eligibleCourses = workspace.courses.filter((course) => isManagement || teachesCourse(user, course))
  const selectedCourse = workspace.courses.find((course) => course.id === linkedCourse)
  const existing = draft !== 'new' ? draft : undefined

  useEffect(() => {
    let active = true
    const load = () => communityService.load(user).then((loaded) => {
      if (active && !busy.current) setState(loaded)
    }).catch((cause) => { if (active && !busy.current) setError(cause.message) })
    void load()
    const timer = section === 'community-mine' ? window.setInterval(load, 12000) : undefined
    return () => { active = false; window.clearInterval(timer) }
  }, [user, section])

  useEffect(() => {
    if (!isManagement || !draft) return
    let active = true
    communityService.teachers().then((result) => { if (active) setTeachers(result) }).catch((cause) => {
      if (active) setError(cause.message)
    })
    return () => { active = false }
  }, [draft, isManagement])

  async function run(task: () => Promise<void>) {
    if (busy.current) return
    busy.current = true
    setWorking(true)
    setError('')
    try {
      await task()
      setState(await communityService.load(user))
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'No se pudo completar el cambio.')
    } finally {
      busy.current = false
      setWorking(false)
    }
  }

  function selectGroup(id: string) {
    communityService.setActive(user, id)
    setState((current) => current ? { ...current, activeGroupId: id } : current)
  }

  function editGroup(group: CommunityGroup | 'new') {
    setDraft(group)
    setKind(group === 'new' ? 'study' : group.groupKind ?? 'study')
    setLinkedCourse(group === 'new' ? '' : group.courseId ?? '')
  }

  function saveGroup(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    const name = String(form.get('name') ?? '').trim()
    const description = String(form.get('description') ?? '').trim()
    if (!name || !description) return
    const groupKind = !existing || isManagement ? kind : existing.groupKind ?? 'study'
    const course = groupKind === 'course' ? selectedCourse : undefined
    const period = isManagement ? String(form.get('period') ?? '') || course?.period : existing?.periodId ?? course?.period
    const academicBlock = isManagement ? String(form.get('block') ?? '').trim() || course?.group : existing?.academicBlock ?? course?.group
    const instructor = isManagement
      ? teachers.find((person) => person.id === form.get('teacher'))
      : undefined
    if (groupKind === 'course' && (!course || !period || !academicBlock || (isManagement && !(instructor || existing?.assignedTeacherId || course.teacherId)))) {
      setError('El grupo de curso requiere curso, periodo, bloque e instructor.')
      return
    }
    if (course && state?.groups.some((group) =>
      group.id !== existing?.id && group.courseId === course.id && group.periodId === period && group.academicBlock === academicBlock,
    )) {
      setError('Ya existe un grupo de este curso para ese bloque y periodo.')
      return
    }
    const category = course?.category ?? String(form.get('category') ?? 'frameworks') as CourseCategoryId
    const categoryLabel = courseCategories.find((item) => item.id === category)?.label ?? category
    const group: CommunityGroup = {
      id: existing?.id ?? createId(), name, description, category, categoryLabel, groupKind, academicBlock,
      courseId: course?.id, periodId: period,
      assignedTeacherId: isManagement
        ? instructor?.id ?? course?.teacherId ?? existing?.assignedTeacherId
        : existing ? existing.assignedTeacherId : user.id,
      createdBy: existing ? existing.createdBy : user.id,
      mentorName: instructor?.name ?? course?.teacher ?? existing?.mentorName ?? user.name,
      pinnedNote: String(form.get('note') ?? '').trim(),
      tags: existing?.tags ?? [],
      memberCount: existing?.memberCount ?? 0, onlineCount: existing?.onlineCount ?? 0,
      joined: existing?.joined ?? false, messages: existing?.messages ?? [],
    }
    void run(async () => {
      await communityService.saveGroup(user, group, Boolean(existing))
      setDraft(undefined)
      notify('Grupo guardado.')
    })
  }

  const groups = state?.groups ?? []
  const discover = section === 'community-discover'
  return <section className="comm-root" aria-labelledby="comm-page-heading">
    <header className="p-section-heading">
      <div>
        <h1 id="comm-page-heading">{discover ? 'Buscar comunidad' : 'Mi comunidad'}</h1>
        <p>{discover ? 'Encuentra grupos por especialidad o curso.' : 'Conversa en los grupos a los que te uniste.'}</p>
      </div>
      <div className="p-actions-row">
        <button type="button" className="p-button" disabled={working} onClick={() => void run(async () => {})}>
          <RefreshCw size={15} aria-hidden="true" /> Actualizar
        </button>
        {discover && user.role !== 'student' && <button type="button" className="p-button p-button-primary" disabled={working} onClick={() => editGroup('new')}>
          <Plus size={17} aria-hidden="true" /> Crear grupo
        </button>}
      </div>
    </header>
    {error && <p className="p-warning" role="alert">{error}</p>}
    {discover && draft && <form className="p-card p-form" key={existing?.id ?? 'new'} onSubmit={saveGroup}>
      <h2>{existing ? 'Editar grupo' : 'Crear grupo'}</h2>
      <div className="p-form-workbench">
        <div className="p-form-col">
          <label>Nombre<input name="name" defaultValue={existing?.name} maxLength={100} required /></label>
          {(isManagement || (!existing && eligibleCourses.length > 0)) && <label>Tipo
            <select value={kind} onChange={(event) => setKind(event.target.value as CommunityGroup['groupKind'])}>
              <option value="study">Estudio</option><option value="course">Curso y periodo</option>{isManagement && <option value="general">General</option>}
            </select>
          </label>}
          {kind !== 'course' && <label>Categoría<select name="category" defaultValue={existing?.category ?? 'frameworks'}>
            {courseCategories.map((category) => <option key={category.id} value={category.id}>{category.label}</option>)}
          </select></label>}
          {(isManagement || !existing) && kind === 'course' && <>
            <label>Curso<select value={linkedCourse} required onChange={(event) => setLinkedCourse(event.target.value)}>
              <option value="" disabled>Selecciona el curso</option>
              {eligibleCourses.map((course) => <option key={course.id} value={course.id}>{course.name}</option>)}
            </select></label>
            {isManagement && <div className="p-form-row" key={linkedCourse}>
              <label>Periodo<select name="period" defaultValue={existing?.periodId ?? selectedCourse?.period ?? ''} required>
                <option value="" disabled>Selecciona el periodo</option>
                {workspace.periods.map((item) => <option value={item.id} key={item.id}>{item.name}</option>)}
              </select></label>
              <label>Bloque<input name="block" defaultValue={existing?.academicBlock ?? selectedCourse?.group} maxLength={50} required /></label>
            </div>}
          </>}
          {isManagement && <label>Instructor<select name="teacher" defaultValue={existing?.assignedTeacherId ?? ''} required={kind === 'course' && !selectedCourse?.teacherId}>
            <option value="">{selectedCourse?.teacherId ? 'Instructor del curso' : 'Selecciona un instructor'}</option>
            {teachers.map((teacher) => <option value={teacher.id} key={teacher.id}>{teacher.name}</option>)}
          </select></label>}
          <div className="p-actions-row">
            <button className="p-button p-button-primary" type="submit" disabled={working}>Guardar grupo</button>
            <button className="p-button" type="button" disabled={working} onClick={() => setDraft(undefined)}>Cancelar</button>
          </div>
        </div>
        <div className="p-form-col--stretch">
          <label className="p-form-label-grow">Descripción<textarea name="description" required maxLength={1000} defaultValue={existing?.description} /></label>
          <label>Nota fijada<input name="note" maxLength={240} defaultValue={existing?.pinnedNote} /></label>
        </div>
      </div>
    </form>}
    {!state && !error && <div className="campus-loading"><LoadingMark label="Cargando comunidades" /></div>}
    {state && discover && <DiscoverCommunitiesSubmodule
      groups={groups}
      busy={working}
      canEdit={(group) => canManageCommunity(user, group)}
      onEdit={editGroup}
      onDelete={user.role === 'admin' ? (group) => {
        if (window.confirm('¿Eliminar el grupo «' + group.name + '» y sus mensajes?')) {
          void run(() => communityService.removeGroup(user, group.id))
        }
      } : undefined}
      onJoinGroup={(id) => void run(() => communityService.setMembership(user, id, true))}
      onLeaveGroup={(id) => void run(() => communityService.setMembership(user, id, false))}
      onOpenChat={(id) => { selectGroup(id); onNavigateSection('community-mine') }}
    />}
    {state && !discover && <MyCommunitiesSubmodule
      groups={groups}
      activeGroupId={state.activeGroupId}
      sending={working}
      onSelectGroup={selectGroup}
      onSendMessage={async (id, text) => {
        const group = groups.find((item) => item.id === id)
        if (!group?.joined || !text.trim()) return
        await run(async () => {
          const now = new Date()
          await communityService.send(user, group, {
            id: createId(), author: user.name, authorId: user.id,
            authorRole: user.role === 'student' ? 'Estudiante' : user.role === 'teacher' ? 'Docente' : 'Mentor',
            initials: user.initials, text: text.trim(), sentAt: time.format(now), sentOn: now.toISOString(), isOwn: true,
          })
        })
      }}
      onLeaveGroup={(id) => void run(() => communityService.setMembership(user, id, false))}
      onOpenDiscover={() => onNavigateSection('community-discover')}
    />}
  </section>
}
