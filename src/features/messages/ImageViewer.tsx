import { ChevronLeft, ChevronRight, Download, X, ZoomIn, ZoomOut } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'

export interface ViewerImage {
  id: string
  src: string
  name: string
}

interface ImageViewerProps {
  images: ViewerImage[]
  index: number
  onIndex: (index: number) => void
  onClose: () => void
}

/** Visor a pantalla completa. Usa <dialog> modal: el foco queda dentro y vuelve al abrirse al cerrar. */
export function ImageViewer({ images, index, onIndex, onClose }: ImageViewerProps) {
  const dialog = useRef<HTMLDialogElement>(null)
  const [actualSize, setActualSize] = useState(false)
  const image = images[index]

  useEffect(() => {
    const element = dialog.current
    if (element && !element.open) element.showModal()
    return () => element?.close()
  }, [])

  useEffect(() => setActualSize(false), [index])

  function step(delta: number) {
    if (images.length > 1) onIndex((index + delta + images.length) % images.length)
  }

  if (!image) return null

  return (
    <dialog
      ref={dialog}
      className="comm-viewer"
      aria-label={`Imagen ${image.name}`}
      onCancel={(event) => {
        event.preventDefault()
        onClose()
      }}
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose()
      }}
      onKeyDown={(event) => {
        if (event.key === 'ArrowLeft') step(-1)
        else if (event.key === 'ArrowRight') step(1)
      }}
    >
      <div className="comm-viewer-bar">
        <span className="comm-viewer-title" title={image.name}>
          {image.name}
          {images.length > 1 && <small> · {index + 1} de {images.length}</small>}
        </span>
        <button type="button" onClick={() => setActualSize((value) => !value)} aria-label={actualSize ? 'Ajustar a la pantalla' : 'Ver a tamaño real'}>
          {actualSize ? <ZoomOut size={18} aria-hidden="true" /> : <ZoomIn size={18} aria-hidden="true" />}
        </button>
        <a href={image.src} download={image.name} aria-label={`Descargar ${image.name}`}>
          <Download size={18} aria-hidden="true" />
        </a>
        <button type="button" onClick={onClose} aria-label="Cerrar visor" autoFocus>
          <X size={18} aria-hidden="true" />
        </button>
      </div>
      <div className="comm-viewer-stage" data-actual={actualSize || undefined}>
        <img src={image.src} alt={image.name} onClick={() => setActualSize((value) => !value)} />
      </div>
      {images.length > 1 && (
        <>
          <button type="button" className="comm-viewer-nav" data-side="prev" onClick={() => step(-1)} aria-label="Imagen anterior">
            <ChevronLeft size={26} aria-hidden="true" />
          </button>
          <button type="button" className="comm-viewer-nav" data-side="next" onClick={() => step(1)} aria-label="Imagen siguiente">
            <ChevronRight size={26} aria-hidden="true" />
          </button>
        </>
      )}
    </dialog>
  )
}
