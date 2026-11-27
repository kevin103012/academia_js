import { useEffect, useState } from 'react'
import { Plus, Users, X } from 'lucide-react'
import { LoadingMark } from '../../components/ui/LoadingMark'
import {
  assignCourseGroup,
  communityService,
  createStudyGroup,
  deleteGroup,
  editGroup,
  isMember,
  joinGroup,
  leaveGroup,
  removeMember,
} from '../../services'
import type { DemoUser } from '../../types/auth'
import type { CommunityMessage, CommunityState } from '../../types/community'
import type { Commit, Course } from '../../types/workspace'
import { createId } from '../../utils/id'
import type { CommunitySectionId } from '../campus/navigation'
import { DiscoverCommunitiesSubmodule } from './DiscoverCommunitiesSubmodule'
import { AssignGroupForm, CreateGroupForm } from './GroupForms'
import { MyCommunitiesSubmodule } from './MyCommunitiesSubmodule'
import '../../styles/community.css'

interface CommunityViewProps {
  user: DemoUser
  courses: Course[]
  section: CommunitySectionId
  onNavigateSection: (next: CommunitySectionId) => void
  commit: Commit
  notify: (message: string) => void
}

const sectionMeta: Record<CommunitySectionId, { title: string; subtitle: string }> = {
  'community-discover': {
    title: 'Buscar comunidad',
    subtitle: 'Explora grupos de estudio y de curso, y únete a su chat.',
  },
  'community-mine': {
    title: 'Mi comunidad',
    subtitle: 'Conversa en los grupos donde participas. Ves los mensajes desde tu ingreso.',
  },
}

const roleLabels: Record<DemoUser['role'], CommunityMessage['authorRole']> = {
  student: 'Estudiante',
  teacher: 'Docente',
  coordinator: 'Coordinación',
  admin: 'Administración',
}

export function CommunityView({ user, courses, section, onNavigateSection, commit, notify }: CommunityViewProps) {
  const [state, setState] = useState<CommunityState>()
  const [loadFailed, setLoadFailed] = useState(false)
  const [reload, setReload] = useState(0)
  const [sending, setSending] = useState(false)
  const [formOpen, setFormOpen] = useState(false)

  useEffect(() => {
    let active = true
    setLoadFailed(false)
    communityService
      .load()
      .then((saved) => {
        if (active) setState(saved)
      })
      .catch(() => {
        // Sin datos cargados no se guarda nada, para no sobrescribir los grupos existentes.
        if (active) setLoadFailed(true)
      })
    return () => {
      active = false
    }
  }, [reload])

  // Aplica el cambio sobre los datos más recientes y lo guarda antes de continuar.
  async function mutate(change: (current: CommunityState) => CommunityState) {
    try {
      const latest = await communityService.load()
      const next = change(latest)
      if (next === latest) {
        setState(latest)
        return false
      }
      if (!(await communityService.save(next))) throw new Error('save')
      setState(next)
      return true
    } catch {
      notify('No se pudo guardar el cambio. Intenta de nuevo.')
      return false
    }
  }

  async function apply(change: (current: CommunityState) => CommunityState, action: string, message: string) {
    const changed = await mutate(change)
    if (changed) {
      commit(action, (workspace) => workspace)
      notify(message)
    }
    return changed
  }

  async function handleOpenChat(groupId: string) {
    await mutate((current) => ({ ...current, activeGroupId: groupId }))
    onNavigateSection('community-mine')
  }

  async function handleSendMessage(groupId: string, text: string) {
    const now = new Date()
    const ownMsg: CommunityMessage = {
      id: createId(),
      authorId: user.id,
      author: user.name,
      authorRole: roleLabels[user.role],
      initials: user.initials,
      text,
      sentAt: `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`,
      createdAt: now.getTime(),
    }
    const append = (message: CommunityMessage) => (current: CommunityState) => ({
      ...current,
      groups: current.groups.map((g) =>
        g.id === groupId && isMember(g, user.id) ? { ...g, messages: [...g.messages, message] } : g,
      ),
    })

    const target = state?.groups.find((g) => g.id === groupId)
    if (!target || !(await mutate(append(ownMsg)))) return
    // La respuesta simulada del mentor no aplica a grupos que administra un docente.
    if (target.managerName || target.createdById || target.mentorName === user.name) return

    setSending(true)
    try {
      const reply = await communityService.buildAutoReply(target.name, target.mentorName, text)
      await mutate(append(reply))
    } catch {
      // Sin respuesta automática: tu mensaje ya quedó guardado.
    } finally {
      setSending(false)
    }
  }

  if (loadFailed) {
    return (
      <div className="p-card p-empty" role="alert">
        <p>No pudimos cargar las comunidades.</p>
        <button type="button" className="p-button tone-accent" onClick={() => setReload((value) => value + 1)}>
          Reintentar
        </button>
      </div>
    )
  }

  if (!state) {
    return (
      <div className="campus-loading">
        <LoadingMark label="Cargando comunidades" />
      </div>
    )
  }

  const nameOf = (groupId: string) => state.groups.find((g) => g.id === groupId)?.name ?? 'grupo'
  const joinedCount = state.groups.filter((g) => isMember(g, user.id)).length
  const meta = sectionMeta[section]
  const formLabel =
    user.role === 'teacher' ? 'Crear grupo' : user.role === 'coordinator' ? 'Asignar grupo a curso' : undefined

  const handleLeaveGroup = (groupId: string) =>
    apply(
      (current) => leaveGroup(current, groupId, user),
      `Salió del grupo «${nameOf(groupId)}»`,
      `Saliste de «${nameOf(groupId)}».`,
    )

  return (
    <section className="comm-root" aria-labelledby="comm-page-heading">
      <header className="p-section-heading">
        <div>
          <h1 id="comm-page-heading">{meta.title}</h1>
          <p>{meta.subtitle}</p>
        </div>
        <div className="p-heading-actions">
          <span className="p-badge tone-soft-accent">
            <Users size={14} aria-hidden="true" /> {joinedCount} grupos unidos · {state.groups.length} totales
          </span>
          {formLabel && (
            <button
              type="button"
              className="p-button p-button-primary"
              aria-expanded={formOpen}
              onClick={() => setFormOpen(!formOpen)}
            >
              {formOpen ? 'Cerrar' : formLabel}
              {formOpen ? <X size={16} aria-hidden="true" /> : <Plus size={16} aria-hidden="true" />}
            </button>
          )}
        </div>
      </header>

      {formOpen && user.role === 'teacher' && (
        <CreateGroupForm
          onCreate={async (details) => {
            const created = await apply(
              (current) => createStudyGroup(current, details, user),
              `Creó el grupo «${details.name}»`,
              `Grupo «${details.name}» creado.`,
            )
            if (created) {
              setFormOpen(false)
              onNavigateSection('community-mine')
            }
          }}
        />
      )}
      {formOpen && user.role === 'coordinator' && (
        <AssignGroupForm
          courses={courses}
          groups={state.groups}
          onAssign={(course, period, teacherName) =>
            apply(
              (current) => assignCourseGroup(current, { course, period, teacherName }, user),
              `Asignó el grupo de «${course.name}» (${period}) a ${teacherName}`,
              `Grupo de ${period} asignado a ${teacherName}.`,
            )
          }
        />
      )}

      {section === 'community-discover' && (
        <DiscoverCommunitiesSubmodule
          user={user}
          groups={state.groups}
          onJoinGroup={(groupId) =>
            apply(
              (current) => joinGroup(current, groupId, user),
              `Se unió al grupo «${nameOf(groupId)}»`,
              `Te uniste a «${nameOf(groupId)}». Ya puedes chatear en Mi comunidad.`,
            )
          }
          onLeaveGroup={handleLeaveGroup}
          onOpenChat={handleOpenChat}
        />
      )}

      {section === 'community-mine' && (
        <MyCommunitiesSubmodule
          user={user}
          groups={state.groups}
          activeGroupId={state.activeGroupId}
          sending={sending}
          onSelectGroup={(id) => mutate((current) => ({ ...current, activeGroupId: id }))}
          onSendMessage={handleSendMessage}
          onLeaveGroup={handleLeaveGroup}
          onOpenDiscover={() => onNavigateSection('community-discover')}
          onEditGroup={(groupId, details) =>
            apply(
              (current) => editGroup(current, groupId, details, user),
              `Editó el grupo «${details.name}»`,
              'Cambios del grupo guardados.',
            )
          }
          onRemoveMember={(groupId, memberId) =>
            apply(
              (current) => removeMember(current, groupId, memberId, user),
              `Quitó a un integrante de «${nameOf(groupId)}»`,
              'Integrante retirado del grupo.',
            )
          }
          onDeleteGroup={(groupId) =>
            apply(
              (current) => deleteGroup(current, groupId, user),
              `Eliminó el grupo «${nameOf(groupId)}»`,
              'Grupo eliminado.',
            )
          }
        />
      )}
    </section>
  )
}
