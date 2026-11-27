import { useEffect, useRef, useState } from 'react'
import { Award, BookOpen, CalendarDays, ChevronLeft, ChevronRight, Clock3, Search } from 'lucide-react'
import { SegmentedControl } from '../../components/ui/SegmentedControl'
import { completedLessonCount, courseMaterial } from '../../services'
import type { DemoUser } from '../../types/auth'
import type { LearningEntry, LearningProgress } from '../../types/learning'
import { courseCategories, type Commit, type Course, type CourseCategoryId, type Workspace } from '../../types/workspace'
import { formatDate } from '../../utils/date'
import { normalizeSearchText } from '../../utils/text'
import { CourseDetail } from './CourseDetail'
import { courseIcon } from './learningHelpers'
import '../../styles/learning.css'

type LearningProps = {
  user?: DemoUser
  workspace?: Workspace
  commit?: Commit
  courses: Course[]
  progress: LearningProgress
  onProgress: (courseId: string, entry: LearningEntry) => void
  canLearn: boolean
  studentName: string
  initialCourse?: string
  notify: (message: string) => void
}

type Collection = 'catalog' | 'enrolled' | 'certificates'

const COURSES_PER_PAGE = 7
const blankProgress: LearningEntry = { enrolled: false, lessons: [], watchedVideos: [] }
const collections: { value: Collection; label: string }[] = [
  { value: 'catalog', label: 'Todos los cursos' },
  { value: 'enrolled', label: 'Mis cursos' },
  { value: 'certificates', label: 'Certificados' },
]

export default function Learning({
  user,
  workspace,
  commit,
  courses,
  progress,
  onProgress,
  canLearn,
  studentName,
  initialCourse,
  notify,
}: LearningProps) {
  const [selection, setSelection] = useState(() => ({ courseId: initialCourse, source: initialCourse }))
  const [collection, setCollection] = useState<Collection>('catalog')
  const [categoryFilter, setCategoryFilter] = useState<'all' | CourseCategoryId>('all')
  const [query, setQuery] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const activeId = selection.source === initialCourse ? selection.courseId : initialCourse
  const course = courses.find((item) => item.id === activeId)
  const catalogHeading = useRef<HTMLHeadingElement>(null)
  const returnToCatalog = useRef(false)

  useEffect(() => {
    if (!course && returnToCatalog.current) {
      catalogHeading.current?.focus()
      returnToCatalog.current = false
    }
  }, [course])

  useEffect(() => {
    setCurrentPage(1)
  }, [collection, categoryFilter, query])

  if (course) {
    return (
      <CourseDetail
        key={course.id}
        user={user}
        workspace={workspace}
        commit={commit}
        course={course}
        entry={canLearn ? progress[course.id] ?? blankProgress : blankProgress}
        canLearn={canLearn}
        studentName={studentName}
        startAtCertificate={collection === 'certificates'}
        onBack={() => {
          returnToCatalog.current = true
          setSelection({ courseId: undefined, source: initialCourse })
        }}
        onProgress={(entry) => onProgress(course.id, entry)}
        notify={notify}
      />
    )
  }

  const normalizedQuery = normalizeSearchText(query.trim())
  const matching = courses.filter((item) => {
    const matchesCollection =
      !canLearn ||
      collection === 'catalog' ||
      (collection === 'enrolled' ? progress[item.id]?.enrolled : progress[item.id]?.certifiedAt)
    const matchesCategory = categoryFilter === 'all' || item.category === categoryFilter
    const catMeta = courseCategories.find((c) => c.id === item.category)
    const matchesQuery = normalizeSearchText(
      `${item.name} ${item.teacher} ${item.group} ${catMeta?.label ?? ''}`,
    ).includes(normalizedQuery)
    return matchesCollection && matchesCategory && matchesQuery
  })

  const totalPages = Math.max(1, Math.ceil(matching.length / COURSES_PER_PAGE))
  const safePage = Math.min(currentPage, totalPages)
  const startIdx = (safePage - 1) * COURSES_PER_PAGE
  const paginatedCourses = matching.slice(startIdx, startIdx + COURSES_PER_PAGE)
  const showAttendanceAverage = user?.role === 'coordinator' || user?.role === 'admin' || user?.role === 'teacher'

  function courseAttendanceAverage(courseId: string): string | null {
    const rows = (workspace?.attendance ?? []).filter((a) => a.courseId === courseId)
    if (!rows.length) return null
    const attended = rows.filter((a) => a.status === 'Presente' || a.status === 'Justificada').length
    return `${Math.round((attended / rows.length) * 100)}%`
  }

  return (
    <section className="learn-root" aria-labelledby="learn-catalog-heading">
      <header className="learn-header">
        <div>
          <h1 ref={catalogHeading} tabIndex={-1} id="learn-catalog-heading">
            Catálogo de cursos
          </h1>
          <p>
            {canLearn
              ? 'Revisa horarios, fechas y método de evaluación antes de matricularte. Cada lección incluye video y ejercicios.'
              : 'Explora los cursos, sus horarios, fechas de evaluación, promedio de asistencia y contenido editable.'}
          </p>
        </div>
        <div className="learn-toolbar">
          {canLearn && (
            <SegmentedControl
              className="learn-filters"
              label="Filtrar catálogo"
              options={collections}
              value={collection}
              onChange={setCollection}
            />
          )}
          <label className="learn-search">
            <Search aria-hidden="true" size={16} />
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Buscar cursos o categoría"
              aria-label="Buscar cursos o categoría"
            />
          </label>
        </div>
      </header>

      <div className="learn-category-bar" role="group" aria-label="Categorías académicas">
        <button
          type="button"
          className={`learn-category-pill ${categoryFilter === 'all' ? 'tone-soft-accent' : 'tone-pill'}`}
          aria-pressed={categoryFilter === 'all'}
          onClick={() => setCategoryFilter('all')}
        >
          Todas ({courses.length})
        </button>
        {courseCategories.map((cat) => {
          const count = courses.filter((item) => item.category === cat.id).length
          return (
            <button
              key={cat.id}
              type="button"
              className={`learn-category-pill ${categoryFilter === cat.id ? 'tone-soft-accent' : 'tone-pill'}`}
              aria-pressed={categoryFilter === cat.id}
              onClick={() => setCategoryFilter(cat.id)}
            >
              {cat.shortLabel} ({count})
            </button>
          )
        })}
      </div>

      {matching.length === 0 && (
        <div className="learn-empty">
          {collection === 'certificates' ? <Award aria-hidden="true" /> : <BookOpen aria-hidden="true" />}
          <h2>
            {normalizedQuery || categoryFilter !== 'all'
              ? 'No encontramos cursos en esta categoría'
              : collection === 'certificates'
                ? 'Aún no tienes certificados'
                : 'Aún no hay cursos aquí'}
          </h2>
          <p>
            {normalizedQuery || categoryFilter !== 'all'
              ? 'Prueba otra categoría o limpia el buscador.'
              : collection === 'certificates'
                ? 'Completa y aprueba un curso para emitir tu certificado de demostración.'
                : 'Explora el catálogo para elegir un recorrido.'}
          </p>
          {normalizedQuery || categoryFilter !== 'all' ? (
            <button
              className="learn-action learn-action-outline"
              type="button"
              onClick={() => {
                setQuery('')
                setCategoryFilter('all')
              }}
            >
              Ver todas las categorías
            </button>
          ) : (
            canLearn &&
            collection !== 'catalog' && (
              <button className="learn-action learn-action-outline" type="button" onClick={() => setCollection('catalog')}>
                Explorar catálogo
              </button>
            )
          )}
        </div>
      )}

      {paginatedCourses.length > 0 && (
        <>
          <ul className="learn-catalog">
            {paginatedCourses.map((item) => {
              const Icon = courseIcon(item.id)
              const entry = canLearn ? progress[item.id] : undefined
              const lessons = courseMaterial(item.id).lessons
              const completed = completedLessonCount(item.id, entry)
              const categoryMeta = courseCategories.find((c) => c.id === item.category)
              const avgAtt = showAttendanceAverage ? courseAttendanceAverage(item.id) : null
              return (
                <li key={item.id}>
                  <button
                    type="button"
                    className="learn-course-link"
                    onClick={() => setSelection({ courseId: item.id, source: initialCourse })}
                    aria-label={collection === 'certificates' ? `Ver certificado de ${item.name}` : `Abrir ${item.name}`}
                  >
                    <span className={`learn-course-icon learn-tone-${item.color}`}>
                      <Icon aria-hidden="true" size={24} strokeWidth={1.65} />
                    </span>
                    <span className="learn-course-text">
                      <span className="learn-course-headline">
                        <strong>{item.name}</strong>
                        {categoryMeta && <span className="p-badge tone-soft-accent">{categoryMeta.shortLabel}</span>}
                        {item.durationWeeks && <span className="p-badge">{item.durationWeeks} sem</span>}
                        {avgAtt && <span className="p-badge">Asistencia {avgAtt}</span>}
                      </span>
                      <span className="learn-course-description">{item.description}</span>
                      <span className="learn-course-meta">
                        <CalendarDays size={13} aria-hidden="true" />{' '}
                        {item.startDate && item.endDate
                          ? `${formatDate(item.startDate)} — ${formatDate(item.endDate)}`
                          : 'Periodo 2026-II'}{' '}
                        <span aria-hidden="true">·</span> <Clock3 size={13} aria-hidden="true" />{' '}
                        {item.scheduleSummary ?? 'Horario por confirmar'} <span aria-hidden="true">·</span>{' '}
                        {item.group} <span aria-hidden="true">·</span> {item.teacher}
                      </span>
                    </span>
                    <span className="learn-course-status">
                      {collection === 'certificates' && entry?.certifiedAt ? (
                        <span>
                          <Award aria-hidden="true" size={15} /> {formatDate(entry.certifiedAt)}
                        </span>
                      ) : entry?.enrolled ? (
                        <>
                          <span>
                            {completed} de {lessons.length} lecciones
                          </span>
                          <progress value={completed} max={lessons.length} aria-label={`Progreso de ${item.name}`} />
                        </>
                      ) : (
                        <span>{lessons.length} {lessons.length === 1 ? 'lección' : 'lecciones'} · Ver info</span>
                      )}
                    </span>
                    <ChevronRight className="learn-catalog-arrow" aria-hidden="true" size={19} />
                  </button>
                </li>
              )
            })}
          </ul>

          <nav className="l-pagination-bar" aria-label="Paginación de cursos">
            <span className="l-pagination-info">
              Mostrando {startIdx + 1}–{Math.min(startIdx + COURSES_PER_PAGE, matching.length)} de {matching.length} cursos (máx. {COURSES_PER_PAGE} por página)
            </span>
            {totalPages > 1 && (
              <div className="l-pagination-controls">
                <button
                  type="button"
                  className="ai-mini-btn tone-pill"
                  disabled={safePage <= 1}
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                >
                  <ChevronLeft size={15} aria-hidden="true" /> Anterior
                </button>
                {Array.from({ length: totalPages }, (_, index) => index + 1).map((pageNum) => (
                  <button
                    key={pageNum}
                    type="button"
                    className={`learn-step-tab ${safePage === pageNum ? 'tone-accent' : 'tone-pill'}`}
                    aria-current={safePage === pageNum ? 'page' : undefined}
                    onClick={() => setCurrentPage(pageNum)}
                  >
                    {pageNum}
                  </button>
                ))}
                <button
                  type="button"
                  className="ai-mini-btn tone-pill"
                  disabled={safePage >= totalPages}
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                >
                  Siguiente <ChevronRight size={15} aria-hidden="true" />
                </button>
              </div>
            )}
          </nav>
        </>
      )}
    </section>
  )
}
