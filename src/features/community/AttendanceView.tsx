import { useState, type FormEvent } from 'react'
import type { DemoUser } from '../../types/auth'
import { attendanceStatuses, type AttendanceStatus, type Commit, type Workspace } from '../../types/workspace'
import { dateKey, formatDate } from '../../utils/date'
import { initials } from '../../utils/text'

interface AttendanceViewProps {
  user: DemoUser
  workspace: Workspace
  commit: Commit
}

export function AttendanceView({ user, workspace, commit }: AttendanceViewProps) {
  const [day, setDay] = useState(() => dateKey())
  const [draft, setDraft] = useState<Record<string, AttendanceStatus>>({})
  const editable = user.role === 'teacher' || user.role === 'admin'
  const readStatus = (studentId: string) =>
    draft[studentId] ?? workspace.attendance.find((record) => record.studentId === studentId && record.date === day)?.status

  function save(event: FormEvent) {
    event.preventDefault()
    const updates = Object.entries(draft).map(([studentId, status]) => ({ studentId, date: day, status }))
    if (!updates.length) return
    commit(`Registró la asistencia del ${formatDate(day)}`, (current) => ({
      ...current,
      attendance: [
        ...current.attendance.filter((record) => record.date !== day || !(record.studentId in draft)),
        ...updates,
      ],
    }))
    setDraft({})
  }

  return (
    <section>
      <header className="p-section-heading">
        <div>
          <h1>Asistencia</h1>
          <p>Registro diario de los estudiantes del aula.</p>
        </div>
        <div className="p-heading-actions">
          <label className="p-heading-control">
            <span>Fecha</span>
            <input
              type="date"
              aria-label="Fecha de asistencia"
              value={day}
              onChange={(event) => {
                if (event.target.value) {
                  setDay(event.target.value)
                  setDraft({})
                }
              }}
            />
          </label>
        </div>
      </header>
      <form className="p-card p-roster" onSubmit={save}>
        {workspace.students.map((student) => (
          <div className="p-person" key={student.id}>
            <span className="p-avatar">{initials(student.name)}</span>
            <div className="p-list-copy">
              <strong>{student.name}</strong>
              <small>{student.group}</small>
            </div>
            {editable ? (
              <select
                aria-label={`Asistencia de ${student.name}`}
                value={readStatus(student.id) ?? ''}
                onChange={(event) => setDraft({ ...draft, [student.id]: event.target.value as AttendanceStatus })}
              >
                <option disabled value="">
                  Sin registrar
                </option>
                {attendanceStatuses.map((status) => (
                  <option key={status}>{status}</option>
                ))}
              </select>
            ) : (
              <span className="p-badge">{readStatus(student.id) ?? 'Sin registrar'}</span>
            )}
          </div>
        ))}
        {editable && (
          <div className="p-roster-actions">
            <button className="p-button p-button-primary" type="submit" disabled={!Object.keys(draft).length}>
              Guardar asistencia
            </button>
          </div>
        )}
      </form>
    </section>
  )
}
