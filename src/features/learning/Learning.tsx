import { useEffect, useRef, useState } from 'react'
import { Award, BookOpen, ChevronRight, Search } from 'lucide-react'
import { SegmentedControl } from '../../components/ui/SegmentedControl'
import { completedLessonCount, courseMaterial } from '../../services'
import type { LearningEntry, LearningProgress } from '../../types/learning'
import type { Course } from '../../types/workspace'
import { formatDate } from '../../utils/date'
import { normalizeSearchText } from '../../utils/text'
import { CourseDetail } from './CourseDetail'
import { courseIcon } from './learningHelpers'
import '../../styles/learning.css'

type LearningProps = {
  courses: Course[]
  progress: LearningProgress
  onProgress: (courseId: string, entry: LearningEntry) => void
  canLearn: boolean
  studentName: string
  initialCourse?: string
  notify: (message: string) => void
}

type Collection = 'catalog' | 'enrolled' | 'certificates'

const blankProgress: LearningEntry = { enrolled: false, lessons: [] }
const collections: { value: Collection; label: string }[] = [
  { value: 'catalog', label: 'Todos los cursos' },
  { value: 'enrolled', label: 'Mis cursos' },
  { value: 'certificates', label: 'Certificados' },
]

export default function Learning({
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
  const [query, setQuery] = useState('')
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

  if (course) {
    return (
      <CourseDetail
        key={course.id}
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
    const matchesQuery = normalizeSearchText(`${item.name} ${item.teacher} ${item.group}`).includes(normalizedQuery)
    return matchesCollection && matchesQuery
  })

  return (
    <section className="learn-root" aria-labelledby="learn-catalog-heading">
      <header className="learn-header">
        <div>
          <h1 ref={catalogHeading} tabIndex={-1} id="learn-catalog-heading">
            Catálogo de cursos
          </h1>
          <p>
            {canLearn
              ? 'Elige un curso, completa sus lecciones y comprueba lo que aprendiste.'
              : 'Explora los contenidos y el plan de estudio de cada curso.'}
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
              placeholder="Buscar cursos"
              aria-label="Buscar cursos"
            />
          </label>
        </div>
      </header>
      {matching.length === 0 && (
        <div className="learn-empty">
          {collection === 'certificates' ? <Award aria-hidden="true" /> : <BookOpen aria-hidden="true" />}
          <h2>
            {normalizedQuery
              ? 'No encontramos cursos'
              : collection === 'certificates'
                ? 'Aún no tienes certificados'
                : 'Aún no hay cursos aquí'}
          </h2>
          <p>
            {normalizedQuery
              ? 'Prueba otro nombre o borra la búsqueda.'
              : collection === 'certificates'
                ? 'Completa y aprueba un curso para emitir tu certificado de demostración.'
                : 'Explora el catálogo para elegir un recorrido.'}
          </p>
          {normalizedQuery ? (
            <button className="learn-action learn-action-outline" type="button" onClick={() => setQuery('')}>
              Borrar búsqueda
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
      <ul className="learn-catalog">
        {matching.map((item) => {
          const Icon = courseIcon(item.id)
          const entry = canLearn ? progress[item.id] : undefined
          const lessons = courseMaterial(item.id).lessons
          const completed = completedLessonCount(item.id, entry)
          return (
            <li key={item.id}>
              <button
                type="button"
                className="learn-course-link"
                onClick={() => setSelection({ courseId: item.id, source: initialCourse })}
                aria-label={collection === 'certificates' ? `Ver certificado de ${item.name}` : `Abrir ${item.name}`}
              >
                <span className={`learn-course-icon learn-tone-${item.color}`}>
                  <Icon aria-hidden="true" size={25} strokeWidth={1.65} />
                </span>
                <span className="learn-course-text">
                  <strong>{item.name}</strong>
                  <span className="learn-course-description">{item.description}</span>
                  <span className="learn-course-meta">
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
                    <span>{lessons.length} lecciones</span>
                  )}
                </span>
                <ChevronRight className="learn-catalog-arrow" aria-hidden="true" size={19} />
              </button>
            </li>
          )
        })}
      </ul>
    </section>
  )
}
