import type { CalendarEvent } from '../types/workspace'
import { dateKey } from './date'

export function canSeeEvent(event: CalendarEvent, userId: string) {
  if (!event.audience || event.audience === 'campus') return true
  if (event.createdById === userId) return true
  return event.audience === 'invited' && Boolean(event.participantIds?.includes(userId))
}

/** Verdadero mientras el evento no haya terminado. */
export function isUpcoming(event: CalendarEvent, now = new Date()) {
  const today = dateKey(now)
  const clock = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`
  return event.date > today || (event.date === today && (event.endTime ?? event.time) >= clock)
}

export function timeRange(event: CalendarEvent) {
  return event.endTime ? `${event.time} – ${event.endTime}` : event.time
}

export function byDateAndTime(a: { date: string; time: string }, b: { date: string; time: string }) {
  return a.date.localeCompare(b.date) || a.time.localeCompare(b.time)
}
