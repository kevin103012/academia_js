import { Fragment, type ReactNode } from 'react'
import { parseMarkdown, type Inline } from '../../utils/markdown'

/** Resalta las palabras buscadas dentro de un texto. `terms` ya viene normalizado (sin tildes, en minúsculas). */
function withHighlight(text: string, terms: string[], normalize: (value: string) => string): ReactNode {
  if (!terms.length) return text
  const folded = normalize(text)
  // normalize puede cambiar el largo (p. ej. «ß»); si pasa, no se arriesgan posiciones erróneas.
  if (folded.length !== text.length) return text
  const ranges: [number, number][] = []
  for (const term of terms) {
    for (let at = folded.indexOf(term); at !== -1; at = folded.indexOf(term, at + term.length)) {
      ranges.push([at, at + term.length])
    }
  }
  if (!ranges.length) return text
  ranges.sort((a, b) => a[0] - b[0])
  const merged: [number, number][] = []
  for (const range of ranges) {
    const last = merged[merged.length - 1]
    if (last && range[0] <= last[1]) last[1] = Math.max(last[1], range[1])
    else merged.push([...range])
  }
  const parts: ReactNode[] = []
  let cursor = 0
  merged.forEach(([from, to], index) => {
    if (from > cursor) parts.push(text.slice(cursor, from))
    parts.push(<mark key={index}>{text.slice(from, to)}</mark>)
    cursor = to
  })
  if (cursor < text.length) parts.push(text.slice(cursor))
  return parts
}

interface MessageTextProps {
  text: string
  /** Palabras buscadas (normalizadas) para resaltar. */
  terms?: string[]
  normalize?: (value: string) => string
}

/** Muestra el texto de un mensaje con Markdown restringido, sin insertar HTML. */
export function MessageText({ text, terms = [], normalize = (value) => value.toLowerCase() }: MessageTextProps) {
  const mark = (value: string) => withHighlight(value, terms, normalize)

  const renderInline = (nodes: Inline[]): ReactNode =>
    nodes.map((node, index) => {
      switch (node.type) {
        case 'text':
          return <Fragment key={index}>{mark(node.text)}</Fragment>
        case 'br':
          return <br key={index} />
        case 'code':
          return <code key={index}>{mark(node.text)}</code>
        case 'strong':
          return <strong key={index}>{renderInline(node.children)}</strong>
        case 'em':
          return <em key={index}>{renderInline(node.children)}</em>
      }
    })

  return (
    <div className="comm-rich">
      {parseMarkdown(text).map((block, index) => {
        if (block.type === 'code') {
          return (
            <pre className="comm-code" key={index}>
              <code>{mark(block.text)}</code>
            </pre>
          )
        }
        if (block.type === 'list') {
          const List = block.ordered ? 'ol' : 'ul'
          return (
            <List key={index}>
              {block.items.map((item, itemIndex) => (
                <li key={itemIndex}>{renderInline(item)}</li>
              ))}
            </List>
          )
        }
        return <p key={index}>{renderInline(block.children)}</p>
      })}
    </div>
  )
}
