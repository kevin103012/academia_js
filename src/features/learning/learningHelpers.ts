import { BookOpen, FlaskConical, NotebookPen, Pi } from 'lucide-react'
import { isOrientation } from '../../services'
import type { LearningEntry } from '../../types/learning'
import type { Course } from '../../types/workspace'
import { formatDate } from '../../utils/date'

export function courseIcon(courseId: string) {
  if (courseId === 'science') return FlaskConical
  if (courseId === 'math') return Pi
  if (courseId === 'language') return NotebookPen
  return BookOpen
}

export function certificateTitle(course: Course) {
  return isOrientation(course.id) ? `Inducción · ${course.name}` : course.name
}

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (character) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  })[character] ?? character)
}

export function downloadCertificate(course: Course, entry: LearningEntry, studentName: string) {
  if (!entry.certifiedAt || entry.score === undefined) return
  const title = escapeHtml(certificateTitle(course))
  const student = escapeHtml(studentName)
  const issued = escapeHtml(formatDate(entry.certifiedAt, { dateStyle: 'long' }))
  const markup = `<!doctype html>
<html lang="es"><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>Constancia de demostración · ${title}</title>
<style>
* { box-sizing: border-box }
body { margin: 0; padding: 32px; color: #151515; background: #eee3cc; font: 16px/1.65 system-ui, sans-serif }
main { max-width: 760px; margin: 0 auto; border: 3px solid #151515; padding: clamp(24px, 8vw, 84px); text-align: center }
h1 { font-size: clamp(28px, 5vw, 48px); line-height: 1; margin: 20px 0 }
h2 { font: 36px Georgia, serif; margin: 12px 0 }
.mark { display: block; height: 5px; width: 64px; background: #00c2b5; margin: 0 auto 32px }
.details { margin-top: 32px; padding-top: 16px; border-top: 1px solid #80786a }
@media print { body { padding: 0; print-color-adjust: exact; -webkit-print-color-adjust: exact } }
</style>
<main><span class="mark" aria-hidden="true"></span><strong>Junior’s Sparks</strong><h1>Certificado de demostración</h1>
<p>Se otorga a</p><h2>${student}</h2><p>por completar <strong>${title}</strong>.</p>
<p class="details">Emitido el ${issued} · Resultado: ${entry.score}%</p>
<small>Documento de práctica sin validez académica.</small></main></html>`

  const url = URL.createObjectURL(new Blob([markup], { type: 'text/html;charset=utf-8' }))
  const link = document.createElement('a')
  link.href = url
  link.download = `junior-sparks-certificado-${course.id.replace(/[^a-z0-9-]/gi, '-')}.html`
  document.body.append(link)
  link.click()
  link.remove()
  window.setTimeout(() => URL.revokeObjectURL(url), 1000)
}
