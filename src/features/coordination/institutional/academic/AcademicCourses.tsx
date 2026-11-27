import { useId, useState, type FormEvent } from 'react'
import { BookOpen, Plus } from 'lucide-react'
import type { Course, ModuleProps, Snapshot } from '../contract'
import { courseCategories } from '../../../../types/workspace'
import { dateKey } from '../../../../utils/date'
import type { AcademicCopy } from './academicLocale'
import { AcademicTable } from './AcademicVisuals'
import { activityStats, attendanceForStudents, coursePayload, type CourseMetrics } from './academicModel'

export function CourseCatalog({ data, metrics, copy, run, onCreated }: {
  data: Snapshot; metrics: CourseMetrics[]; copy: AcademicCopy; run: ModuleProps['run']; onCreated: () => void
}) {
  const { t } = copy
  const [selected, setSelected] = useState('')
  const [creating, setCreating] = useState(false)
  const [notice, setNotice] = useState(false)
  const selectedCourse = metrics.find(({ course }) => course.id === selected)?.course ?? metrics[0]?.course
  const ready = data.people.some(person => person.role === 'teacher') && data.periods.length > 0
  return <>
    <div className="ca-catalog-actions">
      <div aria-live="polite">{notice && <p className="ca-created">{t('created')}</p>}{!ready && <p className="ca-muted">{t('missingSetup')}</p>}</div>
      {!creating && <button className="p-button tone-accent" type="button" disabled={!ready} onClick={() => { setCreating(true); setNotice(false) }}>
        <Plus size={17} aria-hidden="true" /> {t('create')}
      </button>}
    </div>
    {creating && <CourseForm copy={copy} data={data} run={run} onCancel={() => setCreating(false)} onCreated={() => {
      setCreating(false); setNotice(true); onCreated()
    }} />}
    {!selectedCourse ? <p className="ca-panel ca-empty">{t('noMatchingCourses')}</p> :
      <div className="ca-catalog">
        <nav className="ca-panel ca-course-list" aria-label={t('courses')}>
          <h2>{t('courses')}</h2>
          {metrics.map(({ course, enrolled }) => <button key={course.id} type="button" aria-current={course.id === selectedCourse.id || undefined}
            onClick={() => setSelected(course.id)}>
            <BookOpen size={18} aria-hidden="true" /><span><strong>{course.name}</strong>
              <small>{course.teacher_name || t('notSpecified')} · {copy.formatNumber(enrolled)} {t(enrolled === 1 ? 'enrollment' : 'enrollments').toLocaleLowerCase(copy.locale)}</small></span>
          </button>)}
        </nav>
        <CourseDetail key={selectedCourse.id} course={selectedCourse} data={data} copy={copy} />
      </div>}
  </>
}

function CourseForm({ copy, data, run, onCancel, onCreated }: {
  copy: AcademicCopy; data: Snapshot; run: ModuleProps['run']; onCancel: () => void; onCreated: () => void
}) {
  const { t } = copy
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const [periodId, setPeriodId] = useState('')
  const period = data.periods.find(item => item.id === periodId)
  const blocks = [...new Set([data.me.academic_block, ...data.courses.map(course => course.academic_block),
    ...data.people.map(person => person.academic_block)].filter(Boolean))].sort()
  const id = useId()

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (saving) return
    const values = new FormData(event.currentTarget)
    const value = (name: string) => String(values.get(name) ?? '')
    const result = coursePayload({
      name: value('name'), description: value('description'), category: value('category'),
      academic_block: value('academic_block'), teacher_id: value('teacher_id'), period_id: value('period_id'),
      start_date: value('start_date'), end_date: value('end_date'), days: values.getAll('days').map(Number),
      start_time: value('start_time'), end_time: value('end_time'),
    }, data, courseCategories.map(category => category.id))
    if ('error' in result) { setError(copy.error(result.error)); return }
    setError('')
    setSaving(true)
    try {
      await run('course.create', result.payload)
      onCreated()
    } catch {
      setError(t('courseError'))
    } finally {
      setSaving(false)
    }
  }

  return <form className="ca-panel ca-course-form" onSubmit={submit} aria-labelledby={id}>
    <h2 id={id}>{t('newCourse')}</h2>
    <fieldset className="ca-form-grid" disabled={saving}>
      <label>{t('name')}<input name="name" required maxLength={100} autoFocus /></label>
      <label>{t('category')}<select name="category" required defaultValue="">
        <option value="" disabled>{t('chooseCategory')}</option>
        {courseCategories.map(category => <option value={category.id} key={category.id}>{copy.category(category.id, category.label)}</option>)}
      </select></label>
      <label>{t('instructor')}<select name="teacher_id" required defaultValue="">
        <option value="" disabled>{t('chooseTeacher')}</option>
        {data.people.filter(person => person.role === 'teacher').map(person => <option value={person.id} key={person.id}>{person.full_name}</option>)}
      </select></label>
      <label>{t('block')}<input name="academic_block" list={id + '-blocks'} required maxLength={90} />
        <datalist id={id + '-blocks'}>{blocks.map(block => <option key={block} value={block} />)}</datalist>
      </label>
      <label>{t('period')}<select name="period_id" required value={periodId} onChange={event => setPeriodId(event.target.value)}>
        <option value="" disabled>{t('choosePeriod')}</option>
        {data.periods.map(period => <option value={period.id} key={period.id}>{period.name}</option>)}
      </select></label>
      <label className="ca-form-start">{t('startDate')}<input name="start_date" type="date" min={period?.start_date} max={period?.end_date} required /></label>
      <label>{t('endDate')}<input name="end_date" type="date" min={period?.start_date} max={period?.end_date} required /></label>
      <fieldset className="ca-form-wide">
        <legend>{t('days')}</legend>
        <div className="ca-checks">{[1, 2, 3, 4, 5, 6, 7].map(day =>
          <label key={day}><input type="checkbox" name="days" value={day} />{copy.weekday(day)}</label>)}
        </div>
      </fieldset>
      <label>{t('startTime')}<input name="start_time" type="time" required /></label>
      <label>{t('endTime')}<input name="end_time" type="time" required /></label>
      <label className="ca-form-wide">{t('description')}<textarea name="description" rows={3} maxLength={600} /></label>
    </fieldset>
    {error && <p role="alert" className="ca-error">{error}</p>}
    <div className="ca-actions">
      <button type="submit" className="p-button tone-accent" disabled={saving}>{saving ? t('saving') : t('save')}</button>
      <button type="button" className="p-button" disabled={saving} onClick={onCancel}>{t('cancel')}</button>
    </div>
  </form>
}

function CourseDetail({ course, data, copy }: { course: Course; data: Snapshot; copy: AcademicCopy }) {
  const { t, formatNumber } = copy
  const lessons = data.lessons.filter(lesson => lesson.course_id === course.id).sort((a, b) => a.position - b.position)
  const activities = data.activities.filter(activity => activity.course_id === course.id)
  const schedule = data.schedules.filter(slot => slot.course_id === course.id).sort((a, b) => a.day_of_week - b.day_of_week || a.start_time.localeCompare(b.start_time))
  const period = data.periods.find(item => item.id === course.period_id)
  const category = courseCategories.find(item => item.id === course.category)
  const roster = attendanceForStudents(data, course.id)
  const today = dateKey()
  return <article className="ca-panel ca-detail">
    <header>
      <h2>{course.name}</h2>
      {course.description && <p className="ca-muted">{course.description}</p>}
    </header>
    <dl className="ca-course-meta">
      <div><dt>{t('instructor')}</dt><dd>{course.teacher_name || t('notSpecified')}</dd></div>
      <div><dt>{t('category')}</dt><dd>{copy.category(course.category, category?.label ?? (course.category || t('notSpecified')))}</dd></div>
      <div><dt>{t('block')}</dt><dd>{course.academic_block || t('notSpecified')}</dd></div>
      <div><dt>{t('period')}</dt><dd>{period?.name ?? t('notSpecified')}</dd></div>
      <div><dt>{t('duration')}</dt><dd>{course.start_date && course.end_date
        ? `${copy.date(course.start_date)} – ${copy.date(course.end_date)}` : t('notSpecified')}</dd></div>
      <div><dt>{t('schedule')}</dt><dd>{schedule.length ? schedule.map((slot, index) =>
        <span className="ca-slot" key={index}>{copy.weekday(slot.day_of_week)} · {slot.start_time.slice(0, 5)}–{slot.end_time.slice(0, 5)}</span>) : t('noSchedule')}</dd></div>
    </dl>
    <section><h3>{t('lessons')}</h3>{lessons.length ? <ol className="ca-lessons">{lessons.map(lesson => <li key={lesson.id}>{lesson.title}</li>)}</ol>
      : <p className="ca-muted">{t('noLessons')}</p>}</section>
    <section><h3>{t('courseWork')}</h3>{activities.length ?
      <AcademicTable label={t('courseWork')} columns={[t('activities'), t('due'), t('submissions'), t('graded')]}>
        {activities.map(activity => {
          const stats = activityStats(data, activity, today)
          return <tr key={activity.id}><th scope="row">{activity.title}{activity.instructions &&
            <p className="ca-muted ca-instructions">{activity.instructions}</p>}</th>
            <td>{copy.date(activity.due_date, t('noDeadline'))}</td><td>{formatNumber(stats.submissions)}</td><td>{formatNumber(stats.graded)}</td></tr>
        })}
      </AcademicTable> : <p className="ca-muted">{t('noCourseActivities')}</p>}</section>
    <section><h3>{t('courseAttendance')}</h3><p className="ca-muted">{t('attendanceMethod')}</p>
      {roster.length === 0 ? <p className="ca-empty">{t('noRoster')}</p> :
        <AcademicTable label={t('courseAttendance')} columns={[t('student'), t('attended'), t('marked'), t('attendance')]}>
          {roster.map(student => <tr key={student.id}><th scope="row">{student.name || t('studentUnknown')}</th>
            <td>{formatNumber(student.attended)}</td><td>{formatNumber(student.marked)}</td><td>{copy.percent(student.rate)}</td></tr>)}
        </AcademicTable>}
    </section>
  </article>
}
