import type { MessageAttachment } from '../types/messaging'
import { createId } from './id'

// Límites de la demo: los mensajes viven en localStorage (≈5 MB en total).
// Con backend se suben a almacenamiento de objetos y estos topes los fija el servidor.
export const maxAttachments = 3
export const maxFileBytes = 600_000
export const maxMessageBytes = 1_200_000
const maxPickedBytes = 15_000_000
const maxImageSide = 1280

export const imageTypes = ['image/png', 'image/jpeg', 'image/webp', 'image/gif']

// SVG queda fuera a propósito: puede traer scripts.
const documentTypes: Record<string, string> = {
  'application/pdf': 'PDF',
  'text/plain': 'Texto',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'Word',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'Excel',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation': 'PowerPoint',
}

export const acceptImages = imageTypes.join(',')
export const acceptFiles = [...imageTypes, ...Object.keys(documentTypes)].join(',')

export const isImageType = (mime: string) => imageTypes.includes(mime)
export const isAllowedType = (mime: string) => isImageType(mime) || Object.hasOwn(documentTypes, mime)
export const typeLabel = (mime: string) => (isImageType(mime) ? 'Imagen' : documentTypes[mime] ?? 'Archivo')

export function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

/** Revisa lo que viene del almacenamiento: nunca se muestra una URL que no sea un data URL del tipo declarado. */
export function isSafeAttachment(value: unknown): value is MessageAttachment {
  if (!value || typeof value !== 'object') return false
  const item = value as Record<string, unknown>
  return (
    typeof item.id === 'string' &&
    typeof item.name === 'string' &&
    typeof item.mime === 'string' &&
    isAllowedType(item.mime) &&
    typeof item.size === 'number' &&
    typeof item.dataUrl === 'string' &&
    item.dataUrl.startsWith(`data:${item.mime};base64,`)
  )
}

function readAsDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result))
    reader.onerror = () => reject(new Error('No se pudo leer el archivo.'))
    reader.readAsDataURL(blob)
  })
}

/** Reduce fotos grandes (JPEG, máx. 1280 px) para que quepan en el almacenamiento. Los GIF no se tocan. */
async function shrinkImage(file: File): Promise<Blob> {
  if (file.type === 'image/gif' || file.size <= 250_000) return file
  try {
    const bitmap = await createImageBitmap(file)
    const scale = Math.min(1, maxImageSide / Math.max(bitmap.width, bitmap.height))
    const canvas = document.createElement('canvas')
    canvas.width = Math.max(1, Math.round(bitmap.width * scale))
    canvas.height = Math.max(1, Math.round(bitmap.height * scale))
    const context = canvas.getContext('2d')
    if (!context) return file
    context.fillStyle = '#ffffff'
    context.fillRect(0, 0, canvas.width, canvas.height)
    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
    bitmap.close()
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.82))
    return blob && blob.size < file.size ? blob : file
  } catch {
    throw new Error(`No se pudo leer la imagen «${file.name}».`)
  }
}

/** Valida un archivo elegido y lo convierte en adjunto. Lanza un error con mensaje para mostrar. */
export async function prepareAttachment(file: File): Promise<MessageAttachment> {
  if (!isAllowedType(file.type)) {
    throw new Error(`«${file.name}»: tipo no permitido. Usa imágenes (PNG, JPG, WebP, GIF), PDF, TXT, Word, Excel o PowerPoint.`)
  }
  if (file.size > maxPickedBytes) throw new Error(`«${file.name}» es demasiado grande.`)
  const blob = isImageType(file.type) ? await shrinkImage(file) : file
  if (blob.size > maxFileBytes) {
    throw new Error(`«${file.name}» pesa ${formatSize(blob.size)}; el máximo es ${formatSize(maxFileBytes)}.`)
  }
  const mime = blob.type || file.type
  return {
    id: createId(),
    name: file.name.slice(0, 120) || 'archivo',
    mime,
    size: blob.size,
    dataUrl: await readAsDataUrl(blob),
  }
}
