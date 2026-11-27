import type { Attendance, Workspace } from '../../types/workspace'
import { env } from '../../config/env'
import { getSupabaseClient } from '../../services/supabase/supabaseClient'

export type EnrollmentTotal = { enrolled: number; certified: number }

export function attendanceRate(records: Attendance[]) {
  if (records.length === 0) return null
  return records.filter(({ status }) => status === 'Presente' || status === 'Justificada').length / records.length * 100
}

export function courseAnalytics(workspace: Workspace, enrollments: Record<string, EnrollmentTotal>) {
  return workspace.courses.map((course) => {
    const activityIds = new Set(workspace.activities.filter((item) => item.courseId === course.id).map((item) => item.id))
    const submissions = workspace.submissions.filter((item) => activityIds.has(item.activityId))
    const scores = submissions.flatMap((item) => typeof item.score === 'number' && Number.isFinite(item.score) ? [item.score] : [])
    const attendance = workspace.attendance.filter((item) => item.courseId === course.id)
    const total = enrollments[course.id]
    return {
      course,
      enrolled: total?.enrolled ?? 0,
      certified: total?.certified ?? 0,
      attendance: attendanceRate(attendance),
      attendanceCount: attendance.length,
      average: scores.length ? scores.reduce((sum, value) => sum + value, 0) / scores.length : null,
      scoreCount: scores.length,
      pending: submissions.length - scores.length,
    }
  })
}

export async function loadEnrollmentTotals(workspace: Workspace): Promise<Record<string, EnrollmentTotal>> {
  const supabase = getSupabaseClient()
  if (!env.hasSupabase || !supabase) {
    return Object.fromEntries(Object.entries(workspace.progress).map(([id, entry]) =>
      [id, { enrolled: Number(entry.enrolled), certified: Number(Boolean(entry.certifiedAt)) }],
    ))
  }

  const batchSize = 500
  const totals: Record<string, EnrollmentTotal> = Object.create(null)
  for (let offset = 0; ; offset += batchSize) {
    const { data, error } = await supabase.from('course_enrollments')
      .select('course_id,certified_at')
      .eq('enrolled', true)
      .order('course_id')
      .order('student_id')
      .range(offset, offset + batchSize - 1)
    if (error) throw new Error('No se pudieron consultar las matrículas del campus.')
    for (const row of data ?? []) {
      const total = totals[row.course_id] ??= { enrolled: 0, certified: 0 }
      total.enrolled++
      if (row.certified_at) total.certified++
    }
    if (!data || data.length < batchSize) return totals
  }
}
