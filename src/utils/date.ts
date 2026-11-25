export function dateKey(date = new Date()) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function dateAt(offset: number) {
  const date = new Date()
  date.setDate(date.getDate() + offset)
  return dateKey(date)
}

export function readDate(key: string) {
  return new Date(`${key}T12:00:00`)
}

export function formatDate(key: string, options: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short' }) {
  return new Intl.DateTimeFormat('es-PE', options).format(readDate(key))
}
