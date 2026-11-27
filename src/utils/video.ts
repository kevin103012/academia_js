export type VideoSource = { kind: 'embed' | 'file'; src: string }

/**
 * Acepta enlaces https de YouTube, Vimeo o un archivo de video.
 * La dirección incrustada se construye solo a partir del identificador.
 */
export function videoSource(value: string): VideoSource | null {
  let url: URL
  try {
    url = new URL(value.trim())
  } catch {
    return null
  }
  if (url.protocol !== 'https:') return null
  const host = url.hostname.replace(/^(www|m)\./, '')
  const parts = url.pathname.split('/').filter(Boolean)

  if (host === 'youtu.be' || host === 'youtube.com' || host === 'youtube-nocookie.com') {
    const fromPath = ['embed', 'shorts', 'live'].includes(parts[0]) ? parts[1] : undefined
    const id = host === 'youtu.be' ? parts[0] : url.searchParams.get('v') ?? fromPath
    return id && /^[\w-]{11}$/.test(id) ? { kind: 'embed', src: `https://www.youtube-nocookie.com/embed/${id}` } : null
  }

  if (host === 'vimeo.com' || host === 'player.vimeo.com') {
    const [id, pathHash] = host === 'player.vimeo.com' ? parts.slice(1) : parts
    if (!id || !/^\d+$/.test(id)) return null
    // Los videos no listados de Vimeo necesitan su clave.
    const hash = pathHash ?? url.searchParams.get('h') ?? ''
    const query = /^[a-z0-9]+$/i.test(hash) ? `?h=${hash}` : ''
    return { kind: 'embed', src: `https://player.vimeo.com/video/${id}${query}` }
  }

  return /\.(mp4|webm|ogv|ogg)$/i.test(url.pathname) ? { kind: 'file', src: url.href } : null
}
