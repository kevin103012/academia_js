import type { ReactNode } from 'react'
import type { AcademicCopy } from './academicLocale'
import type { CourseMetrics } from './academicModel'

export function AcademicCharts({ metrics, copy }: { metrics: CourseMetrics[]; copy: AcademicCopy }) {
  const { t, formatNumber, percent } = copy
  const sort = (value: (item: CourseMetrics) => number | null) => metrics.flatMap(row => {
    const numeric = value(row)
    return numeric === null ? [] : [{ course: row.course, value: numeric }]
  }).sort((a, b) => b.value - a.value || a.course.name.localeCompare(b.course.name, copy.locale)).slice(0, 8)
  const enrollment = sort(item => item.enrolled)
  const grades = sort(item => item.average)
  const attendance = sort(item => item.attendanceRate)
  return <div className="ca-charts">
    <BarChart title={t('topEnrollments')} explanation={t('enrollmentMethod')} rows={enrollment}
      max={Math.max(enrollment[0]?.value ?? 0, 1)} display={formatNumber} empty={t('noMatchingCourses')} />
    <BarChart title={t('gradesByCourse')} explanation={t('gradeMethod')} rows={grades}
      max={Math.max(grades[0]?.value ?? 0, 100)} display={percent} empty={t('noGrades')} />
    <BarChart title={t('attendanceByCourse')} explanation={t('attendanceMethod')} rows={attendance}
      max={100} display={percent} empty={t('noAttendance')} />
  </div>
}

function BarChart({ title, explanation, rows, max, display, empty }: {
  title: string; explanation: string; rows: { course: CourseMetrics['course']; value: number }[]
  max: number; display: (value: number) => string; empty: string
}) {
  return <section className="ca-panel ca-chart">
    <h2>{title}</h2>
    <p className="ca-muted">{explanation}</p>
    {rows.length === 0 ? <p className="ca-chart-empty">{empty}</p> : <ol className="ca-bars">
      {rows.map(({ course, value }) => <li key={course.id}>
        <div><span>{course.name}</span><strong>{display(value)}</strong></div>
        <span className="ca-track" aria-hidden="true"><span style={{ width: `${100 * value / max}%` }} /></span>
      </li>)}
    </ol>}
  </section>
}

export function AcademicTable({ label, columns, children }: { label: string; columns: string[]; children: ReactNode }) {
  return <div className="ca-table-wrap" tabIndex={0} role="region" aria-label={label}>
    <table><thead><tr>{columns.map(column => <th key={column} scope="col">{column}</th>)}</tr></thead>
      <tbody>{children}</tbody></table>
  </div>
}

