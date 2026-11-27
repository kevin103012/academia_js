import { CalendarDays, Check, Film, Plus, Save, Trash2 } from 'lucide-react'
import { useEffect, useState, type FormEvent } from 'react'
import { learningService } from '../../services'
import type { CourseMaterial, Lesson, LessonExerciseCheck, LessonLabKind } from '../../types/learning'
import type { Commit, Course } from '../../types/workspace'
import { createId } from '../../utils/id'

interface CourseTeacherEditorProps {
  course: Course
  material: CourseMaterial
  commit?: Commit
  onMaterialUpdated: (next: CourseMaterial) => void
  notify: (message: string) => void
}

export function CourseTeacherEditor({
  course,
  material,
  commit,
  onMaterialUpdated,
  notify,
}: CourseTeacherEditorProps) {
  const [selectedLessonId, setSelectedLessonId] = useState(material.lessons[0]?.id ?? 'new')
  const [evalDate, setEvalDate] = useState(course.nextEvaluationDate ?? '')
  const [evalMethod, setEvalMethod] = useState(course.evaluationMethod ?? '')
  const [saving, setSaving] = useState(false)

  const currentLesson = material.lessons.find((item) => item.id === selectedLessonId)
  const [title, setTitle] = useState(currentLesson?.title ?? '')
  const [summary, setSummary] = useState(currentLesson?.summary ?? '')
  const [minutes, setMinutes] = useState(String(currentLesson?.minutes ?? 8))
  const [videoTitle, setVideoTitle] = useState(currentLesson?.videoTitle ?? '')
  const [videoUrl, setVideoUrl] = useState(currentLesson?.videoUrl ?? '')
  const [videoDuration, setVideoDuration] = useState(currentLesson?.videoDuration ?? '06:30')
  const [readingText, setReadingText] = useState((currentLesson?.reading ?? []).join('\n\n'))
  const [sublessonsText, setSublessonsText] = useState(
    (currentLesson?.sublessons ?? []).map((s) => `${s.title} | ${s.content}`).join('\n'),
  )
  const [exercisePrompt, setExercisePrompt] = useState(currentLesson?.exercise ?? '')
  const [exercises, setExercises] = useState<LessonExerciseCheck[]>(currentLesson?.exercises ?? [])
  const [formulaOrCode, setFormulaOrCode] = useState(currentLesson?.formulaOrCode ?? '')
  const [labKind, setLabKind] = useState<LessonLabKind>(currentLesson?.labKind ?? 'architecture')

  useEffect(() => {
    setEvalDate(course.nextEvaluationDate ?? '')
    setEvalMethod(course.evaluationMethod ?? '')
  }, [course.id, course.nextEvaluationDate, course.evaluationMethod])

  function loadLessonIntoForm(nextId: string) {
    setSelectedLessonId(nextId)
    if (nextId === 'new') {
      setTitle('')
      setSummary('')
      setMinutes('8')
      setVideoTitle('')
      setVideoUrl('')
      setVideoDuration('06:30')
      setReadingText('')
      setSublessonsText('1.1 Concepto clave | Explica el punto central de la sublección.')
      setExercisePrompt('')
      setExercises([])
      setFormulaOrCode('')
      setLabKind('architecture')
      return
    }
    const found = material.lessons.find((l) => l.id === nextId)
    if (!found) return
    setTitle(found.title)
    setSummary(found.summary)
    setMinutes(String(found.minutes))
    setVideoTitle(found.videoTitle ?? '')
    setVideoUrl(found.videoUrl ?? '')
    setVideoDuration(found.videoDuration ?? '06:30')
    setReadingText(found.reading.join('\n\n'))
    setSublessonsText((found.sublessons ?? []).map((s) => `${s.title} | ${s.content}`).join('\n'))
    setExercisePrompt(found.exercise)
    setExercises(found.exercises ?? [])
    setFormulaOrCode(found.formulaOrCode ?? '')
    setLabKind(found.labKind ?? 'architecture')
  }

  function handleSaveEvaluation(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!commit) return
    commit(`Actualizó fecha de evaluación en «${course.name}»`, (current) => ({
      ...current,
      courses: current.courses.map((item) =>
        item.id === course.id
          ? {
              ...item,
              nextEvaluationDate: evalDate || undefined,
              evaluationMethod: evalMethod.trim() || item.evaluationMethod,
            }
          : item,
      ),
    }))
    notify('Fecha y método de evaluación actualizados.')
  }

  async function handleSaveLesson(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!title.trim() || !summary.trim()) return
    if (exercises.some((exercise) => !exercise.question.trim() || exercise.options.some((option) => !option.trim()) ||
      new Set(exercise.options.map((option) => option.trim().toLocaleLowerCase('es'))).size !== exercise.options.length)) {
      notify('Cada pregunta necesita un enunciado y opciones completas y distintas.')
      return
    }
    setSaving(true)
    try {
      const parsedReading = readingText
        .split(/\n{2,}/)
        .map((p) => p.trim())
        .filter(Boolean)
      const parsedSublessons = sublessonsText
        .split('\n')
        .map((line) => line.trim())
        .filter(Boolean)
        .map((line, index) => {
          const [subTitle, ...rest] = line.split('|')
          return {
            id: `${selectedLessonId}-sub-${index + 1}`,
            title: (subTitle ?? `Sublección ${index + 1}`).trim(),
            content: rest.join('|').trim() || 'Desarrollo práctico de la sublección.',
          }
        })

      const isNew = selectedLessonId === 'new' || !currentLesson
      const lessonId = isNew ? `${course.id}-${createId().slice(0, 6)}` : currentLesson.id

      const nextLesson: Lesson = {
        ...(currentLesson ?? { id: lessonId, reading: [], exercise: '' }),
        id: lessonId,
        title: title.trim(),
        summary: summary.trim(),
        minutes: Math.max(1, Number(minutes) || 8),
        videoTitle: videoTitle.trim() || `Clase en video: ${title.trim()}`,
        videoUrl: videoUrl.trim() || undefined,
        videoDuration: videoDuration.trim() || '06:30',
        reading: parsedReading.length ? parsedReading : [summary.trim()],
        sublessons: parsedSublessons,
        exercise: exercisePrompt.trim() || 'Completa la comprobación práctica en el laboratorio interactivo.',
        exercises: exercises.map((exercise) => ({
          ...exercise, question: exercise.question.trim(), options: exercise.options.map((option) => option.trim()),
          explanation: exercise.explanation.trim(),
        })),
        formulaOrCode: formulaOrCode.trim() || undefined,
        labKind,
      }

      const nextLessons = isNew
        ? [...material.lessons, nextLesson]
        : material.lessons.map((item) => (item.id === lessonId ? nextLesson : item))

      const updatedMaterial: CourseMaterial = { ...material, lessons: nextLessons }
      await learningService.saveCourseMaterial(course.id, updatedMaterial)
      onMaterialUpdated(updatedMaterial)
      setSelectedLessonId(lessonId)
      commit?.(`Editó contenido de lección en «${course.name}»`, (current) => current)
      notify(isNew ? 'Nueva lección y sublecciones guardadas.' : 'Lección, video y ejercicios actualizados.')
    } catch (error) {
      notify(error instanceof Error ? error.message : 'No pudimos guardar los cambios de la lección.')
    } finally {
      setSaving(false)
    }
  }

  function updateExercise(id: string, change: Partial<LessonExerciseCheck>) {
    setExercises((current) => current.map((exercise) => exercise.id === id ? { ...exercise, ...change } : exercise))
  }

  return (
    <div className="l-teacher-editor">
      <form className="p-card p-form" onSubmit={handleSaveEvaluation}>
        <h2>
          <CalendarDays size={18} aria-hidden="true" /> Fecha y método de evaluación del curso
        </h2>
        <div className="l-eval-inline-bar">
          <label htmlFor="teacher-eval-date">
            Próxima evaluación
            <input
              id="teacher-eval-date"
              type="date"
              value={evalDate}
              onChange={(e) => setEvalDate(e.target.value)}
            />
          </label>
          <label htmlFor="teacher-eval-method">
            Método de evaluación
            <input
              id="teacher-eval-method"
              value={evalMethod}
              onChange={(e) => setEvalMethod(e.target.value)}
              placeholder="Ej. Laboratorios (45%) + Proyecto (35%) + Examen (20%)"
            />
          </label>
          <button type="submit" className="p-button p-button-primary">
            <Check size={16} aria-hidden="true" /> Guardar fecha
          </button>
        </div>
      </form>

      <form className="p-card p-form" onSubmit={handleSaveLesson}>
        <div className="l-editor-head">
          <h2>
            <Film size={18} aria-hidden="true" /> Editor de lecciones, sublecciones, video y ejercicios
          </h2>
          <div className="l-editor-picker">
            <select
              aria-label="Seleccionar lección a editar"
              value={selectedLessonId}
              onChange={(e) => loadLessonIntoForm(e.target.value)}
            >
              {material.lessons.map((item, idx) => (
                <option key={item.id} value={item.id}>
                  Lección {idx + 1}: {item.title}
                </option>
              ))}
              <option value="new">+ Nueva lección</option>
            </select>
            <button type="button" className="p-button" onClick={() => loadLessonIntoForm('new')}>
              <Plus size={15} aria-hidden="true" /> Nueva lección
            </button>
          </div>
        </div>

        <div className="p-form-workbench">
          <div className="p-form-col">
            <div className="p-form-row-asymmetric">
              <label htmlFor="ed-lesson-title">
                Título de la lección
                <input id="ed-lesson-title" required value={title} onChange={(e) => setTitle(e.target.value)} />
              </label>
              <label htmlFor="ed-lesson-minutes">
                Duración (min)
                <input
                  id="ed-lesson-minutes"
                  type="number"
                  min={1}
                  max={180}
                  value={minutes}
                  onChange={(e) => setMinutes(e.target.value)}
                />
              </label>
            </div>
            <label htmlFor="ed-lesson-summary">
              Resumen breve de la unidad
              <input id="ed-lesson-summary" required value={summary} onChange={(e) => setSummary(e.target.value)} />
            </label>
            <div className="p-form-row-asymmetric">
              <label htmlFor="ed-video-title">
                Título del video de la lección
                <input
                  id="ed-video-title"
                  value={videoTitle}
                  onChange={(e) => setVideoTitle(e.target.value)}
                  placeholder="Ej. Clase 1: Compuertas y voltaje digital"
                />
              </label>
              <label htmlFor="ed-video-duration">
                Duración video
                <input
                  id="ed-video-duration"
                  value={videoDuration}
                  onChange={(e) => setVideoDuration(e.target.value)}
                  placeholder="06:30"
                />
              </label>
            </div>
            <div className="p-form-row-asymmetric">
              <label htmlFor="ed-video-url">
                URL de video (YouTube o MP4, opcional)
                <input
                  id="ed-video-url"
                  type="text"
                  value={videoUrl}
                  onChange={(e) => setVideoUrl(e.target.value)}
                  placeholder="https://www.youtube.com/watch?v=..."
                />
              </label>
              <label htmlFor="ed-lab-kind">
                Simulador / Laboratorio
                <select
                  id="ed-lab-kind"
                  value={labKind}
                  onChange={(e) => setLabKind(e.target.value as LessonLabKind)}
                >
                  <option value="circuit">Circuitos lógicos</option>
                  <option value="matrix">Álgebra lineal y matrices</option>
                  <option value="architecture">Arquitectura y código</option>
                </select>
              </label>
            </div>
            <label htmlFor="ed-exercise-prompt">
              Consigna del ejercicio práctico
              <input
                id="ed-exercise-prompt"
                value={exercisePrompt}
                onChange={(e) => setExercisePrompt(e.target.value)}
                placeholder="Describe qué debe demostrar el alumno en el laboratorio o ejercicio."
              />
            </label>
            <div className="p-actions-row">
              <button type="submit" className="p-button p-button-primary" disabled={saving}>
                <Save size={16} aria-hidden="true" />
                {saving ? 'Guardando...' : selectedLessonId === 'new' ? 'Agregar lección al curso' : 'Guardar lección'}
              </button>
            </div>
          </div>

          <div className="p-form-col--stretch">
            <label className="p-form-label-grow" htmlFor="ed-theory-text">
              Teoría de la lección (párrafos separados por línea en blanco)
              <textarea
                id="ed-theory-text"
                rows={5}
                value={readingText}
                onChange={(e) => setReadingText(e.target.value)}
                placeholder="Explica los fundamentos técnicos de la lección..."
              />
            </label>
            <label htmlFor="ed-sublessons">
              Sublecciones (una por línea usando formato: Título | Contenido)
              <textarea
                id="ed-sublessons"
                rows={3}
                value={sublessonsText}
                onChange={(e) => setSublessonsText(e.target.value)}
              />
            </label>
            <label htmlFor="ed-code-formula">
              Código o fórmula de referencia (opcional)
              <textarea
                id="ed-code-formula"
                rows={2}
                value={formulaOrCode}
                onChange={(e) => setFormulaOrCode(e.target.value)}
              />
            </label>
            <div className="l-teacher-checks">
              <h3>Preguntas con corrección automática</h3>
              {exercises.map((exercise, exerciseIndex) => <fieldset key={exercise.id}>
                <legend>Pregunta {exerciseIndex + 1}</legend>
                <label>Enunciado<input maxLength={300} required value={exercise.question} onChange={(event) => updateExercise(exercise.id, { question: event.target.value })} /></label>
                {exercise.options.map((option, optionIndex) => <label key={optionIndex}>Opción {optionIndex + 1}
                  <input value={option} maxLength={200} required onChange={(event) =>
                    updateExercise(exercise.id, { options: exercise.options.map((item, index) => index === optionIndex ? event.target.value : item) })}
                  />
                </label>)}
                <label>Respuesta correcta
                  <select value={exercise.correctIndex} onChange={(event) => updateExercise(exercise.id, { correctIndex: Number(event.target.value) })}>
                    {exercise.options.map((_, index) => <option key={index} value={index}>Opción {index + 1}</option>)}
                  </select>
                </label>
                <label>Explicación<textarea rows={2} maxLength={500} value={exercise.explanation} onChange={(event) => updateExercise(exercise.id, { explanation: event.target.value })} /></label>
                <button type="button" className="p-button p-button-short" onClick={() => setExercises((current) => current.filter((item) => item.id !== exercise.id))}>
                  <Trash2 size={14} aria-hidden="true" /> Quitar pregunta
                </button>
              </fieldset>)}
              {exercises.length < 12 && <button type="button" className="p-button p-button-short" onClick={() => {
                const id = createId()
                setExercises((current) => [...current, { id, question: '', options: ['', '', ''], correctIndex: 0, explanation: '' }])
              }}><Plus size={15} aria-hidden="true" /> Añadir pregunta</button>}
            </div>
          </div>
        </div>
      </form>
    </div>
  )
}
