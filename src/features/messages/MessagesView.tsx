import { ChevronDown, ChevronUp, MessageSquare, Search, UsersRound, X } from 'lucide-react'
import { useEffect, useRef, useState, type DragEvent } from 'react'
import { LoadingMark } from '../../components/ui/LoadingMark'
import {
  checkGroupSend,
  groupSendTimes,
  listContacts,
  listGroups,
  MessageRuleError,
  messagingService,
  onMessagesChanged,
} from '../../services'
import type { DemoUser } from '../../types/auth'
import type { DirectMessage, MessageAttachment, MessageGroup } from '../../types/messaging'
import type { Workspace } from '../../types/workspace'
import { formatSize, isImageType, maxAttachments, maxMessageBytes, prepareAttachment } from '../../utils/attachments'
import { plainText } from '../../utils/markdown'
import { initials, normalizeSearchText } from '../../utils/text'
import { AttachmentList } from './Attachments'
import { ImageViewer, type ViewerImage } from './ImageViewer'
import { MessageComposer } from './MessageComposer'
import { MessageText } from './MessageText'
import { RecipientSearch, roleLabels } from './RecipientSearch'
import '../../styles/community.css'
import '../../styles/messages.css'

interface MessagesViewProps {
  user: DemoUser
  workspace: Workspace
}

type LoadStatus = 'loading' | 'ready' | 'error'

/** Mensaje tal como se muestra: en un grupo propio, una sola burbuja con su estado de entrega. */
type ThreadMessage = DirectMessage & { delivery?: { total: number; read: number } }

interface Conversation {
  /** Id de la persona, o «group:<id del grupo>». */
  id: string
  kind: 'person' | 'group'
  name: string
  history: ThreadMessage[]
  last: ThreadMessage
  unread: number
}

const groupKey = (groupId: string) => `group:${groupId}`
const groupLabelFallback = 'Grupo'
const sendFailed =
  'No se pudo enviar (el almacenamiento del navegador puede estar lleno). Tu mensaje y tus archivos se conservan para que lo intentes de nuevo.'
const wideRule = 'No puedes enviar archivos a tus compañeros de curso; quita los adjuntos.'

const formatSentAt = (value: string) =>
  new Intl.DateTimeFormat('es-PE', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }).format(
    new Date(value),
  )

const previewOf = (message: DirectMessage) =>
  plainText(message.text) || `Adjunto: ${message.attachments?.[0]?.name ?? 'archivo'}`

/** Texto sobre el que se busca: el mensaje sin formato y los nombres de sus archivos. */
const searchableOf = (message: DirectMessage) =>
  normalizeSearchText([plainText(message.text), ...(message.attachments ?? []).map((item) => item.name)].join(' '))

/** Fragmento del mensaje alrededor de la primera palabra encontrada. */
function excerpt(message: DirectMessage, terms: string[]) {
  const text = previewOf(message)
  const folded = normalizeSearchText(text)
  const at = folded.length === text.length ? folded.indexOf(terms[0]) : -1
  if (at < 0) return text
  const from = Math.max(0, at - 24)
  return `${from > 0 ? '…' : ''}${text.slice(from, at + 80)}`
}

export function MessagesView({ user, workspace }: MessagesViewProps) {
  const contacts = listContacts(user.id, workspace)
  const role = user.role === 'teacher' ? 'teacher' : 'student'
  const groups = user.role === 'teacher' || user.role === 'student' ? listGroups(role, contacts) : []

  const [messages, setMessages] = useState<DirectMessage[]>([])
  const [status, setStatus] = useState<LoadStatus>('loading')
  const [reload, setReload] = useState(0)
  // Sin destino elegido se muestra el mensaje nuevo con su buscador.
  const [selectedId, setSelectedId] = useState<string>()
  const [focusRequest, setFocusRequest] = useState(0)
  // Un borrador y unos adjuntos por destino, para no enviar algo a quien no corresponde.
  const [drafts, setDrafts] = useState<Record<string, string>>({})
  const [pending, setPending] = useState<Record<string, MessageAttachment[]>>({})
  const [sending, setSending] = useState(false)
  const [reading, setReading] = useState(false)
  const [notice, setNotice] = useState<{ id: string; message: string }>()
  const [query, setQuery] = useState('')
  const [hitIndex, setHitIndex] = useState(0)
  const [viewer, setViewer] = useState<{ images: ViewerImage[]; index: number }>()
  const [dragging, setDragging] = useState(false)
  // Reloj que avanza para que los avisos de «espera un minuto» se actualicen solos.
  const [now, setNow] = useState(() => Date.now())
  const feedRef = useRef<HTMLDivElement>(null)
  const dragDepth = useRef(0)

  const otherId = (message: DirectMessage) => (message.senderId === user.id ? message.recipientId : message.senderId)

  // --- Conversaciones: una por persona y una por cada grupo al que el usuario escribió. ---
  const byTime = (a: DirectMessage, b: DirectMessage) => a.sentAt.localeCompare(b.sentAt)
  const personConversations: Conversation[] = [...new Set(messages.map(otherId))].map((id) => {
    const history = messages.filter((message) => otherId(message) === id).sort(byTime)
    const last = history[history.length - 1]
    return {
      id,
      kind: 'person',
      name: contacts.find((item) => item.id === id)?.name ?? (last.senderId === user.id ? last.recipientName : last.senderName),
      history,
      last,
      unread: history.filter((message) => message.recipientId === user.id && !message.read).length,
    }
  })

  const sentToGroups = messages.filter((message) => message.senderId === user.id && message.group)
  const groupConversations: Conversation[] = [...new Set(sentToGroups.map((message) => message.group!.id))].map((id) => {
    const copies = sentToGroups.filter((message) => message.group!.id === id)
    const batches = new Map<string, DirectMessage[]>()
    for (const copy of copies) batches.set(copy.group!.batchId, [...(batches.get(copy.group!.batchId) ?? []), copy])
    const history: ThreadMessage[] = [...batches.values()]
      .map((batch) => ({ ...batch[0], delivery: { total: batch.length, read: batch.filter((item) => item.read).length } }))
      .sort(byTime)
    const last = history[history.length - 1]
    return {
      id: groupKey(id),
      kind: 'group',
      name: groups.find((group) => group.id === id)?.label ?? last.group?.label ?? groupLabelFallback,
      history,
      last,
      unread: 0,
    }
  })

  const conversations = [...personConversations, ...groupConversations].sort((a, b) => b.last.sentAt.localeCompare(a.last.sentAt))

  // --- Búsqueda ---
  const terms = normalizeSearchText(query).split(/\s+/).filter(Boolean)
  const hitsOf = (conversation: Conversation) =>
    terms.length ? conversation.history.filter((message) => terms.every((term) => searchableOf(message).includes(term))) : []
  const visibleConversations = terms.length
    ? conversations.filter((item) => hitsOf(item).length > 0 || terms.every((term) => normalizeSearchText(item.name).includes(term)))
    : conversations

  // --- Destino activo ---
  const conversation = conversations.find((item) => item.id === selectedId)
  const contact = contacts.find((item) => item.id === selectedId)
  const group: MessageGroup | undefined = groups.find((item) => groupKey(item.id) === selectedId)
  const activeName = contact?.name ?? group?.label ?? conversation?.name
  const activeId = activeName ? selectedId : undefined
  const canWrite = Boolean(contact ?? group)
  const thread = conversation?.history ?? []
  const unreadInThread = conversation?.unread ?? 0
  const draft = activeId ? drafts[activeId] ?? '' : ''
  const files = activeId ? pending[activeId] ?? [] : []
  const threadHits = conversation ? hitsOf(conversation) : []
  const activeHit = threadHits.length ? Math.min(hitIndex, threadHits.length - 1) : -1

  // Reglas de envío grupal: el motivo de bloqueo (límite por hora, pausa) apaga el editor;
  // el resto (adjuntos, largo) solo impide enviar mientras no se corrija.
  const sentTimes = groupSendTimes(messages, user.id)
  const groupBlock = group ? checkGroupSend({ role, group, text: '', sentTimes, now }) : undefined
  const groupDraftCheck = group ? checkGroupSend({ role, group, text: draft, attachments: files, sentTimes, now }) : undefined
  const attachmentsDisabled = Boolean(group && role === 'student' && group.kind === 'course-classmates')
  const maxChars = group ? (role === 'student' ? 500 : 4000) : undefined
  const blockedReason = groupBlock && !groupBlock.ok ? groupBlock.reason : undefined
  const draftIssue = groupDraftCheck && !groupDraftCheck.ok && !blockedReason ? groupDraftCheck.reason : undefined
  const canSend = canWrite && !blockedReason && !draftIssue && (Boolean(draft.trim()) || files.length > 0) && !sending && !reading

  const errors = [draftIssue, notice?.id === activeId ? notice?.message : undefined].filter((item): item is string => Boolean(item))

  // Imágenes de la conversación abierta, para pasar de una a otra en el visor.
  const threadImages: ViewerImage[] = thread.flatMap((message) =>
    (message.attachments ?? []).filter((item) => isImageType(item.mime)).map((item) => ({ id: item.id, src: item.dataUrl, name: item.name })),
  )

  useEffect(() => {
    let alive = true
    setStatus('loading')
    messagingService
      .list(user.id)
      .then((loaded) => {
        if (!alive) return
        setMessages(loaded)
        setStatus('ready')
      })
      .catch(() => {
        if (alive) setStatus('error')
      })
    return () => {
      alive = false
    }
  }, [reload, user.id])

  // Mensajes que llegan con la pantalla abierta (otra pestaña, otro envío) entran sin recargar.
  useEffect(() => {
    let alive = true
    const stop = onMessagesChanged(() => {
      messagingService
        .list(user.id)
        .then((loaded) => {
          if (alive) setMessages(loaded)
        })
        .catch(() => {
          // Se conserva lo que ya se ve.
        })
    })
    return () => {
      alive = false
      stop()
    }
  }, [user.id])

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 15_000)
    return () => window.clearInterval(timer)
  }, [])

  useEffect(() => {
    if (status !== 'ready' || !contact || unreadInThread === 0) return
    const senderId = contact.id
    messagingService
      .markRead(user.id, senderId)
      .then(() => {
        setMessages((current) =>
          current.map((message) =>
            message.senderId === senderId && message.recipientId === user.id ? { ...message, read: true } : message,
          ),
        )
      })
      .catch(() => {
        // Si falla, los mensajes siguen como no leídos y se reintenta al volver a abrirlos.
      })
  }, [status, contact, unreadInThread, user.id])

  // Al abrir una conversación o llegar un mensaje, se baja al final; con una búsqueda activa se va a la coincidencia.
  useEffect(() => {
    const feed = feedRef.current
    if (feed) feed.scrollTop = feed.scrollHeight
  }, [status, activeId, thread.length])

  useEffect(() => {
    setHitIndex(Number.MAX_SAFE_INTEGER)
  }, [activeId, query])

  const activeHitId = activeHit >= 0 ? threadHits[activeHit].id : undefined
  useEffect(() => {
    if (activeHitId) document.getElementById(`msg-${activeHitId}`)?.scrollIntoView({ block: 'center' })
  }, [activeHitId, activeId])

  function newMessage() {
    setSelectedId(undefined)
    setFocusRequest((value) => value + 1)
  }

  async function addFiles(picked: File[]) {
    if (!canWrite || !activeId || !picked.length) return
    const targetId = activeId
    const current = pending[targetId] ?? []
    const fail = (message: string) => setNotice({ id: targetId, message })
    setNotice(undefined)
    if (attachmentsDisabled) {
      fail(wideRule)
      return
    }
    if (current.length + picked.length > maxAttachments) {
      fail(`Máximo ${maxAttachments} archivos por mensaje.`)
      return
    }
    setReading(true)
    try {
      const prepared: MessageAttachment[] = []
      for (const file of picked) prepared.push(await prepareAttachment(file))
      const next = [...current, ...prepared]
      if (next.reduce((sum, item) => sum + item.size, 0) > maxMessageBytes) {
        fail(`Los archivos de un mensaje no pueden superar ${formatSize(maxMessageBytes)} en total.`)
        return
      }
      setPending((value) => ({ ...value, [targetId]: next }))
    } catch (error) {
      fail(error instanceof Error ? error.message : 'No se pudo leer el archivo.')
    } finally {
      setReading(false)
    }
  }

  function removeFile(id: string) {
    if (!activeId) return
    const targetId = activeId
    setPending((value) => ({ ...value, [targetId]: (value[targetId] ?? []).filter((item) => item.id !== id) }))
  }

  async function send() {
    const text = draft.trim()
    if (!canSend || !activeId) return
    const targetId = activeId
    const attachments = files
    setSending(true)
    setNotice(undefined)
    try {
      if (contact) {
        const sent = await messagingService.send({
          senderId: user.id,
          senderName: user.name,
          recipientId: contact.id,
          recipientName: contact.name,
          text,
          attachments,
        })
        setMessages((current) => [...current, sent])
      } else if (group) {
        const copies = await messagingService.sendGroup({
          senderId: user.id,
          senderName: user.name,
          group: { id: group.id, label: group.label, kind: group.kind },
          recipients: group.members,
          text,
          attachments,
        })
        setMessages((current) => [...current, ...copies])
      }
      setDrafts((current) => ({ ...current, [targetId]: '' }))
      setPending((current) => ({ ...current, [targetId]: [] }))
    } catch (error) {
      setNotice({ id: targetId, message: error instanceof MessageRuleError ? error.message : sendFailed })
    } finally {
      setSending(false)
    }
  }

  // --- Arrastrar archivos sobre la conversación ---
  const hasFiles = (event: DragEvent) => Array.from(event.dataTransfer.types).includes('Files')
  function onDragEnter(event: DragEvent) {
    if (!hasFiles(event)) return
    event.preventDefault()
    dragDepth.current += 1
    setDragging(true)
  }
  function onDragOver(event: DragEvent) {
    if (!hasFiles(event)) return
    event.preventDefault()
    event.dataTransfer.dropEffect = canWrite && !attachmentsDisabled ? 'copy' : 'none'
  }
  function onDragLeave(event: DragEvent) {
    if (!hasFiles(event)) return
    dragDepth.current = Math.max(0, dragDepth.current - 1)
    if (dragDepth.current === 0) setDragging(false)
  }
  function onDrop(event: DragEvent) {
    if (!hasFiles(event)) return
    // Siempre se atiende el soltar: si no, el navegador abriría el archivo y se perdería la pantalla.
    event.preventDefault()
    dragDepth.current = 0
    setDragging(false)
    void addFiles(Array.from(event.dataTransfer.files))
  }

  function openImage(attachment: MessageAttachment) {
    const index = threadImages.findIndex((item) => item.id === attachment.id)
    if (index >= 0) setViewer({ images: threadImages, index })
  }

  const header = (
    <header className="p-section-heading">
      <div>
        <h1 id="messages-heading">Mensajes</h1>
        <p>Escribe en privado a docentes y alumnos de tus cursos, o a un grupo de ellos.</p>
      </div>
    </header>
  )

  let body
  if (status === 'loading') {
    body = (
      <div className="campus-loading">
        <LoadingMark label="Cargando mensajes" />
      </div>
    )
  } else if (status === 'error') {
    body = (
      <div className="p-card p-empty" role="alert">
        <p>No pudimos cargar tus mensajes.</p>
        <button type="button" className="p-button tone-accent" onClick={() => setReload((value) => value + 1)}>
          Reintentar
        </button>
      </div>
    )
  } else if (!contacts.length && !conversations.length) {
    body = (
      <div className="p-card p-empty">
        <MessageSquare size={28} aria-hidden="true" />
        <p>
          {user.role === 'student'
            ? 'Matricúlate en un curso para escribir a su docente y a tus compañeros.'
            : 'Aún no compartes cursos con otras personas.'}
        </p>
      </div>
    )
  } else {
    body = (
      <div className="comm-chat-layout">
        <aside className="comm-sidebar" aria-label="Tus mensajes">
          <div className="comm-sidebar-head">
            <h2>Tus mensajes</h2>
            <button type="button" className="p-button p-button-short" onClick={newMessage}>
              Nuevo mensaje
            </button>
          </div>
          <div className="comm-search">
            <Search size={15} aria-hidden="true" />
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Escape') setQuery('')
              }}
              placeholder="Buscar en tus mensajes"
              aria-label="Buscar en tus mensajes"
              autoComplete="off"
            />
            {query && (
              <button type="button" onClick={() => setQuery('')} aria-label="Borrar búsqueda">
                <X size={14} aria-hidden="true" />
              </button>
            )}
          </div>
          <div className="comm-group-list comm-conversations">
            {terms.length > 0 && (
              <p className="comm-recipient-empty" role="status">
                {visibleConversations.length
                  ? `${visibleConversations.length} conversación${visibleConversations.length === 1 ? '' : 'es'} con coincidencias.`
                  : 'No hay mensajes que coincidan.'}
              </p>
            )}
            {!conversations.length && <p className="comm-recipient-empty">Aún no has enviado ni recibido mensajes.</p>}
            {visibleConversations.map((item) => {
              const hits = hitsOf(item)
              const shown = hits.length ? hits[hits.length - 1] : item.last
              return (
                <button
                  key={item.id}
                  type="button"
                  className="comm-group-btn"
                  aria-current={item.id === activeId ? 'true' : undefined}
                  onClick={() => setSelectedId(item.id)}
                >
                  <span className="comm-group-btn-top">
                    <span>{formatSentAt(shown.sentAt)}</span>
                    {item.unread > 0 && <span className="p-badge tone-soft-accent">{item.unread} sin leer</span>}
                    {hits.length > 0 && <span className="p-badge">{hits.length} coincidencia{hits.length === 1 ? '' : 's'}</span>}
                  </span>
                  <strong className="comm-conv-name">
                    {item.kind === 'group' && <UsersRound size={13} aria-hidden="true" />}
                    {item.name}
                  </strong>
                  <small>
                    {shown.senderId === user.id && 'Tú: '}
                    {hits.length ? excerpt(shown, terms) : previewOf(shown)}
                  </small>
                </button>
              )
            })}
          </div>
        </aside>

        <section
          className="comm-room comm-direct"
          aria-label={activeName ? `Conversación con ${activeName}` : 'Mensaje nuevo'}
          data-dragging={dragging || undefined}
          onDragEnter={onDragEnter}
          onDragOver={onDragOver}
          onDragLeave={onDragLeave}
          onDrop={onDrop}
        >
          {dragging && (
            <div className="comm-drop" aria-hidden="true">
              {canWrite && !attachmentsDisabled ? 'Suelta los archivos para adjuntarlos' : 'Aquí no se pueden adjuntar archivos'}
            </div>
          )}
          {activeName ? (
            <>
              <header className="comm-room-header">
                <div>
                  <h2>{activeName}</h2>
                  <div className="comm-room-sub">
                    <span>
                      {contact
                        ? `${roleLabels[contact.role]} · ${contact.courseNames.join(' · ')}`
                        : group
                          ? `${group.description}. Cada persona lo recibe en privado y te responde solo a ti.`
                          : conversation?.kind === 'group'
                            ? 'Ya no puedes escribir a este grupo: puedes leer lo que enviaste, pero no enviar más.'
                            : 'Ya no comparten ningún curso: puedes leer el historial, pero no escribirle.'}
                    </span>
                  </div>
                </div>
                {threadHits.length > 0 && (
                  <div className="comm-hit-nav" role="group" aria-label="Coincidencias en esta conversación">
                    <span aria-live="polite">
                      {activeHit + 1} de {threadHits.length}
                    </span>
                    <button
                      type="button"
                      onClick={() => setHitIndex((activeHit - 1 + threadHits.length) % threadHits.length)}
                      aria-label="Coincidencia anterior"
                    >
                      <ChevronUp size={16} aria-hidden="true" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setHitIndex((activeHit + 1) % threadHits.length)}
                      aria-label="Coincidencia siguiente"
                    >
                      <ChevronDown size={16} aria-hidden="true" />
                    </button>
                  </div>
                )}
              </header>
              <div className="comm-feed" ref={feedRef} role="log" aria-label="Mensajes privados">
                {thread.length === 0 && <p className="p-empty">Escribe el primer mensaje.</p>}
                {thread.map((message) => {
                  const own = message.senderId === user.id
                  const isHit = threadHits.some((item) => item.id === message.id)
                  return (
                    <article
                      className="comm-msg"
                      id={`msg-${message.id}`}
                      key={message.id}
                      data-own={own ? 'true' : undefined}
                      data-hit={isHit || undefined}
                      data-current={message.id === activeHitId || undefined}
                    >
                      <span className="p-avatar" aria-hidden="true">
                        {initials(message.senderName)}
                      </span>
                      <div className="comm-msg-bubble">
                        <div className="comm-msg-meta">
                          <strong>{message.senderName}</strong>
                          <span>· {formatSentAt(message.sentAt)}</span>
                          {message.delivery ? (
                            <span>
                              · Enviado a {message.delivery.total}
                              {message.delivery.read > 0 ? ` · Leído por ${message.delivery.read}` : ''}
                            </span>
                          ) : (
                            own && <span>· {message.read ? 'Leído' : 'Enviado'}</span>
                          )}
                        </div>
                        {message.group && conversation?.kind !== 'group' && (
                          <span className="comm-group-tag">
                            <UsersRound size={12} aria-hidden="true" /> {own ? 'Enviado a' : 'Enviado al grupo'}: {message.group.label}
                          </span>
                        )}
                        <div className="comm-msg-body">
                          {message.text && <MessageText text={message.text} terms={terms} normalize={normalizeSearchText} />}
                          {message.attachments && message.attachments.length > 0 && (
                            <AttachmentList attachments={message.attachments} onOpenImage={openImage} />
                          )}
                        </div>
                      </div>
                    </article>
                  )
                })}
              </div>
            </>
          ) : (
            <>
              <header className="comm-room-header">
                <h2>Mensaje nuevo</h2>
              </header>
              <RecipientSearch
                contacts={contacts}
                groups={groups}
                focusRequest={focusRequest}
                onSelect={(person) => setSelectedId(person.id)}
                onSelectGroup={(target) => setSelectedId(groupKey(target.id))}
              />
            </>
          )}

          <MessageComposer
            targetName={activeName}
            canWrite={canWrite}
            blockedReason={blockedReason}
            value={draft}
            onChange={(value) => activeId && setDrafts((current) => ({ ...current, [activeId]: value }))}
            files={files}
            onAddFiles={(picked) => void addFiles(picked)}
            onRemoveFile={removeFile}
            attachmentsDisabled={attachmentsDisabled}
            maxChars={maxChars}
            sending={sending}
            reading={reading}
            canSend={canSend}
            errors={errors}
            onSubmit={() => void send()}
            focusKey={activeId}
          />
        </section>

        {viewer && (
          <ImageViewer
            images={viewer.images}
            index={viewer.index}
            onIndex={(index) => setViewer({ ...viewer, index })}
            onClose={() => setViewer(undefined)}
          />
        )}
      </div>
    )
  }

  return (
    <section className="comm-root" aria-labelledby="messages-heading">
      {header}
      {body}
    </section>
  )
}
