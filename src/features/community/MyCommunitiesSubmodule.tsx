import { useEffect, useRef, useState, type FormEvent } from 'react'
import { Compass, LogOut, Pin, Send, Settings, Users } from 'lucide-react'
import { isManager, isMember, visibleMessages } from '../../services'
import type { DemoUser } from '../../types/auth'
import type { CommunityGroup, GroupDetails } from '../../types/community'
import { courseCategories } from '../../types/workspace'
import { GroupAdminPanel } from './GroupAdminPanel'

interface MyCommunitiesSubmoduleProps {
  user: DemoUser
  groups: CommunityGroup[]
  activeGroupId: string
  sending: boolean
  onSelectGroup: (groupId: string) => void
  onSendMessage: (groupId: string, text: string) => void
  onLeaveGroup: (groupId: string) => void
  onOpenDiscover: () => void
  onEditGroup: (groupId: string, details: GroupDetails) => void
  onRemoveMember: (groupId: string, memberId: string) => void
  onDeleteGroup: (groupId: string) => void
}

const quickTemplates = [
  { label: '+ Bloque código', insert: '\n```ts\n// Pega aquí tu fragmento\n```' },
  { label: '+ Matriz 2×2', insert: '\n```text\n[ 1  0 | x1 ]\n[ 0  1 | x2 ]\n```' },
  { label: '+ Duda laboratorio', insert: '¿Alguien validó ya el paso de verificación en el simulador?' },
]

function renderMessageBody(text: string) {
  const segments = text.split(/```(?:[a-zA-Z]*)\n?([\s\S]*?)```/g)
  return segments.map((part, index) => {
    const trimmed = part.trim()
    if (!trimmed) return null
    if (index % 2 === 1) {
      return (
        <pre key={index} className="comm-code theme-dark">
          <code>{trimmed}</code>
        </pre>
      )
    }
    return <p key={index}>{trimmed}</p>
  })
}

export function MyCommunitiesSubmodule({
  user,
  groups,
  activeGroupId,
  sending,
  onSelectGroup,
  onSendMessage,
  onLeaveGroup,
  onOpenDiscover,
  onEditGroup,
  onRemoveMember,
  onDeleteGroup,
}: MyCommunitiesSubmoduleProps) {
  // Un borrador por grupo, para no enviar un texto al chat equivocado.
  const [drafts, setDrafts] = useState<Record<string, string>>({})
  const [managingId, setManagingId] = useState<string>()
  const feedRef = useRef<HTMLDivElement>(null)
  const joinedGroups = groups.filter((group) => isMember(group, user.id))
  const activeGroup = joinedGroups.find((g) => g.id === activeGroupId) ?? joinedGroups[0]
  const messages = activeGroup ? visibleMessages(activeGroup, user.id) : []
  const draft = activeGroup ? drafts[activeGroup.id] ?? '' : ''
  const manages = activeGroup ? isManager(activeGroup, user) : false

  function setDraft(value: string) {
    if (activeGroup) setDrafts((current) => ({ ...current, [activeGroup.id]: value }))
  }

  useEffect(() => {
    const el = feedRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, [activeGroup?.id, messages.length])

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const cleaned = draft.trim()
    if (!cleaned || !activeGroup || sending) return
    onSendMessage(activeGroup.id, cleaned)
    setDraft('')
  }

  if (joinedGroups.length === 0) {
    return (
      <div className="p-card p-empty" style={{ minHeight: 240 }}>
        <Users size={28} aria-hidden="true" />
        <p>Todavía no te has unido a ningún grupo de estudio.</p>
        <button type="button" className="p-button tone-accent" onClick={onOpenDiscover}>
          <Compass size={16} aria-hidden="true" /> Explorar comunidades
        </button>
      </div>
    )
  }

  return (
    <div className="comm-chat-layout">
      <aside className="comm-sidebar" aria-label="Mis grupos unidos">
        <div className="comm-sidebar-head">
          <h2>Tus grupos ({joinedGroups.length})</h2>
          <button type="button" className="p-button p-button-short tone-pill" onClick={onOpenDiscover}>
            + Buscar
          </button>
        </div>

        <div className="comm-group-list">
          {joinedGroups.map((group) => {
            const catShort = courseCategories.find((c) => c.id === group.category)?.shortLabel ?? group.categoryLabel
            const lastMsg = visibleMessages(group, user.id).at(-1)
            const isCurrent = activeGroup?.id === group.id
            return (
              <button
                key={group.id}
                type="button"
                className="comm-group-btn"
                aria-current={isCurrent ? 'true' : undefined}
                onClick={() => onSelectGroup(group.id)}
              >
                <span className="comm-group-btn-top">
                  <span>{catShort}</span>
                  <span>{group.onlineCount} en línea</span>
                </span>
                <strong>{group.name}</strong>
                <small>{lastMsg ? `${lastMsg.author.split(' ')[0]}: ${lastMsg.text.replace(/\s+/g, ' ')}` : group.description}</small>
              </button>
            )
          })}
        </div>
      </aside>

      {activeGroup && (
        <section className="comm-room" aria-label={`Chat de ${activeGroup.name}`}>
          <header className="comm-room-header">
            <div>
              <h2>{activeGroup.name}</h2>
              <div className="comm-room-sub">
                <span className="p-badge tone-soft-accent">
                  {courseCategories.find((c) => c.id === activeGroup.category)?.shortLabel ?? activeGroup.categoryLabel}
                </span>
                <span className="comm-online">
                  <i aria-hidden="true" /> {activeGroup.onlineCount} en línea · {activeGroup.memberCount} miembros
                </span>
                <span>Mentor: {activeGroup.mentorName}</span>
              </div>
            </div>
            {manages ? (
              <button
                type="button"
                className="p-button p-button-short tone-pill"
                aria-expanded={managingId === activeGroup.id}
                onClick={() => setManagingId(managingId === activeGroup.id ? undefined : activeGroup.id)}
              >
                <Settings size={14} aria-hidden="true" /> Administrar
              </button>
            ) : (
              <button
                type="button"
                className="p-button p-button-short tone-danger"
                onClick={() => onLeaveGroup(activeGroup.id)}
              >
                <LogOut size={14} aria-hidden="true" /> Salir del grupo
              </button>
            )}
          </header>

          {manages && managingId === activeGroup.id && (
            <GroupAdminPanel
              key={activeGroup.id}
              group={activeGroup}
              userId={user.id}
              onEdit={(details) => onEditGroup(activeGroup.id, details)}
              onRemoveMember={(memberId) => onRemoveMember(activeGroup.id, memberId)}
              onDelete={() => onDeleteGroup(activeGroup.id)}
            />
          )}

          {activeGroup.pinnedNote && (
            <div className="comm-pinned">
              <Pin size={14} aria-hidden="true" />
              <span>{activeGroup.pinnedNote}</span>
            </div>
          )}

          <div className="comm-feed" ref={feedRef} role="log" aria-label="Mensajes del grupo">
            {messages.length === 0 && <p className="p-empty">Aquí verás los mensajes enviados desde tu ingreso.</p>}
            {messages.map((msg) => (
              <article className="comm-msg" key={msg.id} data-own={msg.authorId === user.id ? 'true' : undefined}>
                <span className="p-avatar" aria-hidden="true">
                  {msg.initials}
                </span>
                <div className="comm-msg-bubble">
                  <div className="comm-msg-meta">
                    <strong>{msg.author}</strong>
                    <span>· {msg.authorRole}</span>
                    <span>· {msg.sentAt}</span>
                  </div>
                  <div className="comm-msg-body">{renderMessageBody(msg.text)}</div>
                </div>
              </article>
            ))}
          </div>

          <form className="comm-composer" onSubmit={handleSubmit}>
            <div className="comm-chips" role="group" aria-label="Insertar plantilla rápida">
              {quickTemplates.map((tpl) => (
                <button
                  key={tpl.label}
                  type="button"
                  className="comm-chip tone-pill"
                  onClick={() => setDraft(draft ? `${draft} ${tpl.insert}` : tpl.insert.trim())}
                >
                  {tpl.label}
                </button>
              ))}
            </div>
            <div className="comm-entry">
              <input
                type="text"
                maxLength={500}
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
                placeholder={`Escribe en ${activeGroup.name}…`}
                aria-label={`Mensaje para ${activeGroup.name}`}
              />
              <button
                type="submit"
                className="p-button tone-accent"
                disabled={!draft.trim() || sending}
              >
                <Send size={15} aria-hidden="true" /> Enviar
              </button>
            </div>
          </form>
        </section>
      )}
    </div>
  )
}
