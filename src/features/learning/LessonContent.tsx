import { NotebookPen } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import type { ContentBlock, ExerciseAnswer, Lesson } from '../../types/learning'
import { formatDate } from '../../utils/date'
import { videoSource } from '../../utils/video'
import '../../styles/learning.css'

export type AnswerDraft = Pick<ExerciseAnswer, 'blockId' | 'response'>

type ExerciseProps<Kind extends ContentBlock['kind']> = {
  block: Extract<ContentBlock, { kind: Kind }>
  saved?: ExerciseAnswer
  /** Sin esta función el ejercicio se muestra en solo lectura. */
  onAnswer?: (answer: AnswerDraft) => void
}

function ChoiceExercise({ block, saved, onAnswer }: ExerciseProps<'choice'>) {
  const savedIndex = saved ? block.options.indexOf(saved.response) : -1
  const [selected, setSelected] = useState<number>()
  const current = selected ?? (savedIndex >= 0 ? savedIndex : undefined)
  const checked = savedIndex >= 0 && current === savedIndex
  const correct = savedIndex === block.answer

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!onAnswer || current === undefined) return
    onAnswer({ blockId: block.id, response: block.options[current] })
  }

  return (
    <form onSubmit={submit}>
      <fieldset disabled={!onAnswer}>
        <legend>{block.prompt}</legend>
        {block.options.map((option, index) => (
          <label key={index}>
            <input
              type="radio"
              name={`exercise-${block.id}`}
              checked={current === index}
              onChange={() => setSelected(index)}
            />
            {option}
          </label>
        ))}
      </fieldset>
      {onAnswer ? (
        <button type="submit" className="learn-action learn-action-outline" disabled={current === undefined}>
          Comprobar respuesta
        </button>
      ) : (
        <p>
          Respuesta correcta: <strong>{block.options[block.answer]}</strong>
        </p>
      )}
      {onAnswer && checked && (
        <p role="status">
          <strong>{correct ? 'Correcto.' : 'Incorrecto. Vuelve a intentarlo.'}</strong> {correct && block.explanation}
        </p>
      )}
    </form>
  )
}

function TextExercise({ block, saved, onAnswer }: ExerciseProps<'text'>) {
  const [response, setResponse] = useState(saved?.response ?? '')

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const value = response.trim()
    if (!onAnswer || !value) return
    setResponse(value)
    onAnswer({ blockId: block.id, response: value })
  }

  return (
    <form onSubmit={submit}>
      <label>
        {block.prompt}
        <textarea
          rows={4}
          maxLength={4000}
          required
          disabled={!onAnswer}
          value={response}
          onChange={(event) => setResponse(event.target.value)}
          placeholder="Escribe tu respuesta."
        />
      </label>
      {onAnswer && (
        <button type="submit" className="learn-action learn-action-outline" disabled={!response.trim()}>
          Guardar respuesta
        </button>
      )}
      {saved && saved.response === response && <p role="status">Respuesta guardada · {formatDate(saved.answeredAt)}</p>}
    </form>
  )
}

function Block({
  block,
  answers,
  onAnswer,
  heading: Heading,
}: {
  block: ContentBlock
  answers: ExerciseAnswer[]
  onAnswer?: (answer: AnswerDraft) => void
  heading: 'h3' | 'h4'
}) {
  const saved = answers.find((answer) => answer.blockId === block.id)

  if (block.kind === 'theory') {
    return (
      <div className="learn-block">
        {block.title && <Heading>{block.title}</Heading>}
        <p className="learn-block-text">{block.text}</p>
      </div>
    )
  }
  if (block.kind === 'video') {
    const source = videoSource(block.url)
    return (
      <div className="learn-block">
        <Heading>{block.title}</Heading>
        {!source ? (
          <p>Este video no está disponible.</p>
        ) : source.kind === 'file' ? (
          <video className="learn-video" src={source.src} controls preload="metadata" aria-label={block.title} />
        ) : (
          <iframe
            className="learn-video"
            src={source.src}
            title={block.title}
            loading="lazy"
            allow="encrypted-media; fullscreen; picture-in-picture"
            allowFullScreen
            referrerPolicy="strict-origin-when-cross-origin"
            sandbox="allow-scripts allow-same-origin allow-presentation allow-popups"
          />
        )}
      </div>
    )
  }
  return (
    <div className="learn-block">
      <Heading>{block.kind === 'choice' ? 'Ejercicio' : 'Ejercicio escrito'}</Heading>
      {block.kind === 'choice' ? (
        <ChoiceExercise block={block} saved={saved} onAnswer={onAnswer} />
      ) : (
        <TextExercise block={block} saved={saved} onAnswer={onAnswer} />
      )}
    </div>
  )
}

interface LessonContentProps {
  lesson: Lesson
  answers: ExerciseAnswer[]
  onAnswer?: (answer: AnswerDraft) => void
}

export function LessonContent({ lesson, answers, onAnswer }: LessonContentProps) {
  return (
    <div className="learn-reading">
      {lesson.reading.map((paragraph, index) => (
        <p key={index}>{paragraph}</p>
      ))}

      {lesson.keySteps && lesson.keySteps.length > 0 && (
        <ol className="learn-key-steps">
          {lesson.keySteps.map((step, index) => (
            <li key={index}>{step}</li>
          ))}
        </ol>
      )}

      {lesson.formulaOrCode && (
        <pre className="learn-code-block theme-dark">
          <code>{lesson.formulaOrCode}</code>
        </pre>
      )}

      {lesson.blocks?.map((block) => (
        <Block key={block.id} block={block} answers={answers} onAnswer={onAnswer} heading="h3" />
      ))}

      {lesson.sublessons?.map((sublesson, index) => (
        <section className="learn-sublesson" key={sublesson.id}>
          <h3>
            {index + 1}. {sublesson.title}
          </h3>
          {sublesson.blocks.map((block) => (
            <Block key={block.id} block={block} answers={answers} onAnswer={onAnswer} heading="h4" />
          ))}
        </section>
      ))}

      {lesson.exercise && (
        <div className="learn-exercise learn-block">
          <h3>
            <NotebookPen aria-hidden="true" size={16} /> {lesson.labKind ? 'Reto en el laboratorio' : 'Reto'}
          </h3>
          <p>{lesson.exercise}</p>
        </div>
      )}
    </div>
  )
}
