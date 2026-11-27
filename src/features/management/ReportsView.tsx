import { useEffect, useMemo, useState } from 'react'
import { Download } from 'lucide-react'
import { env } from '../../config/env'
import type { Workspace } from '../../types/workspace'
import { downloadCsv, downloadText } from '../../utils/csv'
import { formatDate } from '../../utils/date'
import { attendanceRate, courseAnalytics, loadEnrollmentTotals, type EnrollmentTotal } from './analytics'

const number = new Intl.NumberFormat('es-PE', { maximumFractionDigits: 1 })
const display = (value: number | null) => value === null ? 'Sin datos' : number.format(value)

type ReportBlock = { id: string; title: string; head: string[]; rows: (string | number)[][] }
type ReportFormat = 'csv' | 'json' | 'html'

function escapeHtml(value: string | number) {
  return String(value).replace(/[&<>"']/g, (character) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[character] ?? character))
}

function exportReport(format: ReportFormat, blocks: ReportBlock[]) {
  if (format === 'csv') {
    downloadCsv('junior-sparks-reporte.csv', blocks.flatMap((block) => [[block.title], block.head, ...block.rows, []]))
    return
  }
  if (format === 'json') {
    downloadText('junior-sparks-reporte.json', JSON.stringify(Object.fromEntries(blocks.map((block) => [
      block.id, block.rows.map((row) => Object.fromEntries(block.head.map((key, index) => [key, row[index]]))),
    ])), null, 2), 'application/json')
    return
  }
  const sections = blocks.map((block) => '<section><h2>' + escapeHtml(block.title) + '</h2><table><thead><tr>' +
    block.head.map((cell) => '<th scope="col">' + escapeHtml(cell) + '</th>').join('') +
    '</tr></thead><tbody>' + block.rows.map((row) =>
      '<tr>' + row.map((cell) => '<td>' + escapeHtml(cell) + '</td>').join('') + '</tr>',
    ).join('') + '</tbody></table></section>').join('')
  const html = '<!doctype html><html lang="es"><meta charset="utf-8"><title>Reporte académico</title>' +
    '<style>body{font:15px system-ui;color:#161b1b;margin:2cm}table{border-collapse:collapse;width:100%}th,td{padding:8px;border-bottom:1px solid #bbb;text-align:left}thead{display:table-header-group}tr{break-inside:avoid}section{margin-bottom:2rem}</style>' +
    '<main><h1>Junior’s Sparks · Reporte académico</h1>' + sections + '</main></html>'
  downloadText('junior-sparks-reporte.html', html, 'text/html')
}

function ReportChart({ title, rows, maximum, suffix }: {
  title: string
  rows: { id: string; label: string; value: number | null }[]
  maximum: number
  suffix?: string
}) {
  return <section className="p-report-chart">
    <h3>{title}</h3>
    {rows.map((row) => <div className="p-chart-row" key={row.id}>
      <span>{row.label}</span>
      <strong>{display(row.value)}{row.value !== null ? suffix : ''}</strong>
      {row.value !== null && <progress value={row.value} max={maximum} aria-label={row.label + ': ' + title} />}
    </div>)}
    {rows.length === 0 && <p className="p-meta">Sin cursos en esta selección.</p>}
  </section>
}

export function ReportsView({ workspace, compact = false }: { workspace: Workspace; compact?: boolean }) {
  const [enrollments, setEnrollments] = useState<Record<string, EnrollmentTotal>>({})
  const [enrollmentStatus, setEnrollmentStatus] = useState<'loading' | 'ready' | 'error'>('loading')
  const [period, setPeriod] = useState('')
  const [format, setFormat] = useState<ReportFormat>('csv')
  const [selected, setSelected] = useState(['summary', 'performance', 'attendance'])
  const [exportOpen, setExportOpen] = useState(false)

  useEffect(() => {
    let active = true
    loadEnrollmentTotals(workspace).then((totals) => {
      if (!active) return
      setEnrollments(totals)
      setEnrollmentStatus('ready')
    }).catch(() => { if (active) setEnrollmentStatus('error') })
    return () => { active = false }
  }, [workspace])

  const stats = useMemo(() => courseAnalytics(workspace, enrollments)
    .filter(({ course }) => !period || course.period === period), [workspace, enrollments, period])
  const courseIds = new Set(stats.map(({ course }) => course.id))
  const total = stats.reduce((sum, row) => sum + row.enrolled, 0)
  const attendance = attendanceRate(workspace.attendance.filter((item) => item.courseId && courseIds.has(item.courseId)))
  const qualified = stats.reduce((sum, row) => sum + row.scoreCount, 0)
  const average = qualified === 0 ? null : stats.reduce((sum, row) => sum + (row.average ?? 0) * row.scoreCount, 0) / qualified
  const enrollmentLabel = enrollmentStatus === 'ready' ? total : enrollmentStatus === 'loading' ? 'Cargando…' : 'No disponible'
  const summary: (string | number)[][] = [
    ['Cursos', stats.length],
    ['Matrículas', enrollmentLabel],
    ['Promedio de notas (sobre 20)', display(average)],
    ['Asistencia registrada', attendance === null ? 'Sin datos' : display(attendance) + '%'],
  ]
  const blocks: ReportBlock[] = [
    { id: 'summary', title: 'Resumen académico', head: ['Indicador', 'Valor'], rows: summary },
    { id: 'performance', title: 'Rendimiento por curso', head: ['Curso', 'Bloque', 'Matrículas', 'Certificados', 'Promedio sobre 20', 'Notas registradas'],
      rows: stats.map((row) => [row.course.name, row.course.group, enrollmentStatus === 'ready' ? row.enrolled : 'No disponible', enrollmentStatus === 'ready' ? row.certified : 'No disponible', row.average ?? 'Sin datos', row.scoreCount]) },
    { id: 'attendance', title: 'Asistencia por curso', head: ['Curso', 'Asistencia (%)', 'Registros'],
      rows: stats.map((row) => [row.course.name, row.attendance ?? 'Sin datos', row.attendanceCount]) },
    { id: 'pending', title: 'Entregas sin calificar', head: ['Curso', 'Pendientes'],
      rows: stats.map((row) => [row.course.name, row.pending]) },
    { id: 'audit', title: 'Historial de actividad (todos los periodos)', head: ['Fecha', 'Cuenta', 'Acción'],
      rows: workspace.audit.map((row) => [row.date, row.actor, row.action]) },
  ]
  const top = [...stats].sort((a, b) => b.enrolled - a.enrolled)
  const headline = compact ? 'Indicadores académicos' : 'Reportes'

  return <section className="p-academic-report" aria-label={headline}>
    <header className="p-section-heading">
      <div>
        {compact ? <h2>{headline}</h2> : <h1>{headline}</h1>}
        {!compact && <p>Rendimiento, matrículas, asistencia y entregas por curso.</p>}
      </div>
      {!compact && <button type="button" className="p-button p-button-primary" aria-expanded={exportOpen} onClick={() => setExportOpen(!exportOpen)}>
        <Download size={17} aria-hidden="true" /> Exportar
      </button>}
    </header>
    {!compact && <label className="p-report-filter">Periodo académico
      <select value={period} onChange={(event) => setPeriod(event.target.value)}>
        <option value="">Todos los periodos</option>
        {workspace.periods.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
      </select>
    </label>}
    {exportOpen && !compact && <form className="p-report-export" onSubmit={(event) => {
      event.preventDefault()
      exportReport(format, blocks.filter((block) => selected.includes(block.id)))
    }}>
      <fieldset>
        <legend>Información que quieres exportar</legend>
        {blocks.map((block) => <label className="p-checkbox-row" key={block.id}>
          <input type="checkbox" checked={selected.includes(block.id)} onChange={(event) => setSelected((current) =>
            event.target.checked ? [...current, block.id] : current.filter((id) => id !== block.id),
          )} /> {block.title}
        </label>)}
      </fieldset>
      <div className="p-report-export-action">
        <label className="p-report-filter">Formato
          <select value={format} onChange={(event) => setFormat(event.target.value as ReportFormat)}>
            <option value="csv">CSV</option><option value="json">JSON</option><option value="html">HTML imprimible / PDF</option>
          </select>
        </label>
        <button className="p-button p-button-primary" type="submit" disabled={selected.length === 0 || enrollmentStatus === 'loading'}>Descargar selección</button>
        {format === 'html' && <p className="p-meta">Abre el HTML y usa Imprimir para guardarlo como PDF.</p>}
      </div>
    </form>}
    <dl className="p-report-statline" aria-label="Indicadores del periodo">
      {summary.map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}
    </dl>
    {!env.hasSupabase && <p className="p-meta">Las matrículas de demostración corresponden a este navegador.</p>}
    {enrollmentStatus === 'error' && <p className="p-warning" role="status">No se pudieron consultar las matrículas. Las notas y la asistencia siguen disponibles.</p>}
    <div className="p-report-charts">
      <ReportChart title="Matrículas por curso" maximum={Math.max(1, top[0]?.enrolled ?? 0)} rows={top.slice(0, compact ? 3 : 10).map((row) => ({
        id: row.course.id, label: row.course.name, value: enrollmentStatus === 'ready' ? row.enrolled : null,
      }))} />
      <ReportChart title="Promedio de notas" maximum={20} rows={stats.filter((row) => !compact || row.average !== null).slice(0, compact ? 3 : undefined).map((row) => ({
        id: row.course.id, label: row.course.name, value: row.average,
      }))} />
      <ReportChart title="Asistencia por curso" maximum={100} suffix="%" rows={stats.filter((row) => !compact || row.attendance !== null).slice(0, compact ? 3 : undefined).map((row) => ({
        id: row.course.id, label: row.course.name, value: row.attendance,
      }))} />
    </div>
    {!compact && <section className="p-report-audit">
      <h2>Historial reciente</h2>
      {workspace.audit.slice(0, 12).map((item) => <div className="p-audit-row" key={item.id}>
        <div className="p-list-copy"><strong>{item.action}</strong><small>{item.actor}</small></div>
        <time dateTime={item.date}>{formatDate(item.date)}</time>
      </div>)}
    </section>}
  </section>
}
