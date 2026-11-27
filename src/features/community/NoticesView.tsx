import { Megaphone, Plus, X } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import type { DemoUser } from '../../types/auth'
import type { Commit, Workspace } from '../../types/workspace'
import { dateKey, formatDate } from '../../utils/date'
import { createId } from '../../utils/id'

interface NoticesViewProps {
  user: DemoUser
  workspace: Workspace
  commit: Commit
}

export function NoticesView({ user, workspace, commit }: NoticesViewProps) {
  const [adding, setAdding] = useState(false)
  const canPublish = user.role !== 'student'

  function publish(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    const title = String(form.get('title') ?? '').trim()
    const content = String(form.get('content') ?? '').trim()
    if (!title || !content) return
    const notice = { id: createId(), title, content, author: user.name, date: dateKey() }
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
          <button className="p-button p-button-primary" onClick={() => setAdding(!adding)}>
            {adding ? 'Cancelar' : 'Publicar aviso'}
            {adding ? <X size={17} /> : <Plus size={17} />}
          </button>
        )}
      </header>
      {adding && (
        <form className="p-card p-form" onSubmit={publish}>
          <h2>Redactar aviso</h2>
          <label>
            Título
            <input name="title" maxLength={100} required />
          </label>
          <label>
            Contenido
            <textarea name="content" rows={5} maxLength={2000} required />
          </label>
          <button className="p-button p-button-primary" type="submit">
            Publicar ahora
          </button>
        </form>
      )}
      <div className="p-card p-notices">
        {workspace.notices.length ? (
          workspace.notices.map((notice) => (
            <article key={notice.id}>
              <span className="p-kind-icon p-teal">
                <Megaphone size={20} />
              </span>
              <div>
                <h2>{notice.title}</h2>
                <p className="p-long-text">{notice.content}</p>
                <p className="p-meta">
                  {notice.author} · {formatDate(notice.date)}
                </p>
              </div>
            </article>
          ))
        ) : (
          <div className="p-empty">
            <Megaphone size={25} />
            <p>Los nuevos avisos aparecerán aquí.</p>
          </div>
        )}
      </div>
    </section>
  )
}
