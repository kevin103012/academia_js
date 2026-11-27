import type { AiDomainId, AiOutputFormat, AiTrainingSource } from '../types/ai'
import { tutorTopics } from './tutorResponses'

export const aiOutputFormats: Record<AiOutputFormat, string> = {
  explanation: 'Explicación',
  'guided-steps': 'Guía paso a paso',
  json: 'JSON estructurado',
}

const extraExamples: Record<AiDomainId, AiTrainingSource> = {
  'linear-algebra': {
    label: 'Ejercicios de álgebra lineal',
    examples: [{ input: '¿Cómo compruebo si dos vectores son linealmente independientes?', output: 'Coloca los vectores como columnas. Si la matriz tiene dos pivotes, las columnas son independientes.' }],
  },
  'digital-circuits': {
    label: 'Ejercicios de lógica digital',
    examples: [{ input: '¿Cómo obtener la salida de una compuerta NAND?', output: 'Calcula primero A AND B e invierte el resultado. La salida es 0 únicamente si ambas entradas son 1.' }],
  },
  'frameworks-arch': {
    label: 'Prácticas de arquitectura web',
    examples: [{ input: '¿Cuándo conviene usar una API entre vistas y persistencia?', output: 'Cuando varias vistas comparten datos, una API con un contrato explícito centraliza su validación y permite probarlas por separado.' }],
  },
  algorithms: {
    label: 'Ejercicios de programación',
    examples: [{ input: '¿Qué complejidad tiene una búsqueda binaria?', output: 'O(log n) comparaciones sobre una secuencia ordenada. En cada paso se descarta aproximadamente la mitad de los candidatos.' }],
  },
  'coordination-stats': {
    label: 'Casos de analítica académica',
    examples: [
      { input: '¿Cómo calculo la asistencia de un curso?', output: 'Divide las asistencias registradas según la regla del centro entre las marcas válidas. Si aún no hay registros, informa «Sin datos».' },
      { input: '¿Cómo calculo un promedio de notas por curso?', output: 'Usa únicamente las entregas calificadas. Divide la suma de sus notas entre el número de calificaciones e informa ese número junto al promedio.' },
    ],
  },
}

export function trainingSourceFor(domain: AiDomainId): AiTrainingSource {
  const source = extraExamples[domain]
  return {
    label: source.label,
    examples: [
      ...tutorTopics.filter((topic) => topic.domain === domain).map(({ question, answer }) => ({ input: question, output: answer })),
      ...source.examples,
    ],
  }
}

export function parseTrainingSource(label: string, content: string): AiTrainingSource {
  const rows: unknown = JSON.parse(content)
  if (!Array.isArray(rows) || rows.length < 2 || rows.length > 200) {
    throw new Error('El archivo debe contener entre 2 y 200 ejemplos.')
  }
  const seen = new Set<string>()
  const examples = rows.map((row: AiTrainingSource['examples'][number]) => {
    const input = typeof row?.input === 'string' ? row.input.trim() : ''
    const output = typeof row?.output === 'string' ? row.output.trim() : ''
    if (!input || !output || input.length > 1000 || output.length > 4000) {
      throw new Error('Cada ejemplo debe tener una entrada (input) y una respuesta (output) válidas.')
    }
    const key = input.toLocaleLowerCase('es')
    if (seen.has(key)) throw new Error('El archivo contiene preguntas repetidas.')
    seen.add(key)
    return { input, output }
  })
  return { label, examples }
}
