import { useEffect, useRef, useState, type FormEvent } from 'react'
import {
  ArrowUp,
  Binary,
  BookOpenText,
  Calculator,
  ChevronRight,
  FlaskConical,
  Lightbulb,
  ShieldCheck,
  Sparkles,
  ThumbsUp,
} from 'lucide-react'
import { aiDomains, createInitialAiState } from '../../data/aiSeed'
import { tutorTopics } from '../../data/tutorResponses'
import { aiService, getActiveModelsForRole, tutorService } from '../../services'
import type { AiControlState } from '../../types/ai'
import type { DemoUser } from '../../types/auth'
import type { TutorMessage, TutorTopicIcon } from '../../types/tutor'
import { createId } from '../../utils/id'
import '../../styles/tutor.css'

const topicIcons: Record<TutorTopicIcon, typeof FlaskConical> = {
  science: FlaskConical,
  math: Calculator,
  reading: BookOpenText,
  algorithms: Binary,
}

const socraticChips = [
  { label: 'Dame una pista', prompt: 'Dame una pista socrática paso a paso para empezar' },
  { label: 'Ver matriz o tabla', prompt: 'Muéstrame la matriz o tabla lógica base de Gauss-Jordan y compuertas' },
  { label: 'Verificar mi paso', prompt: 'Verifica mi planteamiento con la lista técnica de comprobación' },
  { label: 'Reto práctico', prompt: 'Dame un reto práctico corto de complejidad o circuitos' },
]

function renderFormattedText(text: string) {
  const segments = text.split(/```(?:[a-zA-Z]*)\n?([\s\S]*?)```/g)
  return segments.map((part, index) => {
    const trimmed = part.trim()
    if (!trimmed) return null
    if (index % 2 === 1) {
      return (
        <pre key={index} className="study-tutor__code theme-dark">
          <code>{trimmed}</code>
        </pre>
      )
    }
    return <p key={index}>{trimmed}</p>
  })
}

function createMessage(role: TutorMessage['role'], text: string): TutorMessage {
  return { id: createId(), role, text }
}

function TutorConversation({ user }: { user: DemoUser }) {
  const [messages, setMessages] = useState<TutorMessage[]>([])
  const [aiState, setAiState] = useState<AiControlState>(createInitialAiState)
  const [loaded, setLoaded] = useState(false)
  const [question, setQuestion] = useState('')
  const [storageError, setStorageError] = useState(false)
  const [confirmClear, setConfirmClear] = useState(false)
  const conversation = useRef<HTMLDivElement>(null)
  const questionField = useRef<HTMLTextAreaElement>(null)
  const clearTrigger = useRef<HTMLButtonElement>(null)
  const shouldPersistRef = useRef(false)

  const lastMessage = messages.at(-1)
  const pendingMessage = lastMessage?.role === 'student' ? lastMessage : undefined
  const waiting = Boolean(pendingMessage)

  const activeModels = getActiveModelsForRole(aiState, user.role)
  const activeDomains = new Set(activeModels.map((model) => model.domain))

  useEffect(() => {
    let active = true
    Promise.all([tutorService.loadMessages(user.id), aiService.load()])
      .then(([loadedMessages, loadedAi]) => {
        if (!active) return
        shouldPersistRef.current = false
        setMessages(loadedMessages)
        setAiState(loadedAi)
        setLoaded(true)
      })
      .catch(() => {
        if (active) setLoaded(true)
      })
    return () => {
      active = false
    }
  }, [user.id])

  useEffect(() => {
    if (!loaded || !shouldPersistRef.current) return
    let active = true
    tutorService
      .saveMessages(user.id, messages)
      .then((ok) => {
        if (active) setStorageError(!ok)
      })
      .catch(() => {
        if (active) setStorageError(true)
      })
    return () => {
      active = false
    }
  }, [messages, loaded, user.id])

  useEffect(() => {
    if (!pendingMessage) return
    let active = true
    tutorService
      .ask(pendingMessage.text, user.role)
      .then((answer) => {
        if (!active) return
        const reply = createMessage('tutor', answer)
        shouldPersistRef.current = true
        setMessages((current) => (current.at(-1)?.id === pendingMessage.id ? [...current, reply] : current))
      })
      .catch(() => {
        if (!active) return
        const fallback = createMessage('tutor', 'No pudimos obtener una respuesta en este momento. Intenta de nuevo.')
        shouldPersistRef.current = true
        setMessages((current) => (current.at(-1)?.id === pendingMessage.id ? [...current, fallback] : current))
      })
    return () => {
      active = false
    }
  }, [pendingMessage, user.role])

  useEffect(() => {
    const log = conversation.current
    if (log) log.scrollTop = log.scrollHeight
  }, [lastMessage?.id])

  function ask(text: string) {
    const cleaned = text.trim()
    if (!cleaned || waiting) return
    const message = createMessage('student', cleaned)
    shouldPersistRef.current = true
    setMessages((current) => (current.at(-1)?.role === 'student' ? current : [...current, message]))
    setConfirmClear(false)
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!question.trim() || waiting) return
    ask(question)
    setQuestion('')
    questionField.current?.focus()
  }

  function toggleHelpful(id: string) {
    shouldPersistRef.current = true
    setMessages((current) =>
      current.map((message) => (message.id === id ? { ...message, helpful: !message.helpful } : message)),
    )
  }

  function clear() {
    shouldPersistRef.current = false
    setMessages([])
    setConfirmClear(false)
    void tutorService
      .clearMessages(user.id)
      .then((ok) => setStorageError(!ok))
      .catch(() => setStorageError(true))
    questionField.current?.focus()
  }

  return (
    <section className="study-tutor" aria-labelledby="tutor-heading">
      <header className="study-tutor__heading">
        <div>
          <h1 id="tutor-heading">Tutor de estudio</h1>
          <p>Álgebra Lineal, Circuitos Digitales, Frameworks y Algoritmos con bloques técnicos.</p>
        </div>
        <div className="study-tutor__models" aria-label="Especialidades de IA activas para tu perfil">
          <span className={`p-badge ${aiState.config.stepByStepStudentMode ? 'tone-soft-accent' : ''}`}>
            <ShieldCheck size={13} aria-hidden="true" />{' '}
            {aiState.config.stepByStepStudentMode ? 'Modo Socrático' : 'Respuesta directa'}
          </span>
          {activeModels.length > 0 ? (
            activeModels.map((model) => {
              const shortDomain = aiDomains.find((d) => d.id === model.domain)?.shortLabel ?? model.domainLabel
              return (
                <span key={model.id} className="p-badge tone-soft-accent">
                  {model.name} · {shortDomain} ({model.valAccuracy.toFixed(1)}%)
                </span>
              )
            })
          ) : (
            <span className="p-badge">Sin modelos habilitados por administración</span>
          )}
        </div>
      </header>

      <div className="study-tutor__layout">
        <section className="study-tutor__chat" aria-labelledby="tutor-chat-heading">
          <div className="study-tutor__chat-heading">
            <div>
              <h2 id="tutor-chat-heading">
                <Sparkles size={18} aria-hidden="true" /> Copiloto técnico
              </h2>
              <p>Pistas progresivas, matrices, tablas de verdad y arquitectura limpia.</p>
            </div>
            {messages.length > 0 && (
              <button
                ref={clearTrigger}
                className="study-tutor__clear tone-pill"
                type="button"
                aria-expanded={confirmClear}
                aria-controls="tutor-delete-confirmation"
                onClick={() => setConfirmClear(!confirmClear)}
              >
                Borrar historial
              </button>
            )}
          </div>

          <div
            id="tutor-delete-confirmation"
            className="study-tutor__confirmation"
            role="group"
            aria-label="Confirmar borrado del historial"
            hidden={!confirmClear}
          >
            <span>¿Borrar los mensajes guardados en este navegador?</span>
            <div>
              <button
                className="tone-pill"
                type="button"
                onClick={() => {
                  setConfirmClear(false)
                  clearTrigger.current?.focus()
                }}
              >
                Cancelar
              </button>
              <button className="tone-danger" type="button" onClick={clear}>
                Borrar
              </button>
            </div>
          </div>

          <div className="study-tutor__log" ref={conversation} role="log" aria-label="Mensajes del tutor" tabIndex={0}>
            {messages.length === 0 ? (
              <div className="study-tutor__welcome">
                <div className="study-tutor__symbol">
                  <Sparkles size={23} aria-hidden="true" />
                </div>
                <h3>¿Qué quieres resolver hoy?</h3>
                <p>Escribe una duda técnica, usa un chip socrático o elige una especialidad a la derecha.</p>
              </div>
            ) : (
              messages.map((message) => (
                <article key={message.id} className="study-tutor__message" data-role={message.role}>
                  <h3>{message.role === 'student' ? 'Tú' : 'Copiloto Sparks'}</h3>
                  <div className="study-tutor__body">{renderFormattedText(message.text)}</div>
                  {message.role === 'tutor' && (
                    <button
                      className={`study-tutor__feedback ${message.helpful ? 'tone-soft-accent' : 'tone-pill'}`}
                      type="button"
                      aria-pressed={Boolean(message.helpful)}
                      onClick={() => toggleHelpful(message.id)}
                    >
                      <ThumbsUp size={14} aria-hidden="true" /> Me sirvió
                    </button>
                  )}
                </article>
              ))
            )}
            {waiting && (
              <div className="study-tutor__waiting">
                <span className="study-tutor__dots" aria-hidden="true">
                  <i />
                  <i />
                  <i />
                </span>
                Consultando modelo especializado…
              </div>
            )}
          </div>

          <form className="study-tutor__composer" onSubmit={submit}>
            <div className="study-tutor__chips" role="group" aria-label="Acciones socráticas rápidas">
              {socraticChips.map((chip) => (
                <button
                  key={chip.label}
                  type="button"
                  className="study-tutor__chip tone-pill"
                  disabled={waiting}
                  onClick={() => {
                    ask(chip.prompt)
                    questionField.current?.focus()
                  }}
                >
                  <Lightbulb size={13} aria-hidden="true" /> {chip.label}
                </button>
              ))}
            </div>
            <label htmlFor="tutor-question">Tu consulta</label>
            <div className="study-tutor__entry">
              <textarea
                id="tutor-question"
                ref={questionField}
                rows={2}
                maxLength={600}
                value={question}
                onChange={(event) => setQuestion(event.target.value)}
                placeholder="Ej: ¿Cómo escalono una matriz por Gauss-Jordan?"
              />
              <button
                className="study-tutor__send"
                type="submit"
                disabled={!question.trim() || waiting}
                aria-label="Enviar pregunta"
              >
                <ArrowUp size={21} aria-hidden="true" />
              </button>
            </div>
            {storageError ? (
              <p role="status">El historial no se pudo guardar en este navegador.</p>
            ) : (
              <p>El historial se guarda en este navegador.</p>
            )}
          </form>
        </section>

        <aside className="study-tutor__topics" aria-labelledby="tutor-topics-heading">
          <h2 id="tutor-topics-heading">Temas por especialidad</h2>
          <ul>
            {tutorTopics.map(({ domain, title, reason, question: prompt, icon }) => {
              const Icon = topicIcons[icon]
              const isEnabled = activeDomains.has(domain)
              return (
                <li key={title}>
                  <button
                    type="button"
                    disabled={waiting}
                    onClick={() => {
                      ask(prompt)
                      questionField.current?.focus()
                    }}
                  >
                    <Icon size={19} aria-hidden="true" />
                    <span>
                      <strong>{title}</strong>
                      <small>{reason}</small>
                      <small className="study-tutor__topic-state">
                        {isEnabled ? 'Modelo activo' : 'Desactivado por admin'}
                      </small>
                    </span>
                    <ChevronRight size={16} aria-hidden="true" />
                  </button>
                </li>
              )
            })}
          </ul>
        </aside>
      </div>
    </section>
  )
}

export default function Tutor({ user }: { user: DemoUser }) {
  return <TutorConversation key={user.id} user={user} />
}
