import { CalendarDays, CheckCircle2, ClipboardCheck, UsersRound } from 'lucide-react'
import { useState } from 'react'
import type { DemoUser } from '../../types/auth'
import { attendanceStatuses, type AttendanceStatus, type Commit, type Course, type Workspace } from '../../types/workspace'
import { dateKey, formatDate } from '../../utils/date'
import { initials } from '../../utils/text'
import { courseRoster, teachesCourse } from '../../utils/campusAccess'

interface CourseAttendancePanelProps {
  course: Course
  user: DemoUser
  workspace: Workspace
  commit: Commit
  notify: (message: string) => void
}

export function CourseAttendancePanel({
  course,
  user,
  workspace,
  commit,
  notify,
}: CourseAttendancePanelProps) {
  const [selectedDate, setSelectedDate] = useState(dateKey())
  const canEdit = user.role === 'admin' || teachesCourse(user, course)
  const isStudent = user.role === 'student'
  const roster = courseRoster(workspace, course)

  const effectiveRecords = workspace.attendance.filter((a) => a.courseId === course.id)

  const attendedCount = effectiveRecords.filter((a) => a.status === 'Presente' || a.status === 'Justificada').length
  const courseAverage = effectiveRecords.length ? Math.round((attendedCount / effectiveRecords.length) * 100) + '%' : 'Sin datos'

  function setStatus(studentId: string, studentName: string, status: AttendanceStatus) {
    if (!canEdit) return
    commit(`Registró asistencia (${status}) para ${studentName} en «${course.name}»`, (current) => {
      const rest = current.attendance.filter(
        (item) => !(item.courseId === course.id && item.studentId === studentId && item.date === selectedDate),
      )
      return {
        ...current,
        attendance: [{ courseId: course.id, studentId, date: selectedDate, status }, ...rest],
      }
    })
    notify(`Asistencia actualizada: ${studentName} → ${status}`)
  }

  if (isStudent) {
    const myRecords = effectiveRecords
      .filter((a) => a.studentId === user.id)
      .sort((a, b) => b.date.localeCompare(a.date))
    const myPresent = myRecords.filter((a) => a.status === 'Presente' || a.status === 'Justificada').length
    const myRate = myRecords.length ? Math.round((myPresent / myRecords.length) * 100) + '% asistencia' : 'Sin registros'

    return (
      <div className="l-attendance-panel">
        <div className="l-attendance-summary">
          <div>
            <h3>Tu asistencia en este curso</h3>
            <p>Seguimiento de sesiones registradas dentro de {course.name}.</p>
          </div>
          <span className="p-badge tone-soft-accent">
            <CheckCircle2 size={14} aria-hidden="true" /> {myRate}
          </span>
        </div>

        {myRecords.length ? (
          <ul className="l-attendance-list">
            {myRecords.map((rec, idx) => (
              <li key={`${rec.date}-${idx}`}>
                <span>
                  <CalendarDays size={15} aria-hidden="true" /> {formatDate(rec.date, { dateStyle: 'medium' })}
                </span>
                <span className={`p-badge${rec.status === 'Presente' ? ' tone-soft-accent' : ''}`}>{rec.status}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="learn-info">Aún no hay sesiones de asistencia registradas en este curso.</p>
        )}
      </div>
    )
  }

  return (
    <div className="l-attendance-panel">
      <div className="l-attendance-summary">
        <div>
          <h3>
            <ClipboardCheck size={17} aria-hidden="true" /> Asistencia del curso
          </h3>
          <p>
            {canEdit
              ? 'Marca la asistencia de la sesión directamente dentro del curso (persistida en Supabase).'
              : 'Resumen y promedio general de asistencia del curso para supervisión académica.'}
          </p>
        </div>
        <div className="l-attendance-kpis">
          <span className="p-badge tone-soft-accent">Promedio curso: {courseAverage}</span>
          <span className="p-badge">
            <UsersRound size={13} aria-hidden="true" /> {roster.length} alumnos
          </span>
        </div>
      </div>

      {canEdit && (
        <div className="l-attendance-toolbar">
          <label htmlFor="course-att-date">
            Fecha de sesión
            <input
              id="course-att-date"
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
            />
          </label>
        </div>
      )}

      <div className="l-attendance-table">
        {roster.map((student) => {
          const dayRecord = workspace.attendance.find(
            (a) => a.courseId === course.id && a.studentId === student.id && a.date === selectedDate,
          )
          const studentCourseRows = effectiveRecords.filter((a) => a.studentId === student.id)
          const studentPresent = studentCourseRows.filter(
            (a) => a.status === 'Presente' || a.status === 'Justificada',
          ).length
          const studentRate = studentCourseRows.length
            ? `${Math.round((studentPresent / studentCourseRows.length) * 100)}%`
            : 'Sin registro'

          return (
            <div className="l-attendance-row" key={student.id}>
              <div className="l-attendance-student">
                <span className="p-avatar">{initials(student.name)}</span>
                <div>
                  <strong>{student.name}</strong>
                  <small>
                    {student.group} · Acumulado: {studentRate}
                  </small>
                </div>
              </div>
              {canEdit ? (
                <div className="l-attendance-pills" role="group" aria-label={`Asistencia de ${student.name}`}>
                  {attendanceStatuses.map((status) => (
                    <button
                      key={status}
                      type="button"
                      className={`ai-mini-btn ${dayRecord?.status === status ? 'tone-accent' : 'tone-pill'}`}
                      aria-pressed={dayRecord?.status === status}
                      onClick={() => setStatus(student.id, student.name, status)}
                    >
                      {status}
                    </button>
                  ))}
                </div>
              ) : (
                <span className="p-badge tone-soft-accent">{studentRate}</span>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
