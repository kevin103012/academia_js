import { Megaphone, Plus, X } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import type { DemoUser } from '../../types/auth'
import type { Commit, Notice, NoticeScope, Workspace } from '../../types/workspace'
import { canSeeCourse, visibleNotices } from '../../utils/campusAccess'
import { dateKey, formatDate } from '../../utils/date'
import { createId } from '../../utils/id'

interface NoticesViewProps {
  user: DemoUser
  workspace: Workspace
  commit: Commit
}

export function NoticesView({ user, workspace, commit }: NoticesViewProps) {
  const [adding, setAdding] = useState(false)
  const [scope, setScope] = useState<NoticeScope>('general')
  const canPublish = user.role !== 'student'
  const eligibleCourses = workspace.courses.filter((course) => canSeeCourse(user, workspace, course.id))
  const visible = visibleNotices(user, workspace)
    .sort((a, b) => Number(Boolean(b.isPinned)) - Number(Boolean(a.isPinned)) || b.date.localeCompare(a.date))

  function publish(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    const title = String(form.get('title') ?? '').trim()
    const content = String(form.get('content') ?? '').trim()
    const courseId = String(form.get('course') ?? '')
    if (!title || !content) return
    if (scope === 'course' && !eligibleCourses.some((course) => course.id === courseId)) return
    if (scope === 'system_persistent' && user.role !== 'admin') return
    const notice: Notice = {
      id: createId(), title, content, scope, author: user.name, authorId: user.id, date: dateKey(),
      courseId: scope === 'course' ? courseId : undefined,
      isPinned: scope === 'system_persistent',
    }
    commit(`Publicó el aviso «${title}»`, (current) => ({ ...current, notices: [notice, ...current.notices] }))
    setAdding(false)
  }

  return (
    <section>
      <header className="p-section-heading">
        <div>
          <h1>Avisos</h1>
          <p>Comunicados y novedades de tu espacio académico.</p>
        </div>
        {canPublish && (
          <button className="p-button p-button-primary" onClick={() => { setAdding(!adding); setScope('general') }}>
            {adding ? 'Cancelar' : 'Publicar aviso'}
            {adding ? <X size={17} /> : <Plus size={17} />}
          </button>
        )}
      </header>
      {adding && (
        <form className="p-card p-form" onSubmit={publish}>
          <h2>Redactar aviso</h2>
          <div className="p-form-workbench">
            <div className="p-form-col">
              <label htmlFor="notice-title">
                Título del aviso
                <input id="notice-title" name="title" maxLength={100} required placeholder="Ej. Cambio de horario de laboratorio" />
              </label>
              <label htmlFor="notice-scope">
                Tipo de comunicado
                <select id="notice-scope" value={scope} onChange={(event) => setScope(event.target.value as NoticeScope)}>
                  <option value="general">Aviso general</option>
                  {eligibleCourses.length > 0 && <option value="course">Aviso de curso</option>}
                  {user.role === 'admin' && <option value="system_persistent">Aviso del sistema fijado</option>}
                </select>
              </label>
              {scope === 'course' && <label>Curso
                <select name="course" required>
                  {eligibleCourses.map((course) => <option key={course.id} value={course.id}>{course.name}</option>)}
                </select>
              </label>}
              <div className="p-actions-row">
                <button className="p-button p-button-primary" type="submit">
                  Publicar ahora
                </button>
                <button className="p-button" type="button" onClick={() => setAdding(false)}>
                  Cancelar
                </button>
              </div>
            </div>
            <div className="p-form-col--stretch">
              <label className="p-form-label-grow" htmlFor="notice-content">
                Contenido del comunicado
                <textarea id="notice-content" name="content" rows={4} maxLength={2000} required />
              </label>
            </div>
          </div>
        </form>
      )}
      <div className="p-notice-groups">
        {[
          { title: 'Avisos de tus cursos', items: visible.filter((notice) => notice.scope === 'course') },
          { title: 'Avisos generales', items: visible.filter((notice) => notice.scope !== 'course') },
        ].map(({ title, items }) => <section key={title} className="p-notices" aria-label={title}>
          <h2>{title}</h2>
          {items.length === 0 && <p className="p-meta">No hay avisos en esta sección.</p>}
          {items.map((notice) => (
            <article key={notice.id}>
              <span className="p-kind-icon p-teal">
                <Megaphone size={20} />
              </span>
              <div>
                <h3>{notice.title}</h3>
                {notice.isPinned && <span className="p-badge tone-soft-accent">Fijado por administración</span>}
                {notice.courseId && <p className="p-meta">{workspace.courses.find((course) => course.id === notice.courseId)?.name}</p>}
                <p className="p-long-text">{notice.content}</p>
                <p className="p-meta">
                  {notice.author} · {formatDate(notice.date)}
                </p>
              </div>
            </article>
          ))}
        </section>)}
      </div>
    </section>
  )
}
