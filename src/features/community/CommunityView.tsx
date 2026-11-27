import { useEffect, useRef, useState } from 'react'
import { Users } from 'lucide-react'
import { LoadingMark } from '../../components/ui/LoadingMark'
import { createInitialCommunityState } from '../../data/communitySeed'
import { communityService } from '../../services'
import type { DemoUser } from '../../types/auth'
import type { CommunityMessage, CommunityState } from '../../types/community'
import type { Commit } from '../../types/workspace'
import { createId } from '../../utils/id'
import type { CommunitySectionId } from '../campus/navigation'
import { DiscoverCommunitiesSubmodule } from './DiscoverCommunitiesSubmodule'
import { MyCommunitiesSubmodule } from './MyCommunitiesSubmodule'
import '../../styles/community.css'

interface CommunityViewProps {
  user: DemoUser
  section: CommunitySectionId
  onNavigateSection: (next: CommunitySectionId) => void
  commit: Commit
  notify: (message: string) => void
}

const sectionMeta: Record<CommunitySectionId, { title: string; subtitle: string }> = {
  'community-discover': {
    title: 'Buscar comunidad',
    subtitle: 'Explora canales de ingeniería por especialidad y únete al chat de estudio en vivo.',
  },
  'community-mine': {
    title: 'Mi comunidad',
    subtitle: 'Conversa con compañeros y mentores en los grupos de chat donde ya participas.',
  },
}

export function CommunityView({ user, section, onNavigateSection, commit, notify }: CommunityViewProps) {
  const [state, setState] = useState<CommunityState>(createInitialCommunityState)
  const [loaded, setLoaded] = useState(false)
  const [sending, setSending] = useState(false)
  const shouldPersistRef = useRef(false)

  useEffect(() => {
    let active = true
    communityService
      .load()
      .then((saved) => {
        if (!active) return
        shouldPersistRef.current = false
        setState(saved)
        setLoaded(true)
      })
      .catch(() => {
        if (active) setLoaded(true)
      })
    return () => {
      active = false
    }
  }, [])

  useEffect(() => {
    if (!loaded || !shouldPersistRef.current) return
    void communityService.save(state)
  }, [state, loaded])

  function updateState(updater: (current: CommunityState) => CommunityState) {
    shouldPersistRef.current = true
    setState(updater)
  }

  function handleJoinGroup(groupId: string) {
    const target = state.groups.find((g) => g.id === groupId)
    if (!target || target.joined) return
    updateState((current) => ({
      ...current,
      activeGroupId: groupId,
      groups: current.groups.map((g) =>
        g.id === groupId ? { ...g, joined: true, memberCount: g.memberCount + 1 } : g,
      ),
    }))
    commit(`Se unió al grupo «${target.name}»`, (ws) => ws)
    notify(`Te uniste a «${target.name}». Ya puedes chatear en Mi comunidad.`)
  }

  function handleLeaveGroup(groupId: string) {
    const target = state.groups.find((g) => g.id === groupId)
    if (!target || !target.joined) return
    updateState((current) => {
      const nextGroups = current.groups.map((g) =>
        g.id === groupId ? { ...g, joined: false, memberCount: Math.max(1, g.memberCount - 1) } : g,
      )
      const fallbackActive = nextGroups.find((g) => g.joined)?.id ?? current.activeGroupId
      return {
        ...current,
        activeGroupId: current.activeGroupId === groupId ? fallbackActive : current.activeGroupId,
        groups: nextGroups,
      }
    })
    commit(`Salió del grupo «${target.name}»`, (ws) => ws)
    notify(`Saliste de «${target.name}».`)
  }

  function handleOpenChat(groupId: string) {
    updateState((current) => ({ ...current, activeGroupId: groupId }))
    onNavigateSection('community-mine')
  }

  async function handleSendMessage(groupId: string, text: string) {
    const target = state.groups.find((g) => g.id === groupId)
    if (!target) return
    const now = new Date()
    const sentAt = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`
    const ownMsg: CommunityMessage = {
      id: createId(),
      author: user.name,
      authorRole: user.role === 'teacher' ? 'Docente' : 'Estudiante',
      initials: user.initials,
      text,
      sentAt,
      isOwn: true,
    }

    updateState((current) => ({
      ...current,
      groups: current.groups.map((g) => (g.id === groupId ? { ...g, messages: [...g.messages, ownMsg] } : g)),
    }))

    setSending(true)
    try {
      const autoReply = await communityService.buildAutoReply(target.name, target.mentorName, text)
      updateState((current) => ({
        ...current,
        groups: current.groups.map((g) =>
          g.id === groupId ? { ...g, messages: [...g.messages, autoReply] } : g,
        ),
      }))
    } finally {
      setSending(false)
    }
  }

  if (!loaded) {
    return (
      <div className="campus-loading">
        <LoadingMark label="Cargando comunidades" />
      </div>
    )
  }

  const joinedCount = state.groups.filter((g) => g.joined).length
  const meta = sectionMeta[section]

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
        </div>
      </header>

      {section === 'community-discover' && (
        <DiscoverCommunitiesSubmodule
          groups={state.groups}
          onJoinGroup={handleJoinGroup}
          onLeaveGroup={handleLeaveGroup}
          onOpenChat={handleOpenChat}
        />
      )}

      {section === 'community-mine' && (
        <MyCommunitiesSubmodule
          groups={state.groups}
          activeGroupId={state.activeGroupId}
          sending={sending}
          onSelectGroup={(id) => updateState((current) => ({ ...current, activeGroupId: id }))}
          onSendMessage={handleSendMessage}
          onLeaveGroup={handleLeaveGroup}
          onOpenDiscover={() => onNavigateSection('community-discover')}
        />
      )}
    </section>
  )
}
