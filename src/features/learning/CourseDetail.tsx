import { useEffect, useRef, useState } from 'react'
import {
  Award,
  BookOpen,
  CalendarDays,
  Check,
  ChevronRight,
  ClipboardCheck,
  Clock3,
  Download,
  Edit3,
  Film,
  GraduationCap,
  HelpCircle,
  LockKeyhole,
  NotebookPen,
  Printer,
  UsersRound,
} from 'lucide-react'
import { completedLessonCount, courseMaterial, isOrientation, learningService, passingScore } from '../../services'
import type { DemoUser } from '../../types/auth'
import type { CourseMaterial, LearningEntry } from '../../types/learning'
import { courseCategories, type Commit, type Course, type Workspace } from '../../types/workspace'
import { dateKey, formatDate } from '../../utils/date'
import { teachesCourse } from '../../utils/campusAccess'
import { CourseAssessment, type Attempt } from './CourseAssessment'
import { CourseAttendancePanel } from './CourseAttendancePanel'
import { CourseTeacherEditor } from './CourseTeacherEditor'
import { LessonVideoStage } from './LessonVideoStage'
import { LessonWorkbench } from './LessonWorkbench'
import { certificateTitle, courseIcon, downloadCertificate } from './learningHelpers'

type CourseSection = 'syllabus' | 'lesson' | 'attendance' | 'editor' | 'assessment' | 'certificate'

export type CourseDetailProps = {
  user?: DemoUser
  workspace?: Workspace
  commit?: Commit
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
  user,
  workspace,
  commit,
  course,
  entry,
  canLearn,
  studentName,
  startAtCertificate,
  onBack,
  onProgress,
  notify,
}: CourseDetailProps) {
  const [material, setMaterial] = useState<CourseMaterial>(() => courseMaterial(course.id))
  const { lessons, questions } = material
  const completed = completedLessonCount(course.id, entry)
  const readyForAssessment = entry.enrolled && completed === lessons.length
  const certifiedAt = canLearn ? entry.certifiedAt : undefined
  const earnedCertificate = Boolean(certifiedAt)
  const [section, setSection] = useState<CourseSection>(
    startAtCertificate && earnedCertificate ? 'certificate' : 'syllabus',
  )
  const [lessonId, setLessonId] = useState(lessons[0]?.id ?? '')
  const [attempt, setAttempt] = useState<Attempt | null>(null)
  const [exerciseAnswers, setExerciseAnswers] = useState<Record<string, number>>({})
  const heading = useRef<HTMLHeadingElement>(null)
  const lesson = lessons.find((item) => item.id === lessonId) ?? lessons[0]
  const lessonIndex = lessons.indexOf(lesson)
  const lessonDone = entry.lessons.includes(lesson.id)
  const videoWatched = Boolean(entry.watchedVideos?.includes(lesson.id))
  const Icon = courseIcon(course.id)
  const canEditContent = Boolean(user && (user.role === 'admin' || teachesCourse(user, course)))

  useEffect(() => {
    let active = true
    learningService.hydrateCourseMaterialFromSupabase(course.id).then((hydrated) => {
      if (active) setMaterial(hydrated)
    })
    return () => {
      active = false
    }
  }, [course.id])

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
    onProgress({ ...entry, enrolled: true, watchedVideos: entry.watchedVideos ?? [] })
    notify(`Matrícula registrada en ${course.name}.`)
  }

  function markVideoWatched() {
    if (!canLearn || !entry.enrolled || videoWatched) return
    const current = entry.watchedVideos ?? []
    onProgress({ ...entry, watchedVideos: [...current, lesson.id] })
    notify('Ya puedes avanzar con la teoría y los ejercicios.')
  }

  function completeLesson() {
    if (!canLearn || !entry.enrolled || lessonDone || !videoWatched) return
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
  const courseAtt = (workspace?.attendance ?? []).filter((a) => a.courseId === course.id)
  const attPresent = courseAtt.filter((a) => a.status === 'Presente' || a.status === 'Justificada').length
  const avgAttendance = courseAtt.length ? Math.round((attPresent / courseAtt.length) * 100) : 100

  const contentHeading =
    section === 'syllabus'
      ? 'Plan de estudio y ficha del curso'
      : section === 'lesson'
        ? lesson.title
        : section === 'attendance'
          ? 'Asistencia del curso'
          : section === 'editor'
            ? 'Edición docente de lecciones y evaluación'
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

        <div className="learn-step-pills" role="navigation" aria-label="Secciones del curso">
          <button
            type="button"
            className={`ai-mini-btn ${section === 'syllabus' ? 'tone-accent' : 'tone-pill'}`}
            onClick={() => setSection('syllabus')}
          >
            Temario
          </button>
          {workspace && user && commit && (
            <button
              type="button"
              className={`ai-mini-btn ${section === 'attendance' ? 'tone-accent' : 'tone-pill'}`}
              onClick={() => setSection('attendance')}
            >
              <ClipboardCheck size={14} aria-hidden="true" /> Asistencia
            </button>
          )}
          {canEditContent && (
            <button
              type="button"
              className={`ai-mini-btn ${section === 'editor' ? 'tone-accent' : 'tone-pill'}`}
              onClick={() => setSection('editor')}
            >
              <Edit3 size={14} aria-hidden="true" /> Editar curso
            </button>
          )}
          {section === 'lesson' &&
            lessons.map((item, idx) => (
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
      </header>

      {section === 'editor' && canEditContent ? (
        <CourseTeacherEditor
          course={course}
          material={material}
          commit={commit}
          onMaterialUpdated={(next) => {
            setMaterial(next)
            if (!next.lessons.some((l) => l.id === lessonId) && next.lessons[0]) {
              setLessonId(next.lessons[0].id)
            }
          }}
          notify={notify}
        />
      ) : section === 'attendance' && workspace && user && commit ? (
        <div className="learn-panel">
          <CourseAttendancePanel course={course} user={user} workspace={workspace} commit={commit} notify={notify} />
        </div>
      ) : section === 'lesson' ? (
        <div className="l-lesson-stack">
          <LessonVideoStage
            lesson={lesson}
            courseName={course.name}
            watched={videoWatched}
            canLearn={canLearn}
            onMarkWatched={markVideoWatched}
          />

          <div className="learn-split-workspace">
            <div className="learn-panel learn-study">
              <h2 ref={heading} tabIndex={-1}>
                {contentHeading}
              </h2>
              <div className="learn-material-meta">
                <BookOpen aria-hidden="true" size={15} /> Lección {lessonIndex + 1} de {lessons.length}{' '}
                <Clock3 aria-hidden="true" size={15} /> {lesson.minutes} min
                {videoWatched && (
                  <span className="p-badge">
                    <Film size={13} aria-hidden="true" /> Video visto
                  </span>
                )}
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

                {lesson.sublessons && lesson.sublessons.length > 0 && (
                  <div className="l-sublessons">
                    <h3>Sublecciones del tema</h3>
                    {lesson.sublessons.map((sub) => (
                      <div key={sub.id} className="l-sublesson-card">
                        <strong>{sub.title}</strong>
                        <p>{sub.content}</p>
                      </div>
                    ))}
                  </div>
                )}

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
                    <NotebookPen aria-hidden="true" size={16} /> Paso 2 · Ejercicio enfocado en el tema
                  </h3>
                  <p>{lesson.exercise}</p>
                </div>

                {lesson.exercises && lesson.exercises.length > 0 && (
                  <div className="l-topic-exercises">
                    <h3>
                      <HelpCircle size={15} aria-hidden="true" /> Comprobación rápida del tema
                    </h3>
                    {lesson.exercises.map((ex) => {
                      const picked = exerciseAnswers[ex.id]
                      const isCorrect = picked === ex.correctIndex
                      return (
                        <div key={ex.id} className="l-topic-exercise-card">
                          <strong>{ex.question}</strong>
                          <div className="l-topic-options">
                            {ex.options.map((opt, optIdx) => (
                              <button
                                key={opt}
                                type="button"
                                className={`ai-mini-btn ${picked === optIdx ? 'tone-accent' : 'tone-pill'}`}
                                onClick={() => setExerciseAnswers((prev) => ({ ...prev, [ex.id]: optIdx }))}
                              >
                                {opt}
                              </button>
                            ))}
                          </div>
                          {picked !== undefined && (
                            <p className={isCorrect ? 'l-ex-ok' : 'l-ex-warn'}>
                              {isCorrect ? `Correcto: ${ex.explanation}` : 'Vuelve a revisar el video y la teoría para intentarlo de nuevo.'}
                            </p>
                          )}
                        </div>
                      )
                    })}
                  </div>
                )}
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
        </div>
      ) : (
        <div className="learn-detail-grid">
          <div className="learn-panel learn-study">
            <h2 ref={heading} tabIndex={-1}>
              {contentHeading}
            </h2>
            {section === 'syllabus' && (
              <>
                <div className="l-course-facts-grid">
                  <div>
                    <span>Fechas de clases</span>
                    <strong>
                      {course.startDate && course.endDate
                        ? `${formatDate(course.startDate)} — ${formatDate(course.endDate)}`
                        : 'Periodo 2026-II'}
                    </strong>
                  </div>
                  <div>
                    <span>Horario de clases</span>
                    <strong>{course.scheduleSummary ?? 'Por confirmar'}</strong>
                  </div>
                  <div>
                    <span>Duración y docente</span>
                    <strong>
                      {course.durationWeeks ?? 16} semanas · {course.teacher}
                    </strong>
                  </div>
                  <div>
                    <span>Próxima evaluación</span>
                    <strong>
                      {course.nextEvaluationDate ? formatDate(course.nextEvaluationDate) : 'Según calendario'}
                    </strong>
                  </div>
                  <div className="l-course-fact-wide">
                    <span>Método de evaluación</span>
                    <strong>{course.evaluationMethod ?? 'Evaluación continua por hitos y laboratorio'}</strong>
                  </div>
                  <div>
                    <span>Promedio de asistencia</span>
                    <strong>
                      <UsersRound size={13} aria-hidden="true" /> {avgAttendance}%
                    </strong>
                  </div>
                </div>

                <div className="learn-material-meta">
                  <BookOpen aria-hidden="true" size={16} /> {lessons.length} {lessons.length === 1 ? 'lección' : 'lecciones'}{' '}
                  <Clock3 aria-hidden="true" size={16} /> {totalMinutes} min · Flujo: Video del tema + Teoría + Ejercicios prácticos
                </div>
                {isOrientation(course.id) && (
                  <p className="learn-info">
                    Este curso incluye una guía general de inducción mientras el docente añade más lecciones específicas.
                  </p>
                )}
                <ol className="learn-syllabus">
                  {lessons.map((item, index) => {
                    const completedLesson = entry.lessons.includes(item.id)
                    const hasVideoDone = entry.watchedVideos?.includes(item.id)
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
                            <span>
                              {item.summary}
                              {hasVideoDone ? ' · Video visto' : ' · Video + ejercicios'}
                            </span>
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
                  ? 'Revisa las fechas de clases, el horario y el método de evaluación arriba, luego matricúlate para iniciar con los videos y ejercicios.'
                  : 'Revisa el plan de estudio, la asistencia promedio del grupo o edita las lecciones y evaluaciones del curso.'}
              </p>
            )}
            {canLearn && !entry.enrolled && (
              <button className="learn-action" type="button" onClick={enroll}>
                Matricularme en este curso
              </button>
            )}
            {canEditContent && (
              <div className="learn-summary-actions">
                <button className="learn-action" type="button" onClick={() => setSection('editor')}>
                  <Edit3 size={16} aria-hidden="true" /> Editar lecciones y fecha
                </button>
                {workspace && (
                  <button className="learn-action learn-action-outline" type="button" onClick={() => setSection('attendance')}>
                    <CalendarDays size={16} aria-hidden="true" /> Registrar asistencia
                  </button>
                )}
              </div>
            )}
            {canLearn && entry.enrolled && (
              <div className="learn-summary-actions">
                <button
                  className="learn-action learn-action-outline"
                  type="button"
                  onClick={() => openLesson(lesson.id)}
                >
                  <Film size={15} aria-hidden="true" /> Continuar lección
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
