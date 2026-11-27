import { Download, FileText, X } from 'lucide-react'
import type { MessageAttachment } from '../../types/messaging'
import { formatSize, isImageType, typeLabel } from '../../utils/attachments'

interface AttachmentListProps {
  attachments: MessageAttachment[]
  /** Se llama al pulsar una imagen para verla ampliada. */
  onOpenImage?: (attachment: MessageAttachment) => void
}

/** Adjuntos dentro de un mensaje enviado o recibido: imágenes grandes arriba y documentos en lista. */
export function AttachmentList({ attachments, onOpenImage }: AttachmentListProps) {
  const images = attachments.filter((item) => isImageType(item.mime))
  const documents = attachments.filter((item) => !isImageType(item.mime))
  return (
    <div className="comm-attachments-wrap">
      {images.length > 0 && (
        <ul className="comm-images" aria-label="Imágenes adjuntas" data-single={images.length === 1 || undefined}>
          {images.map((item) => (
            <li key={item.id}>
              <button
                type="button"
                className="comm-image-btn"
                onClick={() => onOpenImage?.(item)}
                aria-label={`Ampliar imagen ${item.name}`}
              >
                <img src={item.dataUrl} alt={item.name} loading="lazy" />
              </button>
            </li>
          ))}
        </ul>
      )}
      {documents.length > 0 && (
        <ul className="comm-attachments" aria-label="Archivos adjuntos">
          {documents.map((item) => (
            <li key={item.id} className="comm-attachment">
              <FileText size={20} aria-hidden="true" />
              <span className="comm-attachment-info">
                <strong title={item.name}>{item.name}</strong>
                <small>
                  {typeLabel(item.mime)} · {formatSize(item.size)}
                </small>
              </span>
              <a className="comm-attachment-link" href={item.dataUrl} download={item.name} aria-label={`Descargar ${item.name}`}>
                <Download size={15} aria-hidden="true" />
              </a>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

interface PendingAttachmentsProps {
  attachments: MessageAttachment[]
  onRemove: (id: string) => void
  disabled?: boolean
}

/** Adjuntos elegidos que aún no se envían; se pueden quitar. */
export function PendingAttachments({ attachments, onRemove, disabled }: PendingAttachmentsProps) {
  if (!attachments.length) return null
  return (
    <ul className="comm-pending" aria-label="Archivos por enviar">
      {attachments.map((item) => (
        <li key={item.id} className="comm-pending-item">
          {isImageType(item.mime) ? (
            <img src={item.dataUrl} alt="" />
          ) : (
            <FileText size={16} aria-hidden="true" />
          )}
          <span title={item.name}>{item.name}</span>
          <small>{formatSize(item.size)}</small>
          <button type="button" disabled={disabled} onClick={() => onRemove(item.id)} aria-label={`Quitar ${item.name}`}>
            <X size={14} aria-hidden="true" />
          </button>
        </li>
      ))}
    </ul>
  )
}
