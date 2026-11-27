import { CheckCircle2, Download, FileClock } from 'lucide-react'
import { completedLessonCount, courseLessons } from '../../services'
import type { Workspace } from '../../types/workspace'
import { downloadCsv } from '../../utils/csv'
import { formatDate } from '../../utils/date'

export function ReportsView({ workspace }: { workspace: Workspace }) {
  const enrollments = Object.values(workspace.progress).filter((entry) => entry.enrolled)
  const graded = workspace.submissions.filter((item) => typeof item.score === 'number')
  const average = graded.length ? graded.reduce((sum, item) => sum + (item.score ?? 0), 0) / graded.length : undefined
  const outstanding = workspace.submissions.filter((item) => item.score === undefined)
  const certificates = enrollments.filter((entry) => entry.certifiedAt).length
  const summaryRows: [string, string | number][] = [
    ['Cursos disponibles', workspace.courses.length],
    ['Matrículas de la demo', enrollments.length],
    ['Certificados emitidos', certificates],
    ['Entregas sin calificar', outstanding.length],
    ['Promedio sobre 20', average === undefined ? 'Sin notas' : average.toFixed(1)],
  ]

  return (
    <section>
      <header className="p-section-heading">
        <div>
          <h1>Reportes</h1>
          <p>Consulta el progreso, las alertas y el historial de actividad de este entorno.</p>
        </div>
        <button
          className="p-button p-button-primary"
          onClick={() => downloadCsv('junior-sparks-reporte.csv', [['Indicador', 'Valor'], ...summaryRows])}
        >
          <Download size={17} /> Descargar reporte
        </button>
      </header>
      <div className="p-dashboard-grid">
        <div className="p-card p-report">
          <h2>Resumen académico</h2>
          <dl>
            {summaryRows.map(([label, value]) => (
              <div key={label}>
                <dt>{label}</dt>
                <dd>{value}</dd>
              </div>
            ))}
          </dl>
        </div>
        <div className="p-card p-report">
          <h2>Avance por curso</h2>
          {workspace.courses.map((course) => {
            const total = courseLessons(course).length
            const count = completedLessonCount(course, workspace.progress[course.id])
            return (
              <div key={course.id} className="p-report-progress">
                <span>
                  {course.name}
                  <strong>
                    {count}/{total}
                  </strong>
                </span>
                <progress aria-label={`Avance en ${course.name}`} max={total || 1} value={count} />
              </div>
            )
          })}
        </div>
      </div>
      <div className="p-card p-report p-audit">
        <div className="p-card-head">
          <h2>Historial de actividad</h2>
          {workspace.audit.length > 0 && (
            <button
              className="p-button p-button-short"
              onClick={() =>
                downloadCsv(
                  'junior-sparks-actividad.csv',
                  [['Fecha', 'Cuenta', 'Acción'], ...workspace.audit.map((item) => [item.date, item.actor, item.action])],
                )
              }
            >
              <Download size={16} /> Exportar
            </button>
          )}
        </div>
        {workspace.audit.length ? (
          workspace.audit.slice(0, 24).map((item) => (
            <div className="p-audit-row" key={item.id}>
              <CheckCircle2 size={17} />
              <div className="p-list-copy">
                <strong>{item.action}</strong>
                <small>{item.actor}</small>
              </div>
              <time dateTime={item.date}>{formatDate(item.date)}</time>
            </div>
          ))
        ) : (
          <div className="p-empty">
            <FileClock size={25} />
            <p>Las acciones que realices en la demo quedarán registradas aquí.</p>
          </div>
        )}
      </div>
    </section>
  )
}
