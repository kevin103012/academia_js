import { useEffect, useRef, useState } from 'react'
import {
  Award,
  BookOpen,
  Check,
  ChevronRight,
  Clock3,
  Download,
  GraduationCap,
  LockKeyhole,
  NotebookPen,
  Printer,
} from 'lucide-react'
import { completedLessonCount, courseMaterial, isOrientation, passingScore } from '../../services'
import type { LearningEntry } from '../../types/learning'
import { courseCategories, type Course } from '../../types/workspace'
import { dateKey, formatDate } from '../../utils/date'
import { CourseAssessment, type Attempt } from './CourseAssessment'
import { LessonWorkbench } from './LessonWorkbench'
import { certificateTitle, courseIcon, downloadCertificate } from './learningHelpers'

type CourseSection = 'syllabus' | 'lesson' | 'assessment' | 'certificate'

export type CourseDetailProps = {
  course: Course
  entry: LearningEntry
  canLearn: boolean
  studentName: string
  startAtCertificate: boolean
  onBack: () => void
  onProgress: (entry: LearningEntry) => void
  notify: (message: string) => void
}

export function CourseDetail({
  course,
  entry,
  canLearn,
  studentName,
  startAtCertificate,
  onBack,
  onProgress,
  notify,
}: CourseDetailProps) {
  const { lessons, questions } = courseMaterial(course.id)
  const completed = completedLessonCount(course.id, entry)
  const readyForAssessment = entry.enrolled && completed === lessons.length
  const certifiedAt = canLearn ? entry.certifiedAt : undefined
  const earnedCertificate = Boolean(certifiedAt)
  const [section, setSection] = useState<CourseSection>(
    startAtCertificate && earnedCertificate ? 'certificate' : 'syllabus',
  )
  const [lessonId, setLessonId] = useState(lessons[0].id)
  const [attempt, setAttempt] = useState<Attempt | null>(null)
  const heading = useRef<HTMLHeadingElement>(null)
  const lesson = lessons.find((item) => item.id === lessonId) ?? lessons[0]
  const lessonIndex = lessons.indexOf(lesson)
  const lessonDone = entry.lessons.includes(lesson.id)
  const Icon = courseIcon(course.id)

  useEffect(() => {
    heading.current?.focus()
  }, [section, lessonId])

  function openLesson(nextLessonId: string) {
    if (canLearn && !entry.enrolled) return
    setLessonId(nextLessonId)
    setSection('lesson')
  }

  function enroll() {
    if (!canLearn || entry.enrolled) return
    onProgress({ ...entry, enrolled: true })
    notify(`Matrícula registrada en ${course.name}.`)
  }

  function completeLesson() {
    if (!canLearn || !entry.enrolled || lessonDone) return
    onProgress({ ...entry, lessons: [...entry.lessons, lesson.id] })
    notify('Lección completada. Tu avance se guardó.')
  }

  function handleScoreSaved(score: number) {
    onProgress({ ...entry, score: Math.max(entry.score ?? 0, score) })
    notify(`Evaluación guardada. Obtuviste ${score}%.`)
  }

  function issueCertificate() {
    if (!canLearn || !readyForAssessment || (entry.score ?? 0) < passingScore) return
    if (!entry.certifiedAt) {
      onProgress({ ...entry, certifiedAt: dateKey() })
      notify('Certificado de demostración emitido.')
    }
    setSection('certificate')
  }

  const totalMinutes = lessons.reduce((total, item) => total + item.minutes, 0)
  const categoryLabel = courseCategories.find((c) => c.id === course.category)?.shortLabel
  const contentHeading =
    section === 'syllabus'
      ? 'Plan de estudio'
      : section === 'lesson'
        ? lesson.title
        : section === 'assessment'
          ? 'Evaluación del curso'
          : 'Tu certificado'

  return (
    <section className="learn-root" aria-labelledby="learn-course-heading">
      <header className="learn-detail-header">
        <button type="button" className="learn-back" onClick={onBack}>
          <ChevronRight aria-hidden="true" size={16} /> Catálogo
        </button>
        <span className={`learn-course-icon learn-tone-${course.color}`}>
          <Icon aria-hidden="true" size={22} strokeWidth={1.6} />
        </span>
        <div>
          <h1 id="learn-course-heading">{course.name}</h1>
          <p>
            {categoryLabel && <>{categoryLabel} · </>}
            {course.description} · {course.group} · {course.teacher}
          </p>
        </div>
        {section === 'lesson' && (
          <div className="learn-step-pills" role="navigation" aria-label="Navegación rápida de lecciones">
            <button type="button" className="ai-mini-btn tone-pill" onClick={() => setSection('syllabus')}>
              Temario
            </button>
            {lessons.map((item, idx) => (
              <button
                key={item.id}
                type="button"
                className={`learn-step-tab ${item.id === lesson.id ? 'tone-accent' : entry.lessons.includes(item.id) ? 'tone-soft-accent' : 'tone-pill'}`}
                onClick={() => openLesson(item.id)}
              >
                {idx + 1}
              </button>
            ))}
          </div>
        )}
      </header>

      {section === 'lesson' ? (
        <div className="learn-split-workspace">
          <div className="learn-panel learn-study">
            <h2 ref={heading} tabIndex={-1}>
              {contentHeading}
            </h2>
            <div className="learn-material-meta">
              <BookOpen aria-hidden="true" size={15} /> Lección {lessonIndex + 1} de {lessons.length}{' '}
              <Clock3 aria-hidden="true" size={15} /> {lesson.minutes} min
              {lessonDone && (
                <span className="p-badge tone-soft-accent">
                  <Check size={13} aria-hidden="true" /> Completada
                </span>
              )}
            </div>

            <div className="learn-reading">
              {lesson.reading.map((paragraph) => (
                <p key={paragraph}>{paragraph}</p>
              ))}

              {lesson.keySteps && lesson.keySteps.length > 0 && (
                <ol className="learn-key-steps">
                  {lesson.keySteps.map((step) => (
                    <li key={step}>{step}</li>
                  ))}
                </ol>
              )}

              {lesson.formulaOrCode && (
                <pre className="learn-code-block theme-dark">
                  <code>{lesson.formulaOrCode}</code>
                </pre>
              )}

              <div className="learn-exercise">
                <h3>
                  <NotebookPen aria-hidden="true" size={16} /> Reto en el laboratorio
                </h3>
                <p>{lesson.exercise}</p>
              </div>
            </div>

            <div className="learn-lesson-actions">
              <button className="learn-action learn-action-outline" type="button" onClick={() => setSection('syllabus')}>
                Ver plan de estudio
              </button>
              {canLearn && !lessonDone && (
                <button className="learn-action" type="button" onClick={completeLesson}>
                  <Check aria-hidden="true" size={16} /> Marcar como completada
                </button>
              )}
              {lessonIndex < lessons.length - 1 && (!canLearn || lessonDone) && (
                <button
                  className="learn-action"
                  type="button"
                  onClick={() => openLesson(lessons[lessonIndex + 1].id)}
                >
                  Siguiente lección
                </button>
              )}
              {canLearn && lessonDone && lessonIndex === lessons.length - 1 && readyForAssessment && (
                <button className="learn-action" type="button" onClick={() => setSection('assessment')}>
                  Ir a la evaluación
                </button>
              )}
            </div>
          </div>

          <LessonWorkbench
            key={lesson.id}
            lessonId={lesson.id}
            labKind={lesson.labKind ?? 'architecture'}
            goal={lesson.labGoal}
            hint={lesson.labHint}
            canLearn={canLearn}
            lessonDone={lessonDone}
            onCompleteLesson={completeLesson}
          />
        </div>
      ) : (
        <div className="learn-detail-grid">
          <div className="learn-panel learn-study">
            <h2 ref={heading} tabIndex={-1}>
              {contentHeading}
            </h2>
            {section === 'syllabus' && (
              <>
                <div className="learn-material-meta">
                  <BookOpen aria-hidden="true" size={16} /> {lessons.length} lecciones <Clock3 aria-hidden="true" size={16} />{' '}
                  {totalMinutes} min
                </div>
                {isOrientation(course.id) && (
                  <p className="learn-info">
                    Este curso incluye una guía general de inducción mientras se prepara su material específico.
                  </p>
                )}
                <ol className="learn-syllabus">
                  {lessons.map((item, index) => {
                    const completedLesson = entry.lessons.includes(item.id)
                    return (
                      <li key={item.id}>
                        <button
                          type="button"
                          onClick={() => openLesson(item.id)}
                          disabled={canLearn && !entry.enrolled}
                        >
                          <span className="learn-step">
                            {completedLesson ? <Check aria-label="Completada" size={16} /> : index + 1}
                          </span>
                          <span>
                            <strong>{item.title}</strong>
                            <span>{item.summary}</span>
                          </span>
                          <span className="learn-step-time">{item.minutes} min</span>
                          {canLearn && !entry.enrolled ? (
                            <LockKeyhole aria-hidden="true" size={16} />
                          ) : (
                            <ChevronRight aria-hidden="true" size={17} />
                          )}
                        </button>
                      </li>
                    )
                  })}
                </ol>
              </>
            )}
            {section === 'assessment' && readyForAssessment && (
              <CourseAssessment
                questions={questions}
                bestScore={entry.score}
                earnedCertificate={earnedCertificate}
                canLearn={canLearn}
                readyForAssessment={readyForAssessment}
                onScoreSaved={handleScoreSaved}
                onIssueCertificate={issueCertificate}
                onRetryFocus={() => heading.current?.focus()}
                attempt={attempt}
                onAttemptChange={setAttempt}
              />
            )}
            {section === 'certificate' && certifiedAt && (
              <>
                <article className="learn-certificate">
                  <Award aria-hidden="true" size={41} strokeWidth={1.3} />
                  <h3>Certificado de demostración</h3>
                  <p>
                    Se otorga a <strong>{studentName}</strong> por completar
                  </p>
                  <strong className="learn-certificate-course">{certificateTitle(course)}</strong>
                  <p>
                    {formatDate(certifiedAt, { dateStyle: 'long' })} <span aria-hidden="true">·</span> Resultado{' '}
                    {entry.score}%
                  </p>
                  <small>Documento de práctica sin validez académica.</small>
                </article>
                <div className="learn-lesson-actions">
                  <button
                    className="learn-action"
                    type="button"
                    onClick={() => downloadCertificate(course, entry, studentName)}
                  >
                    <Download aria-hidden="true" size={17} /> Descargar certificado
                  </button>
                  <button className="learn-action learn-action-outline" type="button" onClick={() => window.print()}>
                    <Printer aria-hidden="true" size={17} /> Imprimir
                  </button>
                </div>
              </>
            )}
          </div>
          <aside className="learn-panel learn-summary" aria-label="Acciones del curso">
            <h2>
              <GraduationCap aria-hidden="true" size={22} strokeWidth={1.6} /> {canLearn ? 'Tu recorrido' : 'Vista de curso'}
            </h2>
            {canLearn && entry.enrolled ? (
              <>
                <div className="learn-prog-title">
                  <span>Lecciones completadas</span>
                  <strong>
                    {completed}/{lessons.length}
                  </strong>
                </div>
                <progress value={completed} max={lessons.length} aria-label="Lecciones completadas" />
              </>
            ) : (
              <p>
                {canLearn
                  ? 'Matricúlate para abrir el contenido y guardar tu avance.'
                  : 'Consulta el contenido que se muestra en el plan de estudio.'}
              </p>
            )}
            {canLearn && !entry.enrolled && (
              <button className="learn-action" type="button" onClick={enroll}>
                Matricularme
              </button>
            )}
            {canLearn && entry.enrolled && (
              <div className="learn-summary-actions">
                <button className="learn-action learn-action-outline" type="button" onClick={() => setSection('syllabus')}>
                  Ver lecciones
                </button>
                <button
                  className="learn-action learn-action-outline"
                  type="button"
                  disabled={!readyForAssessment}
                  onClick={() => setSection('assessment')}
                >
                  {!readyForAssessment && <LockKeyhole aria-hidden="true" size={15} />} Ir a evaluación
                </button>
                {!readyForAssessment && (
                  <small>La evaluación se habilita cuando completas todas las lecciones.</small>
                )}
                {entry.score !== undefined && (
                  <p>
                    Mejor resultado <strong>{entry.score}%</strong>
                  </p>
                )}
                {readyForAssessment &&
                  (entry.score ?? 0) >= passingScore &&
                  section !== 'certificate' &&
                  !(section === 'assessment' && attempt) && (
                    <button className="learn-action" type="button" onClick={issueCertificate}>
                      <Award aria-hidden="true" size={17} /> {earnedCertificate ? 'Ver certificado' : 'Emitir certificado'}
                    </button>
                  )}
              </div>
            )}
          </aside>
        </div>
      )}
    </section>
  )
}
