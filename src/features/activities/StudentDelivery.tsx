import { Check } from 'lucide-react'
import type { FormEvent } from 'react'
import type { DemoUser } from '../../types/auth'
import type { Activity, Commit, Submission, Workspace } from '../../types/workspace'
import { dateKey, formatDate } from '../../utils/date'
import { createId } from '../../utils/id'

export function submissionStatus(activity: Activity, submission?: Submission) {
  if (submission?.score !== undefined) return 'Calificada'
  if (submission) return 'Entregada'
  return activity.due < dateKey() ? 'Vencida' : 'Pendiente'
}

interface StudentDeliveryProps {
  user: DemoUser
  activity: Activity
  workspace: Workspace
  commit: Commit
}

/** Entrega propia del alumno y la retroalimentación recibida. */
export function StudentDelivery({ user, activity, workspace, commit }: StudentDeliveryProps) {
  const current = workspace.submissions.find(
    (item) => item.activityId === activity.id && item.studentId === user.id,
  )

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const content = String(new FormData(event.currentTarget).get('content') ?? '').trim()
    if (!content || current?.score !== undefined) return
    const submission: Submission = {
      id: current?.id ?? createId(),
      activityId: activity.id,
      studentId: user.id,
      content,
      submittedAt: dateKey(),
    }
    commit(`Entregó «${activity.title}»`, (workspaceNow) => ({
      ...workspaceNow,
      submissions: [...workspaceNow.submissions.filter((item) => item.id !== submission.id), submission],
    }))
  }

  if (current?.score !== undefined) {
    return (
      <div className="p-feedback">
        <span className="p-badge tone-soft-accent">
          <Check size={14} /> Calificada
        </span>
        <h3>{current.score}/20</h3>
        <p>{current.feedback}</p>
        <details>
          <summary>Ver mi entrega</summary>
          <p className="p-long-text">{current.content}</p>
        </details>
      </div>
    )
  }

  return (
    <form className="p-form p-form-plain" onSubmit={submit}>
      <label>
        Tu entrega
        <textarea
          name="content"
          rows={5}
          defaultValue={current?.content}
          required
          maxLength={5000}
          placeholder="Escribe tu respuesta o pega un enlace a tu trabajo."
        />
      </label>
      {current && (
        <p className="p-meta">
          <Check size={15} /> Guardada el {formatDate(current.submittedAt)}
        </p>
      )}
      <button type="submit" className="p-button p-button-primary">
        {current ? 'Actualizar entrega' : 'Entregar actividad'}
      </button>
    </form>
  )
}
