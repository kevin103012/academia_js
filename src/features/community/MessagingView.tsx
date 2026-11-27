import { useEffect, useRef, useState, type FormEvent } from 'react'
import { Inbox, Plus, RefreshCw, Send } from 'lucide-react'
import { messagingService, messagingSyncEnabled, type Thread, type ThreadKind, type ThreadStatus } from '../../services/community/messagingService'
import type { DemoUser } from '../../types/auth'
import type { Workspace } from '../../types/workspace'
import { canSeeCourse } from '../../utils/campusAccess'

const kinds: Record<ThreadKind, string> = {
  course_inquiry: 'Consulta al instructor', incident_report: 'Incidencia de curso', urgent_admin: 'Mensaje urgente',
}
const statusLabels: Record<ThreadStatus, string> = {
  open: 'Abierta', verifying_with_instructor: 'En verificación', resolved: 'Resuelta',
}
const timestamp = new Intl.DateTimeFormat('es-PE', { dateStyle: 'short', timeStyle: 'short' })

export function MessagingView({ user, workspace }: { user: DemoUser; workspace: Workspace }) {
  const [threads, setThreads] = useState<Thread[]>([])
  const [selected, setSelected] = useState<string>()
  const [draft, setDraft] = useState<{ kind: ThreadKind; course?: string; subject?: string }>()
  const [response, setResponse] = useState('')
  const [working, setWorking] = useState(false)
  const [error, setError] = useState('')
  const busy = useRef(false)
  const log = useRef<HTMLDivElement>(null)
  const courses = workspace.courses.filter((course) => canSeeCourse(user, workspace, course.id))
  const thread = threads.find((item) => item.id === selected)
  const course = workspace.courses.find((item) => item.id === thread?.courseId)
  const canReview = user.role === 'admin' || user.role === 'coordinator'
  const canContact = user.role !== 'teacher' && courses.length > 0
  const canReport = courses.length > 0 && user.role !== 'coordinator' && user.role !== 'admin'

  useEffect(() => {
    let active = true
    messagingService.list(user).then((items) => {
      if (active) setThreads(items)
    }).catch((cause) => { if (active) setError(cause.message) })
    return () => { active = false }
  }, [user])

  useEffect(() => {
    if (log.current) log.current.scrollTop = log.current.scrollHeight
  }, [selected, thread?.messages.length])

  async function run(task: () => Promise<void>) {
    if (busy.current) return
    busy.current = true
    setWorking(true)
    setError('')
    try {
      await task()
      setThreads(await messagingService.list(user))
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'No se pudo completar la operación.')
    } finally {
      busy.current = false
      setWorking(false)
    }
  }

  function start(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!draft) return
    const data = new FormData(event.currentTarget)
    const subject = String(data.get('subject') ?? '').trim()
    const text = String(data.get('message') ?? '').trim()
    if (!subject || !text) return
    const linked = draft.kind === 'urgent_admin' ? undefined : courses.find((item) => item.id === data.get('course'))
    if (draft.kind !== 'urgent_admin' && !linked) return
    void run(async () => {
      const recipientId = draft.kind === 'course_inquiry' && linked
        ? await messagingService.teacherId(linked.teacherId, linked.teacher)
        : undefined
      if (draft.kind === 'course_inquiry' && !recipientId) throw new Error('Este curso necesita un instructor asignado para recibir consultas.')
      const id = await messagingService.create(user, {
        kind: draft.kind, courseId: linked?.id, subject, recipientId,
        targetRole: draft.kind === 'incident_report' ? 'coordinator' : draft.kind === 'urgent_admin' ? 'admin' : undefined,
      }, text)
      setSelected(id)
      setDraft(undefined)
      setResponse('')
    })
  }

  return <section className="p-messaging" aria-labelledby="inbox-heading">
    <header className="p-section-heading">
      <div><h1 id="inbox-heading">Mensajería</h1><p>Consultas de curso e incidencias académicas.</p></div>
      <div className="p-actions-row">
        <button type="button" className="p-button" onClick={() => void run(async () => {})} disabled={working}>
          <RefreshCw size={15} aria-hidden="true" /> Actualizar
        </button>
        <button type="button" className="p-button p-button-primary" disabled={working} onClick={() => {
          setDraft({ kind: canContact ? 'course_inquiry' : canReport ? 'incident_report' : 'urgent_admin' })
        }}><Plus size={17} aria-hidden="true" /> Nuevo mensaje</button>
      </div>
    </header>
    {!messagingSyncEnabled && <p className="p-meta">Bandeja de demostración de este navegador. Usa mensajes de prueba.</p>}
    {error && <p className="p-warning" role="alert">{error}</p>}

    {draft && <form className="p-card p-form" onSubmit={start} key={draft.subject ?? 'new'}>
      <h2>Redactar mensaje</h2>
      <div className="p-form-workbench">
        <div className="p-form-col">
          <label>Tipo de mensaje
            <select value={draft.kind} onChange={(event) => setDraft({ kind: event.target.value as ThreadKind })}>
              {canContact && <option value="course_inquiry">Consulta al instructor</option>}
              {canReport && <option value="incident_report">Reportar incidencia a Coordinación</option>}
              <option value="urgent_admin">Mensaje urgente a Administración</option>
            </select>
          </label>
          {draft.kind !== 'urgent_admin' && <label>Curso
            <select name="course" required defaultValue={draft.course ?? ''}>
              <option value="" disabled>Selecciona un curso</option>
              {courses.map((item) => <option value={item.id} key={item.id}>{item.name} · {item.teacher}</option>)}
            </select>
          </label>}
          <label>Asunto<input name="subject" defaultValue={draft.subject ?? ''} required maxLength={100} /></label>
          <div className="p-actions-row">
            <button className="p-button p-button-primary" type="submit" disabled={working}><Send size={15} aria-hidden="true" /> Enviar</button>
            <button className="p-button" type="button" disabled={working} onClick={() => setDraft(undefined)}>Cancelar</button>
          </div>
        </div>
        <div className="p-form-col--stretch">
          <label className="p-form-label-grow">Mensaje<textarea name="message" rows={5} required maxLength={2000} /></label>
        </div>
      </div>
    </form>}

    <div className="p-inbox-layout">
      <div className="p-inbox-list" aria-label="Conversaciones">
        {threads.map((item) => <button type="button" key={item.id} aria-current={item.id === selected ? 'true' : undefined}
          onClick={() => { setSelected(item.id); setResponse(''); setDraft(undefined) }} disabled={working}>
          <strong>{item.subject}</strong><small>{kinds[item.kind]} · {item.kind === 'course_inquiry' ? timestamp.format(new Date(item.updatedAt)) : statusLabels[item.status]}</small>
        </button>)}
        {threads.length === 0 && <p className="p-meta">Aún no hay conversaciones.</p>}
      </div>
      {thread ? <section className="p-card p-inbox-conversation" aria-label={thread.subject}>
        <header className="p-inbox-heading">
          <h2>{thread.subject}</h2><p className="p-meta">{kinds[thread.kind]}{course ? ' · ' + course.name : ''}</p>
          {canReview && thread.kind !== 'course_inquiry' && <div className="p-actions-row">
            <label>Estado
              <select value={thread.status} disabled={working} onChange={(event) => {
                const status = event.target.value as ThreadStatus
                void run(() => messagingService.updateStatus(user, thread.id, status))
              }}>
                {Object.entries(statusLabels).map(([id, label]) => <option key={id} value={id}>{label}</option>)}
              </select>
            </label>
            {thread.kind === 'incident_report' && course && <button type="button" className="p-button"
              onClick={() => setDraft({ kind: 'course_inquiry', course: course.id, subject: ('Verificación · ' + thread.subject).slice(0, 100) })}>
              Consultar al instructor
            </button>}
          </div>}
        </header>
        <div className="p-inbox-log" ref={log} role="log" aria-label="Mensajes" tabIndex={0}>
          {thread.messages.map((message) => <article key={message.id} data-own={message.senderId === user.id}>
            <strong>{message.senderName}</strong><time dateTime={message.sentAt}>{timestamp.format(new Date(message.sentAt))}</time>
            <p>{message.text}</p>
          </article>)}
        </div>
        <form className="p-inbox-reply" onSubmit={(event) => {
          event.preventDefault()
          const text = response.trim()
          if (!text) return
          void run(async () => { await messagingService.reply(user, thread.id, text); setResponse('') })
        }}>
          <label>Responder<textarea maxLength={2000} rows={2} value={response} onChange={(event) => setResponse(event.target.value)} required /></label>
          <button className="p-button p-button-primary" disabled={working || !response.trim()} type="submit"><Send size={15} aria-hidden="true" /> Enviar</button>
        </form>
      </section> : <div className="p-empty"><Inbox size={26} aria-hidden="true" /><p>Selecciona una conversación o redacta un mensaje.</p></div>}
    </div>
  </section>
}
