import { useState, type FormEvent } from 'react'
import { Award, CircleCheck } from 'lucide-react'
import { passingScore } from '../../services'
import type { Question } from '../../types/learning'

export type Attempt = {
  answers: number[]
  score: number
}

interface CourseAssessmentProps {
  questions: Question[]
  bestScore?: number
  earnedCertificate: boolean
  canLearn: boolean
  readyForAssessment: boolean
  onScoreSaved: (score: number) => void
  onIssueCertificate: () => void
  onRetryFocus: () => void
  attempt: Attempt | null
  onAttemptChange: (attempt: Attempt | null) => void
}

export function CourseAssessment({
  questions,
  bestScore,
  earnedCertificate,
  canLearn,
  readyForAssessment,
  onScoreSaved,
  onIssueCertificate,
  onRetryFocus,
  attempt,
  onAttemptChange,
}: CourseAssessmentProps) {
  const [answers, setAnswers] = useState<Record<number, number>>({})

  function submitAssessment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!canLearn || !readyForAssessment || questions.some((_, index) => answers[index] === undefined)) return
    const selected = questions.map((_, index) => answers[index])
    const correct = questions.filter((question, index) => question.answer === selected[index]).length
    const score = Math.round((correct / questions.length) * 100)
    onAttemptChange({ answers: selected, score })
    onScoreSaved(score)
  }

  if (attempt) {
    return (
      <>
        <p className="learn-result" role="status">
          <CircleCheck aria-hidden="true" size={20} /> <strong>{attempt.score}%</strong>{' '}
          {attempt.score >= passingScore ? 'Evaluación aprobada' : 'Sigue practicando'}
        </p>
        <ol className="learn-feedback">
          {questions.map((question, index) => (
            <li key={question.prompt}>
              <strong>{question.prompt}</strong>
              <p>
                {attempt.answers[index] === question.answer
                  ? 'Correcta.'
                  : `Respuesta correcta: ${question.options[question.answer]}.`}{' '}
                {question.explanation}
              </p>
            </li>
          ))}
        </ol>
        <div className="learn-lesson-actions">
          <button
            className="learn-action learn-action-outline"
            type="button"
            onClick={() => {
              onAttemptChange(null)
              setAnswers({})
              onRetryFocus()
            }}
          >
            Repetir evaluación
          </button>
          {(bestScore ?? 0) >= passingScore && (
            <button className="learn-action" type="button" onClick={onIssueCertificate}>
              <Award aria-hidden="true" size={17} /> {earnedCertificate ? 'Ver certificado' : 'Emitir certificado'}
            </button>
          )}
        </div>
      </>
    )
  }

  return (
    <form className="learn-assessment" onSubmit={submitAssessment}>
      <p>
        Responde {questions.length} preguntas. Necesitas al menos {passingScore}% para aprobar.
      </p>
      {questions.map((question, index) => (
        <fieldset key={question.prompt}>
          <legend>
            {index + 1}. {question.prompt}
          </legend>
          {question.options.map((option, optionIndex) => (
            <label key={option}>
              <input
                type="radio"
                name={`learn-question-${index}`}
                required
                checked={answers[index] === optionIndex}
                onChange={() => setAnswers((previous) => ({ ...previous, [index]: optionIndex }))}
              />
              {option}
            </label>
          ))}
        </fieldset>
      ))}
      <button className="learn-action" type="submit">
        Revisar mis respuestas
      </button>
    </form>
  )
}
