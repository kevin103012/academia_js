import { useMemo, useState } from 'react'
import { ArrowRight, ClipboardList } from 'lucide-react'
import type { ModuleProps, Snapshot } from '../contract'
import { dateKey } from '../../../../utils/date'
import { academicCopy, type AcademicCopy } from './academicLocale'
import { activityStats, academicOverview, applyAcademicFilters, attendanceTrend, emptyFilters, urgentFollowup, withinAcademicDates, type AcademicFilters, type CourseMetrics } from './academicModel'
import { CourseCatalog } from './AcademicCourses'
import { AcademicReports } from './AcademicReports'
import { AcademicCharts, AcademicTable } from './AcademicVisuals'
import './academic.css'

export function AcademicModule({ page, data, run, go }: ModuleProps) {
  const [filters, setFilters] = useState(emptyFilters)
  const [activityDeadline, setActivityDeadline] = useState('')
  const copy = academicCopy(data.me.preferred_language)
  const { t } = copy
  const scopedCourses = useMemo(() => applyAcademicFilters(data.courses, filters), [data.courses, filters])
  const metrics = useMemo(() => academicOverview(data, scopedCourses, page === 'courses' ? undefined : filters), [data, scopedCourses, filters, page])

  if (page !== 'summary' && page !== 'reports' && page !== 'courses' && page !== 'activities') return null
  const description = { summary: 'summaryDescription', reports: 'reportsDescription', courses: 'coursesDescription', activities: 'activitiesDescription' } as const

  return <div className="ca">
    <header className="ca-header">
      <div><h1>{t(page)}</h1><p>{t(description[page])}</p></div>
      {page === 'summary' && <button type="button" className="p-button tone-accent" onClick={() => go('reports')}>
        {t('openReport')} <ArrowRight size={17} aria-hidden="true" />
      </button>}
    </header>
    <AcademicFilterBar data={data} copy={copy} filters={filters} update={setFilters} showDates={page !== 'courses'} />
    {page === 'summary' && <Overview metrics={metrics} copy={copy} trend={attendanceTrend(data, scopedCourses, filters)}
      urgent={urgentFollowup(data, scopedCourses, dateKey(), filters)} reviewActivities={() => { setActivityDeadline('duePassed'); go('activities') }}
      reviewIncidents={() => go('messages')} />}
    {page === 'reports' && <AcademicReports data={data} metrics={metrics} copy={copy} />}
    {page === 'courses' && <CourseCatalog data={data} metrics={metrics} copy={copy} run={run} onCreated={() => setFilters(emptyFilters)} />}
    {page === 'activities' && <ActivityExplorer data={data} metrics={metrics} copy={copy} filters={filters}
      deadline={activityDeadline} setDeadline={setActivityDeadline} />}
  </div>
}

function AcademicFilterBar({ data, copy, filters, update, showDates }: { data: Snapshot; copy: AcademicCopy; filters: AcademicFilters;
  update: (value: AcademicFilters) => void; showDates: boolean }) {
  const { t } = copy
  const blocks = [...new Set(data.courses.map(course => course.academic_block).filter(Boolean))].sort((a, b) => a.localeCompare(b, copy.locale))
  const possibleCourses = applyAcademicFilters(data.courses, { ...filters, course: '' })
  const change = (key: keyof AcademicFilters, value: string) => {
    const next = { ...filters, [key]: value }
    if (next.course && !applyAcademicFilters(data.courses, next).length) next.course = ''
    if (next.from && next.until && next.from > next.until) {
      if (key === 'from') next.until = next.from
      if (key === 'until') next.from = next.until
    }
    update(next)
  }
  return <fieldset className={showDates ? 'ca-filter ca-filter-dates' : 'ca-filter'}>
    <legend className="ca-sr">{t('filters')}</legend>
    <label>{t('block')}<select value={filters.block} onChange={event => change('block', event.target.value)}>
      <option value="">{t('allBlocks')}</option>{blocks.map(block => <option key={block}>{block}</option>)}
    </select></label>
    <label>{t('period')}<select value={filters.period} onChange={event => change('period', event.target.value)}>
      <option value="">{t('allPeriods')}</option>{data.periods.map(period => <option value={period.id} key={period.id}>{period.name}</option>)}
    </select></label>
    <label>{t('course')}<select value={filters.course} onChange={event => change('course', event.target.value)}>
      <option value="">{t('allCourses')}</option>{possibleCourses.map(course => <option value={course.id} key={course.id}>{course.name}</option>)}
    </select></label>
    {showDates && <>
      <label>{t('from')}<input type="date" value={filters.from} onChange={event => change('from', event.target.value)} /></label>
      <label>{t('until')}<input type="date" value={filters.until} onChange={event => change('until', event.target.value)} /></label>
      {(filters.from || filters.until) && <p className="ca-muted ca-filter-note">{t('dateMethod')}</p>}
    </>}
  </fieldset>
}

function Overview({ metrics, copy, trend, urgent, reviewActivities, reviewIncidents }: { metrics: CourseMetrics[]; copy: AcademicCopy;
  trend: ReturnType<typeof attendanceTrend>; urgent: ReturnType<typeof urgentFollowup>; reviewActivities: () => void; reviewIncidents: () => void }) {
  const { t, formatNumber, percent } = copy
  const sum = (field: 'enrolled' | 'graded' | 'attended' | 'marked') => metrics.reduce((total, row) => total + row[field], 0)
  const graded = sum('graded'), marked = sum('marked')
  const grade = graded ? metrics.reduce((total, row) => total + (row.average ?? 0) * row.graded, 0) / graded : null
  const attendance = marked ? 100 * sum('attended') / marked : null
  return <>
    <dl className="ca-stats">
      <div><dt>{t('matchedCourses')}</dt><dd>{formatNumber(metrics.length)}</dd></div>
      <div><dt>{t('enrollments')}</dt><dd>{formatNumber(sum('enrolled'))}</dd></div>
      <div><dt>{t('grade')}</dt><dd>{percent(grade)}</dd></div>
      <div><dt>{t('attendance')}</dt><dd>{percent(attendance)}</dd></div>
    </dl>
    <section className="ca-panel ca-urgent">
      <h2>{t('urgent')}</h2>
      {urgent.pendingGrades === 0 && urgent.incidents === 0 ? <p className="ca-muted">{t('noUrgent')}</p> : <ul>
        {urgent.pendingGrades > 0 && <li><span><strong>{formatNumber(urgent.pendingGrades)}</strong> {t('overdueGrades')}</span>
          <button type="button" className="p-button" onClick={reviewActivities}>{t('reviewActivities')}</button></li>}
        {urgent.incidents > 0 && <li><span><strong>{formatNumber(urgent.incidents)}</strong> {t('unresolvedIncidents')}</span>
          <button type="button" className="p-button" onClick={reviewIncidents}>{t('reviewIncidents')}</button></li>}
      </ul>}
    </section>
    <section className="ca-panel ca-trend">
      <h2>{t('attendanceTrend')}</h2><p className="ca-muted">{t('attendanceTrendMethod')}</p>
      {trend.length ? <ol className="ca-trend-list">{trend.map(week => {
        const value = 100 * week.attended / week.marked
        return <li key={week.date}><span>{copy.date(week.date)}</span><strong>{percent(value)}</strong>
          <span className="ca-track" aria-hidden="true"><span style={{ width: `${value}%` }} /></span></li>
      })}</ol> : <p className="ca-empty">{t('noAttendance')}</p>}
    </section>
    <AcademicCharts metrics={metrics} copy={copy} />
  </>
}

function ActivityExplorer({ data, copy, metrics, filters, deadline, setDeadline }: { data: Snapshot; copy: AcademicCopy;
  metrics: CourseMetrics[]; filters: AcademicFilters; deadline: string; setDeadline: (value: string) => void }) {
  const { t, formatNumber } = copy
  const courses = new Map(metrics.map(({ course }) => [course.id, course.name]))
  const today = dateKey()
  const rows = data.activities.filter(activity => courses.has(activity.course_id) && withinAcademicDates(activity.due_date, filters)).map(activity => {
    const stats = activityStats(data, activity, today)
    const status = !activity.due_date ? 'noDeadline' : stats.overdue ? 'duePassed' : 'dueOpen'
    return { activity, stats, status } as const
  }).filter(row => !deadline || row.status === deadline)
    .sort((a, b) => (a.activity.due_date || '9999').localeCompare(b.activity.due_date || '9999'))
  return <section className="ca-panel ca-activity">
    <div className="ca-section-heading"><h2><ClipboardList aria-hidden="true" size={19} /> {t('courseWork')}</h2>
      <label>{t('dueStatus')}<select value={deadline} onChange={event => setDeadline(event.target.value)}>
        <option value="">{t('statusAll')}</option><option value="dueOpen">{t('dueOpen')}</option>
        <option value="duePassed">{t('duePassed')}</option><option value="noDeadline">{t('noDeadline')}</option>
      </select></label></div>
    {rows.length === 0 ? <p className="ca-empty">{t('noActivity')}</p> :
      <AcademicTable label={t('courseWork')} columns={[t('activities'), t('course'), t('due'), t('submissions'), t('pending'), t('grade')]}>
        {rows.map(({ activity, stats, status }) => <tr key={activity.id}>
          <th scope="row">{activity.title}{activity.instructions && <p className="ca-muted ca-instructions">{activity.instructions}</p>}</th>
          <td>{courses.get(activity.course_id)}</td>
          <td>{copy.date(activity.due_date, t('noDeadline'))}<br /><span className="ca-tag" data-status={status}>{t(status)}</span></td>
          <td>{formatNumber(stats.submissions)}</td><td>{formatNumber(stats.submissions - stats.graded)}</td><td>{copy.percent(stats.average)}</td>
        </tr>)}
      </AcademicTable>}
  </section>
}
