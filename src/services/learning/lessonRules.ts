import type { ContentBlock, ContentBlockKind, Lesson, LessonLabKind } from '../../types/learning'
import { createId } from '../../utils/id'
import { videoSource } from '../../utils/video'

export const blockLabels: Record<ContentBlockKind, string> = {
  theory: 'Teoría',
  video: 'Video',
  choice: 'Ejercicio de opción múltiple',
  text: 'Ejercicio de respuesta escrita',
}

export const maxOptions = 6

export function newBlock(kind: ContentBlockKind): ContentBlock {
  const id = createId()
  if (kind === 'theory') return { id, kind, title: '', text: '' }
  if (kind === 'video') return { id, kind, title: '', url: '' }
  if (kind === 'choice') return { id, kind, prompt: '', options: ['', ''], answer: 0, explanation: '' }
  return { id, kind, prompt: '' }
}

export function newLesson(): Lesson {
  return { id: createId(), title: '', summary: '', minutes: 10, reading: [], exercise: '' }
}

export const splitParagraphs = (value: string) =>
  value.split(/\n\s*\n/).map((item) => item.trim()).filter(Boolean)

export const splitLines = (value: string) => value.split('\n').map((item) => item.trim()).filter(Boolean)

/** Lo que verifica cada laboratorio; las condiciones están fijas en LessonWorkbench. */
export function labCheck(lessonId: string, kind: LessonLabKind) {
  if (kind === 'matrix') return 'Verifica que la matriz [2 1 | 5; 4 3 | 11] quede reducida a la identidad.'
  if (kind === 'architecture') return 'Verifica la asignación correcta de las carpetas types/, services/ y hooks/.'
  if (lessonId === 'circuit-materials') return 'Verifica la compuerta NAND con A = 1 y B = 1.'
  if (lessonId === 'circuit-evidence') return 'Verifica la compuerta XOR con entradas distintas.'
  return 'Verifica la compuerta AND con A = 1 y B = 1.'
}

export function moveItem<T>(items: T[], index: number, offset: number) {
  const target = index + offset
  if (target < 0 || target >= items.length) return items
  const next = [...items]
  ;[next[index], next[target]] = [next[target], next[index]]
  return next
}

function cleanBlock(block: ContentBlock, place: string, errors: string[]): ContentBlock {
  const fail = (message: string) => errors.push(`${place} (${blockLabels[block.kind]}): ${message}`)

  if (block.kind === 'theory') {
    const text = block.text.trim()
    if (!text) fail('escribe la teoría.')
    return { ...block, title: block.title?.trim() || undefined, text }
  }
  if (block.kind === 'video') {
    const title = block.title.trim()
    const url = block.url.trim()
    if (!title) fail('escribe un título.')
    if (!videoSource(url)) fail('usa un enlace https de YouTube, Vimeo o un archivo .mp4, .webm u .ogg.')
    return { ...block, title, url }
  }

  const prompt = block.prompt.trim()
  if (!prompt) fail('escribe la consigna.')
  if (block.kind === 'text') return { ...block, prompt }

  const options = block.options.map((option) => option.trim())
  if (options.length < 2 || options.some((option) => !option)) fail('completa al menos dos alternativas, sin dejar vacías.')
  else if (new Set(options).size !== options.length) fail('no repitas alternativas.')
  if (!options[block.answer]) fail('marca la alternativa correcta.')
  return { ...block, prompt, options, explanation: block.explanation?.trim() || undefined }
}

function cleanBlocks(blocks: ContentBlock[] | undefined, place: string, errors: string[]) {
  return blocks?.map((block, index) => cleanBlock(block, `${place}bloque ${index + 1}`, errors)) ?? []
}

/** Normaliza el borrador del docente y reúne lo que falta corregir. */
export function prepareLesson(draft: Lesson): { lesson: Lesson; errors: string[] } {
  const errors: string[] = []
  const title = draft.title.trim()
  const summary = draft.summary.trim()
  if (!title) errors.push('Escribe el título de la lección.')
  if (!summary) errors.push('Escribe el resumen de la lección.')
  if (!Number.isInteger(draft.minutes) || draft.minutes < 1 || draft.minutes > 600) {
    errors.push('La duración debe ser un número entero entre 1 y 600 minutos.')
  }
  const blocks = cleanBlocks(draft.blocks, 'Lección, ', errors)
  const sublessons = draft.sublessons?.map((sublesson, index) => {
    const name = sublesson.title.trim()
    if (!name) errors.push(`Sublección ${index + 1}: escribe un título.`)
    return { ...sublesson, title: name, blocks: cleanBlocks(sublesson.blocks, `Sublección ${index + 1}, `, errors) }
  })

  return {
    errors,
    lesson: {
      ...draft,
      title,
      summary,
      exercise: draft.exercise.trim(),
      formulaOrCode: draft.formulaOrCode?.trim() ? draft.formulaOrCode.trimEnd() : undefined,
      keySteps: draft.keySteps?.length ? draft.keySteps : undefined,
      labGoal: draft.labKind ? draft.labGoal?.trim() || undefined : undefined,
      labHint: draft.labKind ? draft.labHint?.trim() || undefined : undefined,
      blocks: blocks.length ? blocks : undefined,
      sublessons: sublessons?.length ? sublessons : undefined,
    },
  }
}
