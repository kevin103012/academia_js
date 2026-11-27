import { BookOpen, Check, ExternalLink, Film } from 'lucide-react'
import type { Lesson } from '../../types/learning'

interface LessonVideoStageProps {
  lesson: Lesson
  courseName: string
  watched: boolean
  canLearn: boolean
  onMarkWatched: () => void
}

function lessonVideo(url?: string) {
  if (!url) return null
  try {
    const media = new URL(url)
    if (media.protocol !== 'https:') return null
    const host = media.hostname.replace(/^www\./, '')
    if (['youtube.com', 'youtube-nocookie.com', 'youtu.be', 'm.youtube.com'].includes(host)) {
      const id = media.searchParams.get('v') ?? media.pathname.split('/').filter(Boolean).at(-1)
      if (!id || !/^[\w-]{11}$/.test(id)) return null
      return {
        type: 'youtube' as const,
        embed: 'https://www.youtube-nocookie.com/embed/' + id,
        original: 'https://www.youtube.com/watch?v=' + id,
      }
    }
    if (/\.(mp4|webm|ogg)$/i.test(media.pathname)) return { type: 'file' as const, original: media.href }
  } catch {
    return null
  }
  return null
}

export function LessonVideoStage({ lesson, courseName, watched, canLearn, onMarkWatched }: LessonVideoStageProps) {
  const media = lessonVideo(lesson.videoUrl)
  const topic = lesson.videoTitle ?? lesson.title

  return (
    <section className="l-video-stage theme-dark" aria-label={media ? 'Video de la lección' : 'Introducción a la lección'}>
      <div className="l-video-head">
        <div className="l-video-badge-row">
          <span className="p-badge tone-soft-accent">
            {media ? <Film size={13} aria-hidden="true" /> : <BookOpen size={13} aria-hidden="true" />}
            {media ? 'Paso 1 · Video del tema' : 'Paso 1 · Introducción'}
          </span>
          {watched && <span className="p-badge tone-soft-accent"><Check size={13} aria-hidden="true" /> Completado</span>}
        </div>
        <h3>{media ? topic : lesson.title}</h3>
      </div>

      {media?.type === 'youtube' ? (
        <div className="l-video-embed">
          <iframe src={media.embed} title={topic} allow="accelerometer; encrypted-media; picture-in-picture; fullscreen"
            referrerPolicy="strict-origin-when-cross-origin" allowFullScreen />
        </div>
      ) : media?.type === 'file' ? (
        <video key={media.original} className="l-video-native" controls preload="metadata" src={media.original}
          onEnded={() => { if (canLearn) onMarkWatched() }} aria-label={topic} />
      ) : (
        <div className="l-video-canvas">
          <div className="l-video-canvas-content">
            <span className="l-video-course-tag">{courseName}</span>
            <p>{lesson.summary}</p>
          </div>
        </div>
      )}

      <div className="l-video-footer">
        {media ? <a className="p-button p-button-short" href={media.original} target="_blank" rel="noreferrer">
          <ExternalLink size={14} aria-hidden="true" /> Abrir video
        </a> : <p>Lee la introducción antes de continuar con la teoría y la práctica.</p>}
        {canLearn && <button
          type="button"
          className={watched ? 'learn-action learn-action-outline' : 'learn-action'}
          onClick={onMarkWatched}
          disabled={watched}
        >
          <Check size={15} aria-hidden="true" />
          {watched ? 'Paso completado' : media ? 'Marcar video como visto' : 'Continuar a la práctica'}
        </button>}
      </div>
    </section>
  )
}
