import { ArrowRight, Bell, CalendarDays, Clock3, MapPin, MessageSquare, Plus, Users } from 'lucide-react'
import { useEffect, useRef, useState, type FormEvent, type ReactNode } from 'react'
import type { Action, CalendarItem, ModuleProps, Person, Thread } from '../contract'
import { courseCategories } from '../../../../types/workspace'
import { dateKey, formatDate, readDate } from '../../../../utils/date'
import { audienceMembers, courseChoices, eligibleParticipants, incidentState, instructorContact, publicProfile, upcomingEvents, type Audience } from './model'
import './community.css'

type Copy = (spanish: string, english: string) => string
type PaneProps = ModuleProps & { t: Copy }
const field = (form: FormData, name: string) => String(form.get(name) ?? '').trim()
const primary = 'p-button p-button-primary tone-accent'
const secondary = 'p-button'
const time = (value: string) => value.slice(0, 5)
const byName = (a: Person, b: Person) => a.full_name.localeCompare(b.full_name)
const kind = (role: string, t: Copy) => role === 'teacher' ? t('Instructor', 'Instructor') : t('Estudiante', 'Student')

function dateLabel(value: string, t: Copy) {
  if (!value) return t('Sin fecha', 'No date')
  const options: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short', year: 'numeric' }
  return t('es', 'en') === 'es' ? formatDate(value.slice(0, 10), options) :
    new Intl.DateTimeFormat('en', options).format(readDate(value.slice(0, 10)))
}

function useCommand(run: ModuleProps['run'], t: Copy) {
  const [pending, setPending] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  async function send(action: Action, payload: Record<string, unknown>, done: string) {
    if (pending) return false
    setError('')
    setSuccess('')
    setPending(true)
    try {
      await run(action, payload)
      setSuccess(done)
      return true
    } catch {
      setError(t('No se guardó el cambio. Revisa los campos e inténtalo de nuevo.', 'The change was not saved. Check the fields and try again.'))
      return false
    } finally {
      setPending(false)
    }
  }
  return { send, pending, setError: (message: string) => { setSuccess(''); setError(message) },
    feedback: <>{pending && <p role="status" className="ic-muted">{t('Guardando…', 'Saving…')}</p>}
      {error && <p role="alert" className="ic-error">{error}</p>}
      {success && <p role="status" className="ic-success">{success}</p>}</> }
}

function Header({ title, description, action }: { title: string; description: string; action?: ReactNode }) {
  return <header className="p-section-heading"><div><h1>{title}</h1><p>{description}</p></div>{action}</header>
}

function Empty({ children }: { children: ReactNode }) {
  return <p className="ic-empty">{children}</p>
}

function AddButton({ open, toggle, children, t }: { open: boolean; toggle: () => void; children: ReactNode; t: Copy }) {
  return <button type="button" className={open ? secondary : primary} aria-expanded={open} onClick={toggle}>
    {!open && <Plus size={17} aria-hidden />}{open ? t('Cerrar formulario', 'Close form') : children}
  </button>
}

function Messages({ data, run, t }: PaneProps) {
  const command = useCommand(run, t)
  const [creating, setCreating] = useState(false)
  const [selected, setSelected] = useState('')
  const [courseId, setCourseId] = useState('')
  const [draftSubject, setDraftSubject] = useState('')
  const [contactOnly, setContactOnly] = useState(false)
  const [reply, setReply] = useState('')
  const subjectField = useRef<HTMLInputElement>(null)
  useEffect(() => {
    if (creating && contactOnly) subjectField.current?.focus()
  }, [creating, contactOnly, courseId])
  const lookup = (id: string | null) => data.people.find((person) => person.id === id)
  const course = data.courses.find(({ id }) => id === courseId)
  const instructor = lookup(course?.teacher_id ?? null)
  const last = new Map<string, string>()
  for (const message of data.messages) {
    if ((last.get(message.thread_id) ?? '') < message.sent_at) last.set(message.thread_id, message.sent_at)
  }
  const threads = [...data.threads].sort((a, b) => (last.get(b.id) ?? '').localeCompare(last.get(a.id) ?? ''))
  const active = threads.find(({ id }) => id === selected) ?? threads[0]
  const activeCourse = data.courses.find(({ id }) => id === active?.course_id)
  const activeInstructor = lookup(activeCourse?.teacher_id ?? null)
  const contact = instructorContact(active, activeInstructor)
  const history = data.messages.filter(({ thread_id }) => thread_id === active?.id)
    .sort((a, b) => a.sent_at.localeCompare(b.sent_at) || a.id - b.id)
  const status = (thread: Thread) => ({
    reported: t('Reportado · sin verificar', 'Reported · unverified'),
    verifying: t('En verificación', 'Under review'),
    resolved: t('Cerrado', 'Closed'),
    inquiry: t('Consulta', 'Inquiry'),
  })[incidentState(thread)]

  async function compose(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    const subject = field(form, 'subject')
    const content = field(form, 'content')
    if (!course || instructor?.role !== 'teacher' || !subject || !content) {
      command.setError(t('Selecciona un curso con instructor e indica el asunto y el mensaje.', 'Select a course with an instructor and enter a subject and message.'))
      return
    }
    if (await command.send('thread.create', { course_id: course.id, recipient_id: instructor.id, subject, content,
      thread_kind: contactOnly ? 'course_inquiry' : field(form, 'kind') }, t('Conversación iniciada.', 'Conversation started.'))) {
      setCreating(false)
      setDraftSubject('')
      setContactOnly(false)
      setSelected('')
      setReply('')
    }
  }

  function contactInstructor() {
    if (!activeCourse) return
    setCourseId(activeCourse.id)
    setDraftSubject(t('Consulta para verificar un reporte de clase', 'Inquiry to review a class report'))
    setContactOnly(true)
    setCreating(true)
  }

  async function replyToThread(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!active || !reply.trim()) return
    if (await command.send('thread.reply', { thread_id: active.id, content: reply.trim() },
      t('Respuesta guardada en el historial.', 'Reply saved in the conversation.'))) setReply('')
  }

  return <section className="ic">
    <Header title={t('Mensajería', 'Messaging')} description={t('Verifica reportes con el instructor y deja el resultado en la conversación.',
      'Check reports with the instructor and record the outcome in the conversation.')}
      action={<AddButton open={creating} toggle={() => {
        setCreating(!creating); setContactOnly(false); setDraftSubject('')
      }} t={t}>{t('Nueva conversación', 'New conversation')}</AddButton>} />
    {command.feedback}
    {creating && <form key={contactOnly ? courseId : 'new'} className="p-card p-form ic-form" onSubmit={compose}>
      <h2>{t('Contactar a un instructor', 'Contact an instructor')}</h2>
      <div className="ic-fields">
        <label>{t('Curso', 'Course')}<select required disabled={contactOnly} value={courseId} onChange={(e) => setCourseId(e.target.value)}>
          <option value="">{t('Selecciona un curso', 'Select a course')}</option>
          {data.courses.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
        </select></label>
        {!contactOnly && <label>{t('Tipo de conversación', 'Conversation type')}<select name="kind">
          <option value="course_inquiry">{t('Consulta de curso', 'Course inquiry')}</option>
          <option value="incident_report">{t('Reporte de incidencia', 'Incident report')}</option>
        </select></label>}
      </div>
      {course && <p className="ic-muted">{instructor?.role === 'teacher' ? `${t('Para', 'To')}: ${instructor.full_name}` :
        t('Este curso no tiene un instructor disponible para mensajería.', 'This course has no instructor available for messaging.')}</p>}
      {contactOnly && <p className="ic-note">{t('Esta consulta es independiente del reporte. Incluye solo lo necesario para verificarlo.',
        'This inquiry is separate from the report. Include only what the instructor needs to review it.')}</p>}
      <label>{t('Asunto', 'Subject')}<input ref={subjectField} name="subject" value={draftSubject} onChange={(e) => setDraftSubject(e.target.value)} required maxLength={150} /></label>
      <label>{t('Mensaje', 'Message')}<textarea name="content" rows={3} required maxLength={2000} /></label>
      <button className={primary} disabled={command.pending || instructor?.role !== 'teacher'}>{t('Enviar al instructor', 'Send to instructor')}</button>
    </form>}
    {!threads.length ? <Empty>{t('Aún no hay conversaciones. Inicia una consulta o registra un reporte de un curso.',
      'There are no conversations yet. Start an inquiry or record a course incident report.')}</Empty> :
      <div className="ic-inbox">
        <section className="p-card ic-panel" aria-label={t('Conversaciones', 'Conversations')}>
          <h2>{t('Conversaciones', 'Conversations')}</h2>
          <ul className="ic-threads">{threads.map((thread) => <li key={thread.id}>
            <button type="button" aria-pressed={active?.id === thread.id} onClick={() => { setSelected(thread.id); setReply('') }}>
              <MessageSquare size={17} aria-hidden /><span><strong>{thread.subject}</strong><span>{status(thread)}</span></span>
            </button>
          </li>)}</ul>
        </section>
        {active && <section className="p-card ic-panel ic-conversation" aria-label={active.subject}>
          <div className="ic-row">
            <h2>{active.subject}</h2>
            <span className={incidentState(active) === 'verifying' ? 'p-badge tone-soft-accent' : 'p-badge'}>{status(active)}</span>
          </div>
          <p className="ic-muted">{activeCourse?.name ?? t('Sin curso asociado', 'No linked course')}
            {activeInstructor?.role === 'teacher' && <> · {t('Instructor', 'Instructor')}: {activeInstructor.full_name}</>}</p>
          {incidentState(active) === 'reported' && <p className="ic-note">{t('El reporte no confirma lo ocurrido. Solicita la versión del instructor antes de cerrar el caso.',
            'This report does not establish what happened. Ask the instructor for their account before closing it.')}</p>}
          {history.length ? <ol className="ic-history">{history.map((message) => <li key={message.id}>
            <div className="ic-row"><strong>{message.sender_id === data.me.id ? t('Tú', 'You') : message.sender_name}</strong>
              <time dateTime={message.sent_at}>{dateLabel(message.sent_at, t)}</time></div>
            <p className="p-long-text">{message.content}</p>
          </li>)}</ol> : <Empty>{t('No hay mensajes en esta conversación.', 'There are no messages in this conversation.')}</Empty>}
          <form className="p-form p-form-plain" onSubmit={replyToThread}>
            <label>{incidentState(active) === 'verifying' ? t('Respuesta o resultado de la verificación', 'Reply or outcome of the review') : t('Respuesta', 'Reply')}
              <textarea value={reply} onChange={(e) => setReply(e.target.value)} rows={3} required maxLength={2000} /></label>
            {contact === 'separate_inquiry' && ['reported', 'verifying'].includes(incidentState(active)) &&
              <p className="ic-muted">{t('El instructor no está en esta conversación. Usa «Contactar al instructor» para pedirle su versión.',
                'The instructor is not in this conversation. Use “Contact instructor” to ask for their account.')}</p>}
            <button className={primary} disabled={command.pending || !reply.trim()}>{t('Enviar respuesta', 'Send reply')}</button>
          </form>
          {(incidentState(active) === 'reported' || incidentState(active) === 'verifying') && <div className="ic-actions">
            {contact === 'unavailable' && <p className="ic-muted">{t('El curso no tiene un instructor disponible para verificar este reporte.',
              'This course has no instructor available to review this report.')}</p>}
            {contact === 'separate_inquiry' && <button type="button" className={secondary}
              disabled={command.pending} onClick={contactInstructor}>{t('Contactar al instructor', 'Contact instructor')}</button>}
            {incidentState(active) === 'reported' ? <button type="button" className={secondary} disabled={command.pending || contact === 'unavailable'}
              onClick={() => void command.send('thread.status', { thread_id: active.id, incident_status: 'verifying_with_instructor' },
                t('Reporte en verificación.', 'Report under review.'))}>{t('Iniciar verificación', 'Start review')}</button> :
              <button type="button" className={secondary} disabled={command.pending}
                onClick={() => void command.send('thread.status', { thread_id: active.id, incident_status: 'resolved' },
                  t('Caso cerrado. El historial sigue disponible.', 'Case closed. The conversation remains available.'))}>
                {t('Cerrar caso', 'Close case')}</button>}
          </div>}
        </section>}
      </div>}
  </section>
}

const englishCategories: Record<string, string> = {
  matematica: 'Math and Data Science', hardware: 'Hardware and Embedded Systems',
  frameworks: 'Frameworks and Architecture', algoritmos: 'Algorithms and Languages',
}

function Groups({ data, run, t }: PaneProps) {
  const command = useCommand(run, t)
  const [creating, setCreating] = useState(false)
  const [category, setCategory] = useState('')
  const [periodId, setPeriodId] = useState('')
  const [block, setBlock] = useState('')
  const [courseId, setCourseId] = useState('')
  const [teacherId, setTeacherId] = useState('')
  const categories = [...new Set([...courseCategories.map(({ id }) => id), ...data.courses.map((course) => course.category).filter(Boolean)])]
  const blocks = [...new Set(data.courses.map(({ academic_block }) => academic_block).filter(Boolean))].sort()
  const courses = courseChoices(data.courses, category, periodId, block)
  const teachers = eligibleParticipants(data).filter(({ role }) => role === 'teacher').sort(byName)
  const categoryLabel = (id: string) => t(courseCategories.find((item) => item.id === id)?.label ?? id, englishCategories[id] ?? id)
  const clearCourse = () => { setCourseId(''); setTeacherId('') }

  async function create(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const name = field(new FormData(event.currentTarget), 'name')
    const course = courses.find(({ id }) => id === courseId)
    if (!name || !category || !periodId || !block || !course || !teachers.some(({ id }) => id === teacherId)) {
      command.setError(t('Selecciona una categoría, un periodo, un bloque, un curso y un instructor válidos.',
        'Select a valid category, period, block, course, and instructor.'))
      return
    }
    if (await command.send('group.create', { name, category, academic_block: block, period_id: periodId, course_id: course.id,
      assigned_teacher_id: teacherId }, t('Grupo creado.', 'Group created.'))) {
      setCreating(false); setCategory(''); setPeriodId(''); setBlock(''); clearCourse()
    }
  }

  return <section className="ic">
    <Header title={t('Comunidad', 'Community')} description={t('Organiza los grupos de tu institución por curso, bloque y periodo.',
      'Organize groups in your institution by course, block, and period.')}
      action={<AddButton open={creating} toggle={() => setCreating(!creating)} t={t}>{t('Crear grupo', 'Create group')}</AddButton>} />
    {command.feedback}
    {creating && <form className="p-card p-form ic-form" onSubmit={create}>
      <h2>{t('Nuevo grupo', 'New group')}</h2>
      <label>{t('Nombre del grupo', 'Group name')}<input name="name" required maxLength={120} /></label>
      <div className="ic-fields">
        <label>{t('Categoría', 'Category')}<select required value={category} onChange={(e) => { setCategory(e.target.value); clearCourse() }}>
          <option value="">{t('Selecciona una categoría', 'Select a category')}</option>
          {categories.map((id) => <option key={id} value={id}>{categoryLabel(id)}</option>)}
        </select></label>
        <label>{t('Periodo', 'Period')}<select required value={periodId} onChange={(e) => { setPeriodId(e.target.value); clearCourse() }}>
          <option value="">{t('Selecciona un periodo', 'Select a period')}</option>
          {data.periods.map((period) => <option key={period.id} value={period.id}>{period.name}</option>)}
        </select></label>
        <label>{t('Bloque', 'Block')}<select required value={block} onChange={(e) => { setBlock(e.target.value); clearCourse() }}>
          <option value="">{t('Selecciona un bloque', 'Select a block')}</option>
          {blocks.map((item) => <option key={item}>{item}</option>)}
        </select></label>
        <label>{t('Curso', 'Course')}<select required disabled={!category || !block || !periodId || !courses.length}
          value={courseId} onChange={(e) => {
            const next = courses.find(({ id }) => id === e.target.value)
            setCourseId(e.target.value); setTeacherId(teachers.find(({ id }) => id === next?.teacher_id)?.id ?? '')
          }}>
          <option value="">{t('Selecciona un curso', 'Select a course')}</option>
          {courses.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
        </select></label>
      </div>
      {category && block && periodId && !courses.length && <p className="ic-muted">{t('No hay cursos que coincidan con esta combinación.',
        'No courses match this combination.')}</p>}
      <label>{t('Instructor asignado', 'Assigned instructor')}<select required value={teacherId} onChange={(e) => setTeacherId(e.target.value)}>
        <option value="">{t('Selecciona un instructor', 'Select an instructor')}</option>
        {teachers.map((person) => <option key={person.id} value={person.id}>{person.full_name}</option>)}
      </select></label>
      <button className={primary} disabled={command.pending || !courseId || !teacherId}>{t('Guardar grupo', 'Save group')}</button>
    </form>}
    {!data.groups.length ? <Empty>{t('Aún no hay grupos. Crea uno a partir de un curso de tu institución.',
      'There are no groups yet. Create one from a course in your institution.')}</Empty> : <ul className="p-card ic-list">
      {data.groups.map((group) => <li className="ic-list-row" key={group.id}>
        <Users size={20} aria-hidden /><div><h2>{group.name}</h2>
          <p>{[categoryLabel(group.category), data.courses.find(({ id }) => id === group.course_id)?.name, group.academic_block,
            data.periods.find(({ id }) => id === group.period_id)?.name].filter(Boolean).join(' · ')}</p></div>
        <span>{teachers.find(({ id }) => id === group.assigned_teacher_id)?.full_name ?? t('Sin instructor', 'No instructor')}</span>
      </li>)}
    </ul>}
  </section>
}

function eventScope(scope: string, t: Copy) {
  const labels: Record<string, string> = {
    personal: t('Solo yo', 'Only me'), course: t('Curso', 'Course'), block: t('Bloque', 'Block'),
    role: t('Rol', 'Role'), individual: t('Personas específicas', 'Selected people'),
  }
  return labels[scope] ?? t('Evento', 'Event')
}

function EventRow({ event, t, audience, action }: { event: CalendarItem; t: Copy; audience?: string; action?: ReactNode }) {
  const hours = [time(event.start_time), time(event.end_time)].filter(Boolean).join('–')
  return <li className="ic-list-row">
    <div className="ic-date"><CalendarDays size={17} aria-hidden /><time dateTime={event.event_date}>{dateLabel(event.event_date, t)}</time></div>
    <div><h2>{event.title}</h2><p className="ic-meta">{hours && <span><Clock3 size={13} aria-hidden />
      {hours}</span>}{event.location && <span><MapPin size={13} aria-hidden />{event.location}</span>}</p></div>
    {action ?? <span className="p-badge">{audience || eventScope(event.visibility_scope, t)}</span>}
  </li>
}

function Calendar({ data, run, t }: PaneProps) {
  const command = useCommand(run, t)
  const [editing, setEditing] = useState(false)
  const [dateFilter, setDateFilter] = useState('')
  const [audience, setAudience] = useState<Audience>({ scope: 'personal' })
  const people = eligibleParticipants(data).sort(byName)
  const members = audienceMembers(data, audience).sort(byName)
  const blocks = [...new Set(people.map(({ academic_block }) => academic_block).filter(Boolean))].sort()
  const scopeOptions: Audience[] = [{ scope: 'personal' }, { scope: 'course', courseId: '' }, { scope: 'block', block: '' },
    { scope: 'role', role: '' }, { scope: 'individual', ids: [] }]
  const events = [...data.events].filter((event) => !dateFilter || event.event_date === dateFilter)
    .sort((a, b) => a.event_date.localeCompare(b.event_date) || a.start_time.localeCompare(b.start_time))
  const audienceLabel = (event: CalendarItem) => {
    if (event.visibility_scope === 'course') return data.courses.find(({ id }) => id === event.target_course_id)?.name
    if (event.visibility_scope === 'block') return `${t('Bloque', 'Block')}: ${event.target_block}`
    if (event.visibility_scope === 'role') return event.target_role === 'teacher' ? t('Instructores', 'Instructors') : t('Estudiantes', 'Students')
    if (event.visibility_scope === 'individual' && event.recipient_ids?.length) {
      return `${eventScope('individual', t)} · ${event.recipient_ids.length}`
    }
  }

  async function create(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    const title = field(form, 'title'), start = field(form, 'start'), end = field(form, 'end'), date = field(form, 'date')
    if (!title || !date || !start || !end || end <= start) {
      command.setError(t('Indica un título, una fecha y una hora de fin posterior a la de inicio.',
        'Enter a title and date, with an end time later than the start time.'))
      return
    }
    if (audience.scope !== 'personal' && !members.length) {
      command.setError(t('Selecciona un público con al menos un destinatario.', 'Select an audience with at least one recipient.'))
      return
    }
    if (audience.scope === 'individual' && members.length > 100) {
      command.setError(t('Selecciona hasta 100 destinatarios, o elige un curso, bloque o rol.', 'Select up to 100 recipients, or choose a course, block, or role.'))
      return
    }
    const target = audience.scope === 'course' ? { target_course_id: audience.courseId } :
      audience.scope === 'block' ? { target_block: audience.block } : audience.scope === 'role' ? { target_role: audience.role } :
      audience.scope === 'individual' ? { recipient_ids: members.map(({ id }) => id) } : {}
    if (await command.send('event.create', { title, event_date: date, start_time: start, end_time: end, location: field(form, 'location'),
      visibility_scope: audience.scope, ...target }, t('Evento agregado al calendario.', 'Event added to the calendar.'))) {
      setEditing(false); setDateFilter(date); setAudience({ scope: 'personal' })
    }
  }

  return <section className="ic">
    <Header title={t('Calendario', 'Calendar')} description={t('Agenda actividades personales o decide quién recibirá una cita.',
      'Schedule personal activities or choose who should receive an invitation.')}
      action={<AddButton open={editing} toggle={() => setEditing(!editing)} t={t}>{t('Nuevo evento', 'New event')}</AddButton>} />
    {command.feedback}
    {editing && <form className="p-card p-form ic-form" onSubmit={create}>
      <h2>{t('Programar evento', 'Schedule event')}</h2>
      <label>{t('Título', 'Title')}<input name="title" required maxLength={120} /></label>
      <div className="ic-fields">
        <label>{t('Fecha', 'Date')}<input type="date" name="date" defaultValue={dateFilter || dateKey()} required /></label>
        <label>{t('Lugar o enlace', 'Location or link')}<input name="location" maxLength={200} /></label>
        <label>{t('Hora de inicio', 'Start time')}<input type="time" name="start" required /></label>
        <label>{t('Hora de fin', 'End time')}<input type="time" name="end" required /></label>
      </div>
      <label>{t('Quién podrá verlo', 'Who can see it')}<select value={audience.scope} onChange={(e) =>
        setAudience(scopeOptions.find((option) => option.scope === e.target.value) ?? scopeOptions[0])}>
        {scopeOptions.map(({ scope }) => <option key={scope} value={scope}>{eventScope(scope, t)}</option>)}
      </select></label>
      {audience.scope === 'course' && <label>{t('Curso', 'Course')}<select required value={audience.courseId}
        onChange={(e) => setAudience({ scope: 'course', courseId: e.target.value })}>
        <option value="">{t('Selecciona un curso', 'Select a course')}</option>
        {data.courses.map(({ id, name }) => <option key={id} value={id}>{name}</option>)}
      </select></label>}
      {audience.scope === 'block' && <label>{t('Bloque', 'Block')}<select required value={audience.block}
        onChange={(e) => setAudience({ scope: 'block', block: e.target.value })}>
        <option value="">{t('Selecciona un bloque', 'Select a block')}</option>
        {blocks.map((block) => <option key={block}>{block}</option>)}
      </select></label>}
      {audience.scope === 'role' && <label>{t('Rol', 'Role')}<select required value={audience.role}
        onChange={(e) => setAudience({ scope: 'role', role: e.target.value })}>
        <option value="">{t('Selecciona un rol', 'Select a role')}</option>
        <option value="teacher">{t('Instructores', 'Instructors')}</option>
        <option value="student">{t('Estudiantes', 'Students')}</option>
      </select></label>}
      {audience.scope === 'individual' && <fieldset className="ic-people">
        <legend>{t('Selecciona destinatarios', 'Select recipients')}</legend>
        {people.length ? people.map((person) => <label key={person.id}><input type="checkbox" checked={audience.ids.includes(person.id)}
          disabled={audience.ids.length >= 100 && !audience.ids.includes(person.id)}
          onChange={(e) => setAudience({ scope: 'individual', ids: e.target.checked ?
            [...audience.ids, person.id] : audience.ids.filter((id) => id !== person.id) })} />
          {person.full_name} <span>({kind(person.role, t)})</span></label>) :
          <p>{t('No hay destinatarios disponibles.', 'No recipients are available.')}</p>}
      </fieldset>}
      {audience.scope === 'personal' ? <p className="ic-note">{t('Solo tú podrás ver este evento.', 'Only you can see this event.')}</p> :
        <details className="ic-note"><summary>{t('Vista previa del público', 'Audience preview')} · {members.length}</summary>
          {members.length ? <ul>{members.map((person) => <li key={person.id}>{person.full_name} ({kind(person.role, t)})</li>)}</ul> :
            <p>{t('Nadie coincide con la selección actual.', 'No one matches your current selection.')}</p>}
        </details>}
      <button className={primary} disabled={command.pending || (audience.scope !== 'personal' && !members.length)}>
        {audience.scope === 'personal' ? t('Guardar evento personal', 'Save personal event') : t('Guardar e invitar', 'Save and invite')}</button>
    </form>}
    <div className="ic-filter p-toolbar">
      <label>{t('Filtrar por fecha', 'Filter by date')}<input type="date" value={dateFilter} onChange={(e) => setDateFilter(e.target.value)} /></label>
      {dateFilter && <button className={secondary} onClick={() => setDateFilter('')}>{t('Ver todas las fechas', 'View all dates')}</button>}
    </div>
    {events.length ? <ul className="p-card ic-list">{events.map((event) => <EventRow key={event.id} event={event} t={t} audience={audienceLabel(event)} />)}</ul> :
      <Empty>{dateFilter ? t('No hay eventos para esta fecha.', 'There are no events on this date.') :
        t('No hay eventos. Programa una actividad o una cita.', 'There are no events. Schedule an activity or an invitation.')}</Empty>}
  </section>
}

function Notices({ data, go, t }: PaneProps) {
  const now = new Date()
  const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`
  const events = upcomingEvents(data.events, dateKey(now), currentTime)
  const notices = [...data.notices].sort((a, b) => b.published_date.localeCompare(a.published_date))
  const pending = data.threads.filter((thread) => ['reported', 'verifying'].includes(incidentState(thread)))
  return <section className="ic">
    <Header title={t('Avisos', 'Notices')} description={t('Revisa las próximas citas y los reportes que necesitan seguimiento.',
      'Review upcoming events and reports that still need attention.')} />
    {!!pending.length && <div className="p-card ic-panel ic-reminder">
      <MessageSquare size={20} aria-hidden />
      <div><h2>{t('Reportes por verificar', 'Reports to review')}</h2><p>{t('Casos abiertos o en verificación', 'Open or under review')}: {pending.length}</p></div>
      <button className={secondary} onClick={() => go('messages')}>{t('Ir a mensajería', 'Open messaging')} <ArrowRight size={15} aria-hidden /></button>
    </div>}
    <h2 className="ic-section-title">{t('Próximos eventos', 'Upcoming events')}</h2>
    {events.length ? <ul className="p-card ic-list">{events.map((event) => <EventRow key={event.id} event={event} t={t}
      action={<button className={secondary} onClick={() => go('calendar')}>{t('Ver calendario', 'Open calendar')}</button>} />)}</ul> :
      <Empty>{t('No hay eventos pendientes. Las citas aparecerán aquí al programarlas.', 'No events are due. Scheduled invitations will appear here.')}</Empty>}
    <h2 className="ic-section-title">{t('Anuncios institucionales', 'Institutional announcements')}</h2>
    {notices.length ? <ul className="p-card ic-list">{notices.map((notice) => <li key={notice.id} className="ic-list-row">
      <Bell size={19} aria-hidden /><div><h2>{notice.title}</h2><p className="p-long-text">{notice.content}</p></div>
      <time dateTime={notice.published_date}>{dateLabel(notice.published_date, t)}</time>
    </li>)}</ul> : <Empty>{t('No hay anuncios publicados.', 'No announcements have been published.')}</Empty>}
  </section>
}

function Settings({ data: { me }, run, t }: PaneProps) {
  const command = useCommand(run, t)
  const [name, setName] = useState(me.full_name)
  const [bio, setBio] = useState(me.bio ?? '')
  const [visible, setVisible] = useState(me.is_profile_public ?? false)
  const preview = publicProfile({ full_name: name, bio, is_profile_public: visible })
  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    if (!name.trim()) {
      command.setError(t('Escribe tu nombre profesional.', 'Enter your professional name.'))
      return
    }
    await command.send('profile.update', { full_name: name.trim(), bio: bio.trim(), is_profile_public: visible,
      preferred_language: field(form, 'language'), preferred_theme: field(form, 'theme') },
      field(form, 'language') === 'en' ? 'Settings saved.' : 'Configuración guardada.')
  }

  return <section className="ic">
    <Header title={t('Configuración', 'Settings')} description={t('Edita tu perfil profesional y personaliza el campus.',
      'Edit your professional profile and personalize your campus.')} />
    {command.feedback}
    <div className="ic-settings">
      <form className="p-card p-form ic-form" onSubmit={save}>
        <h2>{t('Perfil profesional', 'Professional profile')}</h2>
        <label>{t('Nombre visible', 'Display name')}<input value={name} onChange={(e) => setName(e.target.value)} required maxLength={120} /></label>
        <label>{t('Presentación profesional', 'Professional bio')}<textarea value={bio} onChange={(e) => setBio(e.target.value)} rows={4} maxLength={600} /></label>
        <p className="ic-muted">{t('No incluyas datos de contacto privados en tu presentación.', 'Do not include private contact details in your bio.')}</p>
        <div className="ic-checkbox"><label><input type="checkbox" checked={visible} onChange={(e) => setVisible(e.target.checked)} />
          {t('Mostrar mi perfil a mi institución', 'Show my profile to my institution')}</label></div>
        <h2>{t('Preferencias del campus', 'Campus preferences')}</h2>
        <div className="ic-fields">
          <label>{t('Idioma', 'Language')}<select name="language" defaultValue={me.preferred_language === 'en' ? 'en' : 'es'}>
            <option value="es">Español</option><option value="en">English</option>
          </select></label>
          <label>{t('Apariencia', 'Appearance')}<select name="theme" defaultValue={me.preferred_theme || 'original'}>
            <option value="original">Original</option><option value="light">{t('Clara', 'Light')}</option><option value="dark">{t('Oscura', 'Dark')}</option>
          </select></label>
        </div>
        <button className={primary} disabled={command.pending}>{t('Guardar cambios', 'Save changes')}</button>
      </form>
      <aside className="p-card ic-panel ic-profile">
        <h2>{t('Vista previa del perfil', 'Profile preview')}</h2>
        {preview ? <><strong>{preview.full_name || t('Tu nombre', 'Your name')}</strong>
          <p>{t('Coordinación', 'Academic coordination')}</p>
          {preview.bio && <p className="p-long-text">{preview.bio}</p>}
          <p className="ic-muted">{t('La institución solo verá tu nombre, rol y presentación.', 'Your institution will only see your name, role, and bio.')}</p>
        </> : <p className="ic-muted">{t('Tu perfil está oculto para el resto de tu institución.', 'Your profile is hidden from the rest of your institution.')}</p>}
      </aside>
    </div>
  </section>
}

export function CommunityModule(props: ModuleProps) {
  const t: Copy = (spanish, english) => props.data.me.preferred_language === 'en' ? english : spanish
  const panes = { messages: Messages, groups: Groups, calendar: Calendar, notices: Notices, settings: Settings }
  const Pane = props.page in panes ? panes[props.page as keyof typeof panes] : null
  return Pane ? <Pane {...props} t={t} /> : null
}
