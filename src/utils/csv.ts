export function downloadCsv(filename: string, rows: (string | number)[][]) {
  const escaped = rows.map((row) => row.map((value) => {
    const raw = String(value)
    const text = typeof value === 'string' && /^[=+\-@\t\r]/.test(raw) ? `'${raw}` : raw
    return `"${text.replaceAll('"', '""')}"`
  }).join(',')).join('\r\n')
  downloadText(filename, '\ufeff' + escaped, 'text/csv')
}

export function downloadText(filename: string, content: string, mimeType: string) {
  const url = URL.createObjectURL(new Blob([content], { type: mimeType + ';charset=utf-8' }))
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  anchor.click()
  window.setTimeout(() => URL.revokeObjectURL(url), 300)
}
