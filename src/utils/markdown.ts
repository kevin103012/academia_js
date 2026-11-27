/**
 * Markdown restringido para los mensajes. Solo reconoce lo que el editor ofrece:
 * **negrita**, *cursiva*, `código`, bloques ``` ``` y listas con «- » o «1. ».
 * No hay enlaces, imágenes ni HTML: el resultado es un árbol de datos que la
 * pantalla convierte en elementos de React, así que nada se inserta como HTML.
 */
export type Inline =
  | { type: 'text'; text: string }
  | { type: 'strong' | 'em'; children: Inline[] }
  | { type: 'code'; text: string }
  | { type: 'br' }

export type Block =
  | { type: 'paragraph'; children: Inline[] }
  | { type: 'list'; ordered: boolean; items: Inline[][] }
  | { type: 'code'; text: string }

const maxDepth = 3

const isWordChar = (char: string | undefined) => char !== undefined && /[\p{L}\p{N}]/u.test(char)

/** Convierte una sola línea (sin saltos) en nodos en línea. */
export function parseInline(source: string, depth = 0): Inline[] {
  const nodes: Inline[] = []
  let buffer = ''
  const flush = () => {
    if (buffer) nodes.push({ type: 'text', text: buffer })
    buffer = ''
  }

  let index = 0
  while (index < source.length) {
    const char = source[index]

    if (char === '`') {
      const end = source.indexOf('`', index + 1)
      if (end > index + 1) {
        flush()
        nodes.push({ type: 'code', text: source.slice(index + 1, end) })
        index = end + 1
        continue
      }
    } else if (depth < maxDepth && (char === '*' || char === '_')) {
      const double = source[index + 1] === char && char === '*'
      const mark = double ? '**' : char
      const start = index + mark.length
      const opens = !/\s/.test(source[start] ?? ' ') && source[start] !== char
      // «snake_case» y «a*b» no son cursiva: el guion bajo exige borde de palabra.
      const boundaryOk = char === '*' || !isWordChar(source[index - 1])
      if (opens && boundaryOk) {
        let end = source.indexOf(mark, start)
        while (end !== -1 && (/\s/.test(source[end - 1] ?? '') || (!double && source[end + 1] === char))) {
          end = source.indexOf(mark, end + 1)
        }
        const closesOk = end !== -1 && (char === '*' || !isWordChar(source[end + 1]))
        if (end > start && closesOk) {
          flush()
          nodes.push({ type: double ? 'strong' : 'em', children: parseInline(source.slice(start, end), depth + 1) })
          index = end + mark.length
          continue
        }
      }
    }

    buffer += char
    index += 1
  }
  flush()
  return nodes
}

const bullet = /^\s{0,3}[-*]\s+(.*)$/
const numbered = /^\s{0,3}\d{1,3}[.)]\s+(.*)$/

function inlineLines(lines: string[]): Inline[] {
  return lines.flatMap((line, index) => (index === 0 ? parseInline(line) : [{ type: 'br' } as Inline, ...parseInline(line)]))
}

/** Convierte el texto completo del mensaje en bloques. */
export function parseMarkdown(source: string): Block[] {
  const lines = source.replace(/\r\n?/g, '\n').split('\n')
  const blocks: Block[] = []
  let paragraph: string[] = []
  let list: { ordered: boolean; items: Inline[][] } | undefined

  const closeParagraph = () => {
    if (paragraph.length) blocks.push({ type: 'paragraph', children: inlineLines(paragraph) })
    paragraph = []
  }
  const closeList = () => {
    if (list) blocks.push({ type: 'list', ...list })
    list = undefined
  }

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index]

    if (/^\s{0,3}```/.test(line)) {
      closeParagraph()
      closeList()
      const code: string[] = []
      index += 1
      // Sin cierre, el bloque llega hasta el final, como en Markdown.
      while (index < lines.length && !/^\s{0,3}```\s*$/.test(lines[index])) {
        code.push(lines[index])
        index += 1
      }
      blocks.push({ type: 'code', text: code.join('\n') })
      continue
    }

    const item = bullet.exec(line) ?? numbered.exec(line)
    if (item) {
      closeParagraph()
      const ordered = !bullet.test(line)
      if (list && list.ordered !== ordered) closeList()
      list ??= { ordered, items: [] }
      list.items.push(parseInline(item[1]))
      continue
    }

    if (!line.trim()) {
      closeParagraph()
      closeList()
      continue
    }

    closeList()
    paragraph.push(line)
  }
  closeParagraph()
  closeList()
  return blocks
}

/** Texto sin formato, para vistas previas y búsquedas. */
export function plainText(source: string): string {
  const flat = (nodes: Inline[]): string =>
    nodes
      .map((node) => (node.type === 'text' || node.type === 'code' ? node.text : node.type === 'br' ? ' ' : flat(node.children)))
      .join('')
  return parseMarkdown(source)
    .map((block) =>
      block.type === 'code' ? block.text : block.type === 'list' ? block.items.map(flat).join(' ') : flat(block.children),
    )
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim()
}

export type FormatKind = 'bold' | 'italic' | 'code' | 'list'
export interface EditState {
  value: string
  start: number
  end: number
}

/** Aplica un formato a la selección (o al punto de inserción) y devuelve el nuevo texto y selección. */
export function applyFormat({ value, start, end }: EditState, kind: FormatKind): EditState {
  const selected = value.slice(start, end)

  if (kind === 'list') {
    // Toda línea tocada por la selección pasa a ser un elemento de lista, o deja de serlo si ya lo es.
    const from = value.lastIndexOf('\n', start - 1) + 1
    const to = value.indexOf('\n', end) === -1 ? value.length : value.indexOf('\n', end)
    const lines = value.slice(from, to).split('\n')
    const allListed = lines.every((line) => bullet.test(line))
    const next = lines.map((line) => (allListed ? line.replace(/^\s{0,3}[-*]\s+/, '') : bullet.test(line) ? line : `- ${line}`))
    const text = next.join('\n')
    return { value: value.slice(0, from) + text + value.slice(to), start: from, end: from + text.length }
  }

  if (kind === 'code' && selected.includes('\n')) {
    const before = start > 0 && value[start - 1] !== '\n' ? '\n' : ''
    const after = end < value.length && value[end] !== '\n' ? '\n' : ''
    const open = `${before}\`\`\`\n`
    const close = `\n\`\`\`${after}`
    return {
      value: value.slice(0, start) + open + selected + close + value.slice(end),
      start: start + open.length,
      end: start + open.length + selected.length,
    }
  }

  const mark = kind === 'bold' ? '**' : kind === 'italic' ? '*' : '`'
  const wrapped = selected.startsWith(mark) && selected.endsWith(mark) && selected.length >= mark.length * 2
  if (wrapped) {
    const inner = selected.slice(mark.length, selected.length - mark.length)
    return { value: value.slice(0, start) + inner + value.slice(end), start, end: start + inner.length }
  }
  return {
    value: value.slice(0, start) + mark + selected + mark + value.slice(end),
    start: start + mark.length,
    end: start + mark.length + selected.length,
  }
}
