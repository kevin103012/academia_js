import { ChevronDown, ChevronUp, FileText, ListChecks, Pencil, Trash2, Video, type LucideIcon } from 'lucide-react'
import { blockLabels, maxOptions, moveItem, newBlock } from '../../services'
import type { ContentBlock, ContentBlockKind } from '../../types/learning'
import '../../styles/course-editor.css'

const kinds = Object.keys(blockLabels) as ContentBlockKind[]

const kindIcons: Record<ContentBlockKind, LucideIcon> = {
  theory: FileText,
  video: Video,
  choice: ListChecks,
  text: Pencil,
}

interface ItemToolsProps {
  /** Nombre del elemento, para las etiquetas accesibles («bloque 2», «sublección 1»). */
  label: string
  index: number
  count: number
  onMove: (direction: -1 | 1) => void
  onRemove: () => void
}

/** Subir, bajar y quitar: los mismos tres botones para bloques y sublecciones. */
export function ItemTools({ label, index, count, onMove, onRemove }: ItemToolsProps) {
  return (
    <div className="le-tools">
      <button
        type="button"
        className="p-button p-button-short ce-icon"
        aria-label={`Subir ${label}`}
        title="Subir"
        disabled={index === 0}
        onClick={() => onMove(-1)}
      >
        <ChevronUp size={16} aria-hidden="true" />
      </button>
      <button
        type="button"
        className="p-button p-button-short ce-icon"
        aria-label={`Bajar ${label}`}
        title="Bajar"
        disabled={index === count - 1}
        onClick={() => onMove(1)}
      >
        <ChevronDown size={16} aria-hidden="true" />
      </button>
      <button
        type="button"
        className="p-button p-button-short ce-icon tone-danger"
        aria-label={`Quitar ${label}`}
        title="Quitar"
        onClick={onRemove}
      >
        <Trash2 size={15} aria-hidden="true" />
      </button>
    </div>
  )
}

function BlockFields({ block, onChange }: { block: ContentBlock; onChange: (block: ContentBlock) => void }) {
  if (block.kind === 'theory') {
    return (
      <>
        <label>
          Subtítulo (opcional)
          <input maxLength={120} value={block.title ?? ''} onChange={(event) => onChange({ ...block, title: event.target.value })} />
        </label>
        <label>
          Texto de teoría
          <textarea rows={5} maxLength={8000} value={block.text} onChange={(event) => onChange({ ...block, text: event.target.value })} />
        </label>
      </>
    )
  }
  if (block.kind === 'video') {
    return (
      <>
        <label>
          Título del video
          <input maxLength={120} value={block.title} onChange={(event) => onChange({ ...block, title: event.target.value })} />
        </label>
        <label>
          Enlace del video
          <input
            type="url"
            maxLength={500}
            placeholder="https://www.youtube.com/watch?v=…"
            value={block.url}
            onChange={(event) => onChange({ ...block, url: event.target.value })}
          />
        </label>
        <p className="p-editor-hint">YouTube, Vimeo o enlace https directo a un archivo .mp4, .webm u .ogg.</p>
      </>
    )
  }

  const prompt = (
    <label>
      Consigna
      <textarea rows={2} maxLength={1000} value={block.prompt} onChange={(event) => onChange({ ...block, prompt: event.target.value })} />
    </label>
  )
  if (block.kind === 'text') {
    return (
      <>
        {prompt}
        <p className="p-editor-hint">El alumno escribe su respuesta y podrás leerla en «Respuestas de alumnos».</p>
      </>
    )
  }

  return (
    <>
      {prompt}
      <p className="p-editor-hint">Escribe las alternativas y marca la correcta. La web la corrige.</p>
      {block.options.map((option, index) => (
        <div className="p-editor-option" key={index}>
          <label>
            <input
              type="radio"
              name={`correct-${block.id}`}
              aria-label={`Marcar la alternativa ${index + 1} como correcta`}
              checked={block.answer === index}
              onChange={() => onChange({ ...block, answer: index })}
            />
          </label>
          <input
            type="text"
            maxLength={300}
            aria-label={`Alternativa ${index + 1}`}
            placeholder={`Alternativa ${index + 1}`}
            value={option}
            onChange={(event) =>
              onChange({ ...block, options: block.options.map((item, at) => (at === index ? event.target.value : item)) })
            }
          />
          {block.options.length > 2 && (
            <button
              type="button"
              className="p-button p-button-short"
              aria-label={`Quitar la alternativa ${index + 1}`}
              onClick={() =>
                onChange({
                  ...block,
                  options: block.options.filter((_, at) => at !== index),
                  // Si se quita la correcta, hay que volver a marcar una.
                  answer: index === block.answer ? -1 : block.answer - (index < block.answer ? 1 : 0),
                })
              }
            >
              Quitar
            </button>
          )}
        </div>
      ))}
      {block.options.length < maxOptions && (
        <button
          type="button"
          className="p-button p-button-short"
          onClick={() => onChange({ ...block, options: [...block.options, ''] })}
        >
          Añadir alternativa
        </button>
      )}
      <label>
        Explicación al acertar (opcional)
        <input maxLength={600} value={block.explanation ?? ''} onChange={(event) => onChange({ ...block, explanation: event.target.value })} />
      </label>
    </>
  )
}

interface BlockEditorProps {
  /** Dónde se añaden los bloques, para las etiquetas accesibles. */
  place: string
  blocks: ContentBlock[]
  onChange: (blocks: ContentBlock[]) => void
}

export function BlockEditor({ place, blocks, onChange }: BlockEditorProps) {
  return (
    <>
      {blocks.map((block, index) => {
        const Icon = kindIcons[block.kind]
        return (
          <div className="le-block" role="group" aria-labelledby={`block-${block.id}`} key={block.id}>
            <div className="le-block-head">
              <span className="le-kind" id={`block-${block.id}`}>
                <Icon size={15} aria-hidden="true" />
                {index + 1}. {blockLabels[block.kind]}
              </span>
              <ItemTools
                label={`el bloque ${index + 1}`}
                index={index}
                count={blocks.length}
                onMove={(direction) => onChange(moveItem(blocks, index, direction))}
                onRemove={() => onChange(blocks.filter((item) => item.id !== block.id))}
              />
            </div>
            <BlockFields block={block} onChange={(next) => onChange(blocks.map((item) => (item.id === next.id ? next : item)))} />
          </div>
        )
      })}
      <div className="le-add" role="group" aria-label={`Añadir contenido a ${place}`}>
        <span className="le-add-label">Añadir</span>
        {kinds.map((kind) => {
          const Icon = kindIcons[kind]
          return (
            <button
              key={kind}
              type="button"
              className="p-button p-button-short"
              onClick={() => onChange([...blocks, newBlock(kind)])}
            >
              <Icon size={14} aria-hidden="true" />
              {blockLabels[kind]}
            </button>
          )
        })}
      </div>
    </>
  )
}
