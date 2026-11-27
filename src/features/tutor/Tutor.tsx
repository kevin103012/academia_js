import { useEffect, useRef, useState, type FormEvent } from 'react'
import { ArrowUp, Plus, Sparkles, ThumbsUp, Trash2 } from 'lucide-react'
import { LoadingMark } from '../../components/ui/LoadingMark'
import { aiDomains, createInitialAiState } from '../../data/aiSeed'
import { aiService } from '../../services'
import { getActiveModelsForRole, tutorService, tutorSyncEnabled } from '../../services/tutor/tutorService'
import type { DemoUser } from '../../types/auth'
import type { TutorMessage, TutorSession } from '../../types/tutor'
import { createId } from '../../utils/id'
import '../../styles/tutor.css'

function MessageText({ text }: { text: string }) {
  return <div className="study-tutor__body">
    {text.split(/```(?:[a-zA-Z]*)\n?([\s\S]*?)```/g).map((part, index) =>
      index % 2 ? <pre key={index}><code>{part.trim()}</code></pre> : <p key={index}>{part.trim()}</p>,
    )}
  </div>
}

function TutorConversation({ user }: { user: DemoUser }) {
  const [sessions, setSessions] = useState<TutorSession[]>([])
  const [selectedId, setSelectedId] = useState<string>()
  const [draftDomain, setDraftDomain] = useState<TutorSession['domain']>('auto')
  const [question, setQuestion] = useState('')
  const [ready, setReady] = useState(false)
  const [working, setWorking] = useState(false)
  const [error, setError] = useState('')
  const [confirmRemove, setConfirmRemove] = useState(false)
  const [config, setConfig] = useState(createInitialAiState)
  const log = useRef<HTMLDivElement>(null)
  const field = useRef<HTMLTextAreaElement>(null)
  const busy = useRef(false)

  useEffect(() => {
    let active = true
    Promise.allSettled([tutorService.list(user), aiService.load()]).then(([history, ai]) => {
      if (!active) return
      if (history.status === 'fulfilled') {
        setSessions(history.value)
        setSelectedId(history.value[0]?.id)
      }
      if (ai.status === 'fulfilled') setConfig(ai.value)
      if (history.status === 'rejected' || ai.status === 'rejected') setError('No se pudo cargar todo el espacio de estudio.')
      setReady(true)
    })
    return () => { active = false }
  }, [user])

  const active = sessions.find((session) => session.id === selectedId)
  const models = getActiveModelsForRole(config, user.role)
  const domains = aiDomains.filter((domain) => models.some((model) => model.domain === domain.id))
  const domain = active?.domain ?? draftDomain
  const available = domain === 'auto' ? models.length > 0 : domains.some((item) => item.id === domain)
  const availableModels = domain === 'auto' ? models : models.filter((model) => model.domain === domain)
  const lastReply = active?.messages.filter((message) => message.role === 'tutor').at(-1)
  const suggestions = (domain === 'auto' ? domains.slice(0, 2) : domains.filter((item) => item.id === domain))
  const hasMessages = Boolean(active?.messages.length)

  useEffect(() => {
    if (log.current) log.current.scrollTop = log.current.scrollHeight
  }, [active?.id, active?.messages.length, working])

  async function run(task: () => Promise<void>) {
    if (busy.current) return
    busy.current = true
    setWorking(true)
    setError('')
    try {
      await task()
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'No se pudo completar el cambio.')
    } finally {
      busy.current = false
      setWorking(false)
    }
  }

  async function save(next: TutorSession) {
    await tutorService.save(user, next)
    setSessions((current) => [next, ...current.filter((session) => session.id !== next.id)])
    setSelectedId(next.id)
  }

  function newConversation() {
    setSelectedId(undefined)
    setDraftDomain('auto')
    setQuestion('')
    setConfirmRemove(false)
    field.current?.focus()
  }

  function selectConversation(id: string) {
    setSelectedId(id)
    setQuestion('')
    setConfirmRemove(false)
  }

  function changeDomain(nextDomain: TutorSession['domain']) {
    if (!active) {
      setDraftDomain(nextDomain)
      return
    }
    void run(() => save({ ...active, domain: nextDomain, updatedAt: new Date().toISOString() }))
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const text = question.trim()
    if (!text || !available) return
    void run(async () => {
      const prompt: TutorMessage = { id: createId(), role: 'student', text }
      const reply = await tutorService.answer(user, domain, text)
      await save({
        id: active?.id ?? createId(),
        title: active?.title ?? (text.length > 52 ? text.slice(0, 51) + '…' : text),
        domain,
        updatedAt: new Date().toISOString(),
        messages: [...(active?.messages ?? []), prompt, reply],
      })
      setQuestion('')
    })
  }

  function removeConversation() {
    if (!active) return
    void run(async () => {
      await tutorService.remove(user, active.id)
      setSessions((current) => current.filter((session) => session.id !== active.id))
      newConversation()
    })
  }

  if (!ready) return <div className="campus-loading"><LoadingMark label="Cargando tutor" /></div>

  return (
    <section className="study-tutor" aria-labelledby="tutor-heading">
      <header className="p-section-heading">
        <div>
          <h1 id="tutor-heading">Tutor de estudio</h1>
          <p>Consulta ejercicios y ejemplos por especialidad.</p>
        </div>
        <span className="p-badge">Tutor de ejemplos</span>
      </header>

      <div className="study-tutor__layout study-tutor__sessions-layout">
        <aside className="study-tutor__topics" aria-label="Historial del tutor">
          <button type="button" className="p-button p-button-primary" onClick={newConversation} disabled={working}>
            <Plus size={16} aria-hidden="true" /> Nueva conversación
          </button>
          {sessions.length > 0 && <details className="study-tutor__history" open>
            <summary>Conversaciones ({sessions.length})</summary>
            <div className="study-tutor__session-list">
            {sessions.map((session) => (
              <button
                key={session.id}
                type="button"
                aria-current={session.id === selectedId ? 'true' : undefined}
                onClick={() => selectConversation(session.id)}
                disabled={working}
              >
                <strong>{session.title}</strong>
                <small>{aiDomains.find((item) => item.id === session.domain)?.shortLabel ?? 'Automática'}</small>
              </button>
            ))}
            </div>
          </details>}
        </aside>

        <section className="study-tutor__chat" aria-labelledby="tutor-chat-heading">
          <div className="study-tutor__chat-heading">
            <div>
              <h2 id="tutor-chat-heading"><Sparkles size={18} aria-hidden="true" /> {active?.title ?? 'Consulta de estudio'}</h2>
              <p>{lastReply?.model ? 'Última respuesta con ' + lastReply.model
                : domain === 'auto' ? `${availableModels.length} modelos disponibles`
                : availableModels.map((model) => model.name).join(' · ') || 'Sin modelos disponibles'}</p>
            </div>
            <label className="study-tutor__specialty">
              Especialidad
              <select value={domain} disabled={working} onChange={(event) => changeDomain(event.target.value as TutorSession['domain'])}>
                <option value="auto">Detección automática</option>
                {!available && domain !== 'auto' && <option value={domain}>{aiDomains.find((item) => item.id === domain)?.label ?? domain} · Inactivo</option>}
                {domains.map((item) => <option value={item.id} key={item.id}>{item.label}</option>)}
              </select>
            </label>
            {active && <button className="p-button p-button-short" type="button" onClick={() => setConfirmRemove(!confirmRemove)} disabled={working}>
              <Trash2 size={15} aria-hidden="true" /> Eliminar conversación
            </button>}
          </div>

          {confirmRemove && <div className="study-tutor__confirmation">
            <span>¿Eliminar esta conversación y sus mensajes?</span>
            <div>
              <button type="button" className="tone-pill" onClick={() => setConfirmRemove(false)}>Cancelar</button>
              <button type="button" className="tone-danger" onClick={removeConversation} disabled={working}>Eliminar</button>
            </div>
          </div>}

          <div className="study-tutor__log" data-empty={!hasMessages} ref={log} role="log" aria-label="Mensajes del tutor" tabIndex={0}>
            {!hasMessages && suggestions.length > 0 && <div className="study-tutor__welcome">
              <h3>Prueba una pregunta</h3>
              <div className="study-tutor__suggestions">
                {suggestions.map((item) => <button key={item.id} type="button" className="p-button p-button-short" onClick={() => {
                  setQuestion(item.samplePrompt)
                  field.current?.focus()
                }}>{item.samplePrompt}</button>)}
              </div>
            </div>}
            {active?.messages.map((message) => <article key={message.id} className="study-tutor__message" data-role={message.role}>
              <h3>{message.role === 'student' ? 'Tú' : message.model ?? 'Tutor de estudio'}</h3>
              <MessageText text={message.text} />
              {message.role === 'tutor' && <button
                className={'study-tutor__feedback ' + (message.helpful ? 'tone-soft-accent' : 'tone-pill')}
                type="button"
                disabled={working}
                aria-pressed={Boolean(message.helpful)}
                onClick={() => void run(() => save({
                  ...active,
                  messages: active.messages.map((item) => item.id === message.id ? { ...item, helpful: !item.helpful } : item),
                }))}
              ><ThumbsUp size={14} aria-hidden="true" /> Me sirvió</button>}
            </article>)}
          </div>

          <form className="study-tutor__composer" onSubmit={submit}>
            <label htmlFor="tutor-question">Tu consulta</label>
            <div className="study-tutor__entry">
              <textarea id="tutor-question" ref={field} maxLength={600} rows={2} value={question} onChange={(event) => setQuestion(event.target.value)} placeholder="Escribe una pregunta o pega tu ejercicio" />
              <button type="submit" className="study-tutor__send" disabled={working || !available || !question.trim()} aria-label="Enviar pregunta">
                <ArrowUp size={21} aria-hidden="true" />
              </button>
            </div>
            {working && <p role="status">Procesando el cambio…</p>}
            {error && <p role="alert">{error}</p>}
            {!available && <p>Elige una especialidad con modelos habilitados para tu perfil.</p>}
            {!tutorSyncEnabled && <p>El historial se guarda en este navegador.</p>}
          </form>
        </section>
      </div>
    </section>
  )
}

export default function Tutor({ user }: { user: DemoUser }) {
  return <TutorConversation key={user.id} user={user} />
}
