import type { Attendance, AttendanceStatus, ClassSchedule, Course } from '../types/workspace'

/** Etiquetas que ve el docente. Los valores guardados no cambian, así que los registros anteriores siguen válidos. */
export const attendanceLabels: Record<AttendanceStatus, string> = {
  Presente: 'Presente',
  Tardanza: 'Tardanza',
  Ausente: 'Faltó',
  Justificada: 'Justificado',
}

/** Orden de los botones de registro: Presente, Faltó, Justificado, Tardanza. */
export const attendanceChoices: AttendanceStatus[] = ['Presente', 'Ausente', 'Justificada', 'Tardanza']

export const weekdayOptions = [
  { value: 1, short: 'Lun', full: 'Lunes' },
  { value: 2, short: 'Mar', full: 'Martes' },
  { value: 3, short: 'Mié', full: 'Miércoles' },
  { value: 4, short: 'Jue', full: 'Jueves' },
  { value: 5, short: 'Vie', full: 'Viernes' },
  { value: 6, short: 'Sáb', full: 'Sábado' },
  { value: 0, short: 'Dom', full: 'Domingo' },
] as const

/** Tope de días de un horario, para que un dato mal escrito no recorra años. */
export const maxScheduleDays = 400

/** Convierte AAAA-MM-DD en una fecha local (sin el desfase de zona horaria de new Date('AAAA-MM-DD')). */
export function parseKey(key: string): Date {
  const [year, month, day] = key.split('-').map(Number)
  return new Date(year, (month || 1) - 1, day || 1)
}

const toKey = (date: Date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`

const validKey = (value: unknown): value is string => typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)

/** Todos los días del horario, en orden. Un horario incompleto o inválido no da ninguno. */
export function scheduledDates(schedule?: ClassSchedule): string[] {
  if (!schedule || !Array.isArray(schedule.weekdays) || !validKey(schedule.startDate) || !validKey(schedule.endDate)) return []
  const days = new Set(schedule.weekdays)
  const dates: string[] = []
  const cursor = parseKey(schedule.startDate)
  const end = parseKey(schedule.endDate)
  for (let step = 0; cursor <= end && step < maxScheduleDays; step += 1) {
    if (days.has(cursor.getDay())) dates.push(toKey(cursor))
    cursor.setDate(cursor.getDate() + 1)
  }
  return dates
}

/** Revisa el horario de un formulario y devuelve el mensaje de error, si lo hay. */
export function scheduleError(schedule: ClassSchedule): string | undefined {
  if (!schedule.weekdays.length) return 'Elige al menos un día de clase.'
  if (!schedule.startDate || !schedule.endDate) return 'Indica el primer y el último día del ciclo.'
  if (schedule.startDate > schedule.endDate) return 'El último día no puede ser anterior al primero.'
  const span = (parseKey(schedule.endDate).getTime() - parseKey(schedule.startDate).getTime()) / 86_400_000
  if (span >= maxScheduleDays) return `El ciclo no puede durar más de ${maxScheduleDays} días.`
  return undefined
}

export interface CourseDays {
  /** Clases ya dictadas: las del horario hasta hoy y cualquier día con asistencia registrada. */
  held: string[]
  /** Clases del horario que aún no llegan. */
  upcoming: string[]
  scheduled: Set<string>
}

export function courseDays(course: Course, records: Attendance[], today: string): CourseDays {
  const scheduled = scheduledDates(course.schedule)
  const held = new Set([...scheduled.filter((date) => date <= today), ...records.map((record) => record.date)])
  return {
    held: [...held].sort(),
    upcoming: scheduled.filter((date) => date > today),
    scheduled: new Set(scheduled),
  }
}

export interface AttendanceSummary {
  present: number
  late: number
  absent: number
  justified: number
  /** Clases dictadas sin registro para este alumno. */
  unrecorded: number
  /** Clases en las que asistió (presente o tardanza). */
  attended: number
  /** Clases que cuentan para el porcentaje: las registradas, sin las justificadas. */
  counted: number
  /** 0–100, o null si aún no hay ninguna clase que contar. */
  rate: number | null
}

export function summarize(studentId: string, held: string[], records: Attendance[]): AttendanceSummary {
  const byDate = new Map(records.filter((record) => record.studentId === studentId).map((record) => [record.date, record.status]))
  const count = (status: AttendanceStatus) => held.filter((date) => byDate.get(date) === status).length
  const present = count('Presente')
  const late = count('Tardanza')
  const absent = count('Ausente')
  const justified = count('Justificada')
  const unrecorded = held.filter((date) => !byDate.has(date)).length
  const attended = present + late
  const counted = attended + absent
  return { present, late, absent, justified, unrecorded, attended, counted, rate: counted ? Math.round((attended / counted) * 100) : null }
}

export type RateTone = 'high' | 'good' | 'mid' | 'low' | 'none'

/** Mismos tramos que usa la matriz: verde desde 90 %, amarillo desde 75 %, naranja desde 60 %, rojo debajo. */
export const rateTones = { high: 90, good: 75, mid: 60 } as const

export function rateTone(rate: number | null): RateTone {
  if (rate === null) return 'none'
  if (rate >= rateTones.high) return 'high'
  if (rate >= rateTones.good) return 'good'
  if (rate >= rateTones.mid) return 'mid'
  return 'low'
}
