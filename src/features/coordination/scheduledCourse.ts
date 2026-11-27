import type { Course, CourseCategoryId } from '../../types/workspace'
import type { DemoUser } from '../../types/auth'

interface CourseDraft {
  name: string
  category: string
  description: string
  group: string
  period: string
  teacherId: string
  start: string
  end: string
  days: string[]
  from: string
  until: string
}

export interface Planning {
  instructorId: string
  period: string
  start: string
  end: string
  days: number[]
  from: string
  until: string
}

export const dayNames = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado']

function isDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
  const date = new Date(value + 'T00:00:00Z')
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value
}

export function buildScheduledCourse(draft: CourseDraft, users: Pick<DemoUser, 'id' | 'role' | 'name'>[],
  id: string, categories: readonly { id: CourseCategoryId }[]): Course & { planning: Planning } {
  const teacher = users.find(user => user.role === 'teacher' && user.id === draft.teacherId)
  const category = categories.find(item => item.id === draft.category)
  if (!teacher || !category || !draft.name.trim() || !draft.group.trim() || !draft.period.trim()) {
    throw new Error('Completa el nombre, el bloque, el período, la categoría y el instructor.')
  }
  if (!isDate(draft.start) || !isDate(draft.end) || draft.end < draft.start) {
    throw new Error('Revisa las fechas de inicio y fin del curso.')
  }
  const time = /^(?:[01]\d|2[0-3]):[0-5]\d$/
  if (!draft.days.length || draft.days.some(day => !/^[0-6]$/.test(day)) ||
    !time.test(draft.from) || !time.test(draft.until) || draft.until <= draft.from) {
    throw new Error('Selecciona al menos un día y una hora de fin posterior al inicio.')
  }
  return {
    id, name: draft.name.trim(), teacher: teacher.name, group: draft.group.trim(),
    category: category.id, description: draft.description.trim(), color: 'teal',
    planning: { instructorId: teacher.id, period: draft.period.trim(), start: draft.start, end: draft.end,
      days: [...new Set(draft.days.map(Number))].sort((a,b) => a-b), from: draft.from, until: draft.until },
  }
}
