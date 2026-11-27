import { Bold, Code, ImagePlus, Italic, List, Paperclip, Send } from 'lucide-react'
import { useEffect, useLayoutEffect, useRef, type ClipboardEvent, type FormEvent, type KeyboardEvent } from 'react'
import { maxMessageChars } from '../../services'
import type { MessageAttachment } from '../../types/messaging'
import { acceptFiles, acceptImages, formatSize, maxAttachments, maxFileBytes } from '../../utils/attachments'
import { applyFormat, type FormatKind } from '../../utils/markdown'
import { PendingAttachments } from './Attachments'

const tools: { kind: FormatKind; label: string; icon: typeof Bold }[] = [
  { kind: 'bold', label: 'Negrita', icon: Bold },
  { kind: 'italic', label: 'Cursiva', icon: Italic },
  { kind: 'list', label: 'Lista', icon: List },
  { kind: 'code', label: 'Código', icon: Code },
]

interface MessageComposerProps {
  /** A quién se escribe; sin destino el editor queda desactivado. */
  targetName?: string
  canWrite: boolean
  /** Motivo por el que no se puede escribir aunque haya destino (p. ej. límite de envíos). */
  blockedReason?: string
  value: string
  onChange: (value: string) => void
  files: MessageAttachment[]
  onAddFiles: (files: File[]) => void
  onRemoveFile: (id: string) => void
  /** Largo máximo del mensaje; por defecto el general. */
  maxChars?: number
  /** Impide adjuntar (por ejemplo, alumnos escribiendo a sus compañeros). */
  attachmentsDisabled?: boolean
  sending: boolean
  reading: boolean
  canSend: boolean
  errors: string[]
  onSubmit: () => void
  /** Cambia para pedir el cursor en el editor (al abrir una conversación o tras enviar). */
  focusKey: unknown
}

const maxHeight = 200
const shortcuts: Record<string, FormatKind | undefined> = { b: 'bold', i: 'italic', e: 'code' }

/** Nombre legible para capturas pegadas, que el navegador llama «image.png». */
function nameClipboardFile(file: File, index: number) {
  if (!/^image\.(png|jpe?g|gif|webp)$/i.test(file.name)) return file
  const stamp = new Date().toLocaleTimeString('es-PE', { hour12: false }).replace(/:/g, '')
  const extension = file.name.split('.').pop()
  return new File([file], `captura-${stamp}${index ? `-${index + 1}` : ''}.${extension}`, { type: file.type })
}

export function MessageComposer({
  targetName,
  canWrite,
  blockedReason,
  value,
  onChange,
  files,
  onAddFiles,
  onRemoveFile,
  attachmentsDisabled,
  maxChars = maxMessageChars,
  sending,
  reading,
  canSend,
  errors,
  onSubmit,
  focusKey,
}: MessageComposerProps) {
  const textarea = useRef<HTMLTextAreaElement>(null)
  const fileInput = useRef<HTMLInputElement>(null)
  const imageInput = useRef<HTMLInputElement>(null)
  const pendingSelection = useRef<[number, number] | undefined>(undefined)
  const editable = canWrite && !blockedReason
  const attachBlocked = !canWrite || attachmentsDisabled || sending || reading || files.length >= maxAttachments

  // El cuadro crece con el texto hasta un tope y luego se desplaza.
  useLayoutEffect(() => {
    const element = textarea.current
    if (!element) return
    element.style.height = 'auto'
    element.style.height = `${Math.min(element.scrollHeight, maxHeight)}px`
    if (pendingSelection.current) {
      element.setSelectionRange(...pendingSelection.current)
      pendingSelection.current = undefined
    }
  }, [value])

  useEffect(() => {
    if (editable && !sending) textarea.current?.focus()
  }, [focusKey, editable, sending])

  function format(kind: FormatKind) {
    const element = textarea.current
    if (!element || !editable) return
    const next = applyFormat({ value: element.value, start: element.selectionStart, end: element.selectionEnd }, kind)
    pendingSelection.current = [next.start, next.end]
    onChange(next.value.slice(0, maxChars))
    element.focus()
  }

  function onKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    // Enter envía; Mayús+Enter agrega una línea. Mientras un teclado IME compone, Enter es suyo.
    if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) {
      event.preventDefault()
      onSubmit()
      return
    }
    if ((event.ctrlKey || event.metaKey) && !event.shiftKey && !event.altKey) {
      const shortcut = shortcuts[event.key.toLowerCase()]
      if (shortcut) {
        event.preventDefault()
        format(shortcut)
      }
    }
  }

  function onPaste(event: ClipboardEvent<HTMLTextAreaElement>) {
    const pasted = Array.from(event.clipboardData.files)
    // Si lo pegado es solo texto, el navegador lo pega normalmente.
    if (!pasted.length) return
    event.preventDefault()
    if (!canWrite) return
    onAddFiles(pasted.map(nameClipboardFile))
  }

  function submit(event: FormEvent) {
    event.preventDefault()
    onSubmit()
  }

  const pick = (event: { target: HTMLInputElement }) => {
    const picked = Array.from(event.target.files ?? [])
    event.target.value = ''
    onAddFiles(picked)
  }

  const left = maxChars - value.length
  const placeholder = !canWrite
    ? targetName
      ? 'No puedes escribirle'
      : 'Primero elige un destinatario'
    : `Escribe a ${targetName}…`

  return (
    <form className="comm-composer" onSubmit={submit}>
      {[...(blockedReason ? [blockedReason] : []), ...errors].map((message) => (
        <p className="p-warning" role="alert" key={message}>
          {message}
        </p>
      ))}
      <PendingAttachments attachments={files} onRemove={onRemoveFile} disabled={sending} />
      <input ref={imageInput} type="file" accept={acceptImages} multiple hidden onChange={pick} />
      <input ref={fileInput} type="file" accept={acceptFiles} multiple hidden onChange={pick} />

      <div className="comm-editor" data-disabled={!editable || undefined}>
        <div className="comm-toolbar" role="toolbar" aria-label="Formato del mensaje">
          {tools.map(({ kind, label, icon: Icon }) => (
            <button
              type="button"
              key={kind}
              className="comm-tool"
              disabled={!editable || sending}
              onClick={() => format(kind)}
              aria-label={label}
              title={label}
            >
              <Icon size={15} aria-hidden="true" />
            </button>
          ))}
          <span className="comm-toolbar-gap" aria-hidden="true" />
          <button
            type="button"
            className="comm-tool"
            disabled={attachBlocked}
            onClick={() => fileInput.current?.click()}
            aria-label="Adjuntar archivo"
            title={`Adjuntar archivo (máx. ${formatSize(maxFileBytes)} cada uno)`}
          >
            <Paperclip size={15} aria-hidden="true" />
          </button>
          <button
            type="button"
            className="comm-tool"
            disabled={attachBlocked}
            onClick={() => imageInput.current?.click()}
            aria-label="Adjuntar imagen"
            title="Adjuntar imagen"
          >
            <ImagePlus size={15} aria-hidden="true" />
          </button>
        </div>
        <textarea
          ref={textarea}
          rows={2}
          maxLength={maxChars}
          value={value}
          disabled={!editable || sending}
          onChange={(event) => onChange(event.target.value)}
          onKeyDown={onKeyDown}
          onPaste={onPaste}
          placeholder={placeholder}
          aria-label={targetName && canWrite ? `Mensaje para ${targetName}` : 'Mensaje'}
          aria-describedby="composer-hint"
        />
        <div className="comm-editor-foot">
          <small id="composer-hint">
            Enter envía · Mayús+Enter nueva línea · pega o arrastra archivos
          </small>
          {left < 400 && (
            <small className="comm-counter" data-low={left < 100 || undefined} aria-live="polite">
              {left} caracteres
            </small>
          )}
          <button type="submit" className="p-button tone-accent" disabled={!canSend}>
            <Send size={15} aria-hidden="true" /> Enviar
          </button>
        </div>
      </div>
    </form>
  )
}
