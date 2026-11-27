import { useState } from 'react'
import { Download } from 'lucide-react'
import type { Snapshot } from '../contract'
import type { AcademicCopy } from './academicLocale'
import { AcademicCharts, AcademicTable } from './AcademicVisuals'
import { reportChart, reportFields, reportRows, toCsv, type CourseMetrics, type ReportCell, type ReportField } from './academicModel'

type Format = 'csv' | 'xlsx' | 'pdf'
const defaultFields: ReportField[] = ['course', 'enrolled', 'average', 'attendanceRate']

export function AcademicReports({ data, metrics, copy }: { data: Snapshot; metrics: CourseMetrics[]; copy: AcademicCopy }) {
  const { t, formatNumber } = copy
  const [selected, setSelected] = useState(defaultFields)
  const [format, setFormat] = useState<Format>('csv')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const fields = reportFields.filter(field => selected.includes(field))
  const headers = fields.map(copy.field)
  const rows = reportRows(metrics, fields, data.periods)

  async function download() {
    if (busy || !fields.length || !rows.length) return
    setError('')
    setBusy(true)
    try {
      if (format === 'pdf') {
        if (!printTable(copy, headers, rows, reportChart(fields, rows))) {
          setError(t('printBlocked'))
        }
      } else if (format === 'xlsx') {
        const { Workbook } = await import('exceljs')
        const workbook = new Workbook()
        const sheet = workbook.addWorksheet(t('reports'))
        sheet.addRow(headers).font = { bold: true }
        sheet.addRows(rows)
        sheet.views = [{ state: 'frozen', ySplit: 1 }]
        headers.forEach((heading, index) => { sheet.getColumn(index + 1).width = Math.max(23, heading.length + 3) })
        const binary = await workbook.xlsx.writeBuffer()
        saveFile(new Blob([new Uint8Array(binary)], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }), 'xlsx')
      } else {
        saveFile(new Blob(['\uFEFF', toCsv(headers, rows)], { type: 'text/csv;charset=utf-8' }), 'csv')
      }
    } catch {
      setError(t('exportError'))
    } finally {
      setBusy(false)
    }
  }

  return <>
    <section className="ca-panel ca-report">
      <fieldset disabled={busy}>
        <legend>{t('columns')}</legend>
        <div className="ca-checks">
          {reportFields.map(field => <label key={field}><input type="checkbox" checked={selected.includes(field)}
            onChange={event => {
              const checked = event.target.checked
              setSelected(current => checked ? [...current, field] : current.filter(item => item !== field))
            }} />
            {copy.field(field)}</label>)}
        </div>
      </fieldset>
      <div className="ca-report-actions">
        <label>{t('format')}<select value={format} disabled={busy} onChange={event => setFormat(event.target.value as Format)}>
          <option value="csv">CSV</option><option value="xlsx">Excel (.xlsx)</option><option value="pdf">PDF</option>
        </select></label>
        <button className="p-button tone-accent" type="button" onClick={download} disabled={busy || !fields.length || !rows.length}>
          <Download aria-hidden="true" size={17} />{busy ? t('exporting') : t('export')}
        </button>
      </div>
      {format === 'pdf' && <p className="ca-muted">{t('pdfHint')}</p>}
      {error && <p role="alert" className="ca-error">{error}</p>}
    </section>
    <section className="ca-panel ca-preview">
      <h2>{t('preview')}</h2>
      {!fields.length ? <p className="ca-empty">{t('selectColumns')}</p>
        : !rows.length ? <p className="ca-empty">{t('noMatchingCourses')}</p>
          : <AcademicTable label={t('preview')} columns={headers}>
            {rows.map((row, index) => <tr key={metrics[index].course.id}>{row.map((value, column) =>
              <td key={fields[column]}>{value === null ? t('emptyValue') : typeof value === 'number' ? formatNumber(value) : value}</td>)}</tr>)}
          </AcademicTable>}
    </section>
    <AcademicCharts metrics={metrics} copy={copy} />
  </>
}

function saveFile(file: Blob, extension: Exclude<Format, 'pdf'>) {
  const url = URL.createObjectURL(file)
  const link = document.createElement('a')
  link.href = url
  link.download = `academic-report.${extension}`
  document.body.append(link)
  try { link.click() } finally {
    link.remove()
    window.setTimeout(() => URL.revokeObjectURL(url), 1000)
  }
}

function printTable(copy: AcademicCopy, headers: string[], rows: ReportCell[][], chart: ReturnType<typeof reportChart>) {
  const title = copy.t('reports')
  const printView = window.open('', '_blank')
  if (!printView) return false
  printView.opener = null
  const doc = printView.document
  doc.title = title
  doc.documentElement.lang = copy.locale
  const style = doc.createElement('style')
  style.textContent = '@page{size:landscape;margin:15mm}body{font:11pt system-ui;color:#171717;margin:16px}h1{font-size:18pt}h2{font-size:13pt}table{width:100%;border-collapse:collapse}th,td{border:1px solid #888;padding:6px;text-align:left;overflow-wrap:anywhere}th{background:#eee}tr,li{break-inside:avoid}thead{display:table-header-group}ol{padding-left:22px}li{padding-bottom:5px}meter{display:block;width:70%;height:10px;print-color-adjust:exact}'
  doc.head.append(style)
  const heading = doc.createElement('h1')
  heading.textContent = title
  const table = doc.createElement('table')
  const headerRow = table.createTHead().insertRow()
  for (const header of headers) {
    const cell = doc.createElement('th')
    cell.scope = 'col'
    cell.textContent = header
    headerRow.append(cell)
  }
  const body = table.createTBody()
  for (const values of rows) {
    const row = body.insertRow()
    for (const value of values) row.insertCell().textContent = value === null ? copy.t('emptyValue') : typeof value === 'number' ? copy.formatNumber(value) : value
  }
  doc.body.append(heading, table)
  if (chart) {
    const caption = doc.createElement('h2')
    caption.textContent = copy.field(chart.field)
    const list = doc.createElement('ol')
    const max = Math.max(chart.rows[0]?.value ?? 0, chart.field === 'enrolled' ? 1 : 100)
    for (const { name, value } of chart.rows) {
      const item = doc.createElement('li'), bar = doc.createElement('meter')
      item.textContent = `${name}: ${chart.field === 'enrolled' ? copy.formatNumber(value) : copy.percent(value)}`
      bar.max = max
      bar.value = value
      bar.setAttribute('aria-hidden', 'true')
      item.append(bar)
      list.append(item)
    }
    doc.body.append(caption, list)
  }
  printView.print()
  return true
}
