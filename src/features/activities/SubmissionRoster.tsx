import { UsersRound } from 'lucide-react'
import type { FormEvent } from 'react'
import type { Activity, Commit, Student, Submission, Workspace } from '../../types/workspace'
import { dateKey, formatDate } from '../../utils/date'

interface SubmissionRosterProps {
  activity: Activity
  roster: Student[]
  workspace: Workspace
  commit: Commit
  canGrade: boolean
}

/** Quién entregó la actividad y quién no, con la revisión de cada entrega. */
export function SubmissionRoster({ activity, roster, workspace, commit, canGrade }: SubmissionRosterProps) {
  const rows = roster.map((student) => ({
    student,
    submission: workspace.submissions.find(
      (item) => item.activityId === activity.id && item.studentId === student.id,
    ),
  }))
  const delivered = rows.flatMap(({ student, submission }) => (submission ? [{ student, submission }] : []))
  const missing = rows.filter((row) => !row.submission)
  const overdue = activity.due < dateKey()

  function grade(event: FormEvent<HTMLFormElement>, submission: Submission) {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    const score = Number(form.get('score'))
    const feedback = String(form.get('feedback') ?? '').trim()
    if (!canGrade || !Number.isFinite(score) || score < 0 || score > 20 || !feedback) return
    commit(`Calificó una entrega de «${activity.title}»`, (current) => ({
      ...current,
      submissions: current.submissions.map((item) => (item.id === submission.id ? { ...item, score, feedback } : item)),
    }))
  }

  if (!roster.length) {
    return (
      <div className="p-submissions p-empty">
        <UsersRound size={23} />
        <p>Este curso aún no tiene alumnos registrados.</p>
      </div>
    )
  }

  return (
    <section className="p-submissions" aria-label="Alumnos y entregas">
      <h3>
        Entregas: {delivered.length} de {roster.length}
      </h3>

      <h4>Entregaron ({delivered.length})</h4>
      {!delivered.length && <p className="p-meta">Nadie ha entregado todavía.</p>}
      {delivered.map(({ student, submission }) => (
        <details className="p-submission" key={submission.id}>
          <summary>
            <strong>{student.name}</strong>
            <span>{submission.score === undefined ? 'Por revisar' : `${submission.score}/20`}</span>
          </summary>
          <p className="p-meta">
            Entregada el {formatDate(submission.submittedAt)}
            {submission.submittedAt > activity.due && ' · fuera de plazo'}
          </p>
          <p className="p-long-text">{submission.content}</p>
          {canGrade ? (
            <form className="p-form p-form-plain" onSubmit={(event) => grade(event, submission)}>
              <label>
                Nota sobre 20
                <input name="score" type="number" min={0} max={20} step={0.5} required defaultValue={submission.score} />
              </label>
              <label>
                Retroalimentación
                <textarea rows={3} name="feedback" defaultValue={submission.feedback} required maxLength={1600} />
              </label>
              <button type="submit" className="p-button p-button-primary">
                Guardar calificación
              </button>
            </form>
          ) : (
            submission.feedback && <p>{submission.feedback}</p>
          )}
        </details>
      ))}

      <h4>No entregaron ({missing.length})</h4>
      {!missing.length && <p className="p-meta">Todos entregaron.</p>}
      {missing.map(({ student }) => (
        <div className="p-submission p-missing" key={student.id}>
          <strong>{student.name}</strong>
          <span className={`p-badge${overdue ? ' tone-danger' : ''}`}>{overdue ? 'Plazo vencido' : 'Aún en plazo'}</span>
        </div>
      ))}
    </section>
  )
}
