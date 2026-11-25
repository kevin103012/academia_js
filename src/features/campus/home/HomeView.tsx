import {
  Activity as ActivityIcon,
  Binary,
  BookOpen,
  CalendarDays,
  ClipboardCheck,
  ClipboardList,
  Clock3,
  Cpu,
  GraduationCap,
  Layers,
  Megaphone,
  Network,
  Pi,
  UsersRound,
} from 'lucide-react'
import { completedLessonCount, courseLessons } from '../../../services'
import type { DemoUser } from '../../../types/auth'
import { courseCategories, type CourseCategoryId, type Workspace } from '../../../types/workspace'
import { dateKey, formatDate } from '../../../utils/date'
import type { CampusNavigate } from '../navigation'

const categoryIcons: Record<CourseCategoryId, typeof Cpu> = {
  hardware: Cpu,
  matematica: Pi,
  frameworks: Layers,
  algoritmos: Binary,
}

interface HomeViewProps {
  user: DemoUser
  workspace: Workspace
  navigate: CampusNavigate
}

export function HomeView({ user, workspace, navigate }: HomeViewProps) {
  const student = user.role === 'student'
  const enrollment = workspace.courses.filter((course) => workspace.progress[course.id]?.enrolled)
  const certificates = enrollment.filter((course) => workspace.progress[course.id]?.certifiedAt).length
  const minutes = enrollment.reduce(
    (total, course) =>
      total +
      courseLessons(course.id)
        .filter((lesson) => workspace.progress[course.id]?.lessons.includes(lesson.id))
        .reduce((sum, lesson) => sum + lesson.minutes, 0),
    0,
  )
  const hours = new Intl.NumberFormat('es-PE', { maximumFractionDigits: 1 }).format(minutes / 60)
  const recommended =
    enrollment.find((course) => !workspace.progress[course.id]?.certifiedAt) ??
    workspace.courses.find((course) => !workspace.progress[course.id]?.enrolled) ??
    workspace.courses[0]

  const recommendedLessons = recommended ? courseLessons(recommended.id) : []
  const recommendedCompletedIds = recommended ? workspace.progress[recommended.id]?.lessons ?? [] : []
  const nextLesson =
    recommendedLessons.find((lesson) => !recommendedCompletedIds.includes(lesson.id)) ?? recommendedLessons[0]

  const toReview = workspace.submissions.filter((submission) => submission.score === undefined).length
  const nextEvent = workspace.events
    .filter((event) => event.date >= dateKey())
    .sort((a, b) => a.date.localeCompare(b.date) || a.time.localeCompare(b.time))[0]
  const recent = workspace.audit.filter((item) => !student || item.actor === user.name).slice(0, 3)

  const stats = student
    ? [
        { icon: GraduationCap, number: enrollment.length, label: 'Matrículas activas' },
        { icon: BookOpen, number: workspace.courses.length, label: 'Cursos disponibles' },
        { icon: Clock3, number: `${hours} h`, label: 'Tiempo de estudio' },
        { icon: ClipboardCheck, number: certificates, label: 'Certificados' },
      ]
    : [
        { icon: UsersRound, number: workspace.students.length, label: 'Estudiantes registrados' },
        { icon: BookOpen, number: workspace.courses.length, label: 'Cursos en catálogo' },
        { icon: ClipboardList, number: toReview, label: 'Entregas por revisar' },
        { icon: GraduationCap, number: certificates, label: 'Certificados' },
      ]

  return (
    <section className="p-dashboard">
      <header className="p-section-heading p-welcome">
        <div>
          <h1>Hola, {user.name.split(' ')[0]}.</h1>
          <p>
            {student
              ? 'Retoma tu laboratorio interactivo o participa en tus grupos de Comunidad.'
              : 'Supervisa categorías, entregas académicas y grupos de comunidad.'}
          </p>
        </div>
        <span className="p-today">
          <CalendarDays size={17} /> {formatDate(dateKey(), { day: 'numeric', month: 'long', year: 'numeric' })}
        </span>
      </header>

      <div className="p-dashboard-hero">
        <div className="p-feature theme-dark">
          <div className="p-feature-copy">
            <span className="p-feature-icon">{student ? <BookOpen size={20} /> : <ActivityIcon size={20} />}</span>
            <h2>
              {student
                ? `Continuar: ${recommended?.name ?? 'Explora tus cursos'}`
                : 'Centro de control académico'}
            </h2>
            <p>
              {student
                ? nextLesson
                  ? `Siguiente lección: ${nextLesson.title} (${recommendedCompletedIds.length}/${recommendedLessons.length} completadas).`
                  : recommended?.description
                : 'Supervisa entregas por calificar, categorías de cursos y modelos neuronales.'}
            </p>
            <button
              className="p-button p-button-primary tone-accent"
              onClick={() => (student ? navigate('learning', recommended?.id) : navigate('activities'))}
            >
              {student
                ? recommended && workspace.progress[recommended.id]?.enrolled
                  ? 'Abrir laboratorio Split-Screen'
                  : 'Explorar cursos'
                : 'Revisar actividades'}
            </button>
          </div>
          <div className="p-feature-art" aria-hidden="true">
            <Network strokeWidth={1.15} />
          </div>
        </div>

        <div className="p-card p-next">
          <div className="p-card-head">
            <h2>Próximo evento</h2>
            <CalendarDays size={19} />
          </div>
          {nextEvent ? (
            <>
              <div className="p-event-date">
                <strong>{nextEvent.date.slice(-2)}</strong>
                <span>{formatDate(nextEvent.date, { month: 'long' })}</span>
              </div>
              <h3>{nextEvent.title}</h3>
              <p>
                {nextEvent.time} · {nextEvent.location}
              </p>
            </>
          ) : (
            <p className="p-empty">No hay eventos próximos.</p>
          )}
          <button className="p-text-button" onClick={() => navigate('calendar')}>
            Ver calendario
          </button>
        </div>
      </div>

      <dl className="p-stats">
        {stats.map(({ icon: Icon, number, label }) => (
          <div key={label}>
            <span className="p-stat-icon">
              <Icon size={18} aria-hidden="true" />
            </span>
            <dt>{label}</dt>
            <dd>{number}</dd>
          </div>
        ))}
      </dl>

      <div className="p-dashboard-grid">
        <div className="p-card p-report">
          <div className="p-card-head">
            <h2>Avance por categoría tecnológica</h2>
            <button className="p-text-button" onClick={() => navigate('learning')}>
              Ver catálogo
            </button>
          </div>
          <div className="p-competency-list">
            {courseCategories.map((cat) => {
              const Icon = categoryIcons[cat.id]
              const inCategory = workspace.courses.filter((c) => c.category === cat.id)
              const totals = inCategory.reduce(
                (acc, c) => ({
                  total: acc.total + courseLessons(c.id).length,
                  done: acc.done + completedLessonCount(c.id, workspace.progress[c.id]),
                }),
                { total: 0, done: 0 },
              )
              const pct = totals.total > 0 ? Math.round((totals.done / totals.total) * 100) : 0
              return (
                <div key={cat.id} className="p-competency-item">
                  <div className="p-competency-top">
                    <span className="p-competency-name">
                      <Icon size={15} aria-hidden="true" />
                      <strong>{cat.label}</strong>
                    </span>
                    <small>
                      {inCategory.length} {inCategory.length === 1 ? 'curso' : 'cursos'} · {totals.done}/{totals.total}
                    </small>
                  </div>
                  <progress aria-label={`Dominio en ${cat.label}`} value={pct} max={100} />
                </div>
              )
            })}
          </div>
        </div>

        <div className="p-card p-report">
          <div className="p-card-head">
            <h2>Avisos y actividad</h2>
            <button className="p-text-button" onClick={() => navigate('notices')}>
              Ver avisos
            </button>
          </div>
          {workspace.notices.slice(0, 2).map((item) => (
            <div className="p-audit-row" key={item.id}>
              <Megaphone size={16} />
              <div className="p-list-copy">
                <strong>{item.title}</strong>
                <small>{item.author}</small>
              </div>
              <time dateTime={item.date}>{formatDate(item.date)}</time>
            </div>
          ))}
          {recent.slice(0, 2).map((item) => (
            <div className="p-audit-row" key={item.id}>
              <ActivityIcon size={16} />
              <div className="p-list-copy">
                <strong>{item.action}</strong>
                <small>{item.actor}</small>
              </div>
              <time dateTime={item.date}>{formatDate(item.date)}</time>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
