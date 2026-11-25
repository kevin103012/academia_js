import type { TutorTopic } from '../types/tutor'

export const tutorTopics: TutorTopic[] = [
  {
    domain: 'linear-algebra',
    title: 'Matrices y Gauss-Jordan',
    reason: 'Resuelve sistemas lineales y rango matricial en Álgebra Lineal Aplicada.',
    question: '¿Cómo escalono una matriz por Gauss-Jordan para hallar el rango?',
    matches: /matri|gauss|algebra|vector|autovalor|determinant|lineal|ecuacion|rango|pivote|proporci/,
    answer:
      'Para escalonar por Gauss-Jordan, ubica un pivote distinto de cero en la primera columna y normaliza esa fila dividiéndola por el pivote.\n\n```text\n[ 2  1 |  5 ]  ──(R2 ← R2 - 2·R1)──▶  [ 2  1 | 5 ]\n[ 4  3 | 11 ]                        [ 0  1 | 1 ]\n──▶ Identidad reducida: x₁ = 2, x₂ = 1 (Rango = 2)\n```\n\nLa cantidad de pivotes no nulos que queden al final define el rango de la matriz. Si el rango coincide con el número de incógnitas, la solución es única.',
    icon: 'math',
  },
  {
    domain: 'digital-circuits',
    title: 'Circuitos y compuertas lógicas',
    reason: 'Analiza flujo de corriente, LEDs y compuertas en Circuitos Digitales.',
    question: '¿Por qué se corta la corriente del LED y cómo actúa una compuerta AND?',
    matches: /circuit|corriente|interruptor|electric|\bled\b|\bpila\b|compuerta|logica|hardware|protoboard|voltaje/,
    answer:
      'Un LED requiere camino cerrado hacia GND y polarización directa. Al abrir el interruptor cae la corriente y la tensión de salida pasa a 0 V.\n\n```text\nTabla AND (Q = A · B)    Corriente LED (5 V)\nA=0 B=0 -> Q=0 (0.0 V)   I = (5.0V - 2.0V) / 330Ω\nA=1 B=0 -> Q=0 (0.0 V)   I ≈ 9.1 mA (solo cuando Q=1)\nA=1 B=1 -> Q=1 (4.9 V)\n```\n\n¿Qué salida medirías si reemplazas la compuerta AND por una NAND con A=1 y B=1?',
    icon: 'science',
  },
  {
    domain: 'frameworks-arch',
    title: 'Frameworks y arquitectura modular',
    reason: 'Desacopla servicios, hooks y vistas en React con TypeScript.',
    question: '¿Cómo separo servicios, hooks y componentes en React con TypeScript?',
    matches: /react|typescript|framework|arquitectura|servicio|hook|modular|component|api|codigo|estado/,
    answer:
      'Define contratos puros en src/types/ y encapsula fetch o almacenamiento detrás de interfaces en src/services/.\n\n```ts\nexport interface CourseService {\n  list(): Promise<Course[]>\n}\n// La UI solo llama useWorkspace() o useAuth()\n```\n\nAsí puedes migrar módulo por módulo hacia tu backend REST cambiando únicamente el adaptador activo sin tocar componentes JSX.',
    icon: 'reading',
  },
  {
    domain: 'algorithms',
    title: 'Complejidad y estructuras de datos',
    reason: 'Evalúa eficiencia algorítmica Big-O, árboles y grafos.',
    question: '¿Cómo comparo la complejidad O(n log n) frente a O(n²) en un algoritmo?',
    matches: /algoritm|complejidad|big-o|grafo|arbol|estructura|recurs|ordenamiento|dinamica/,
    answer:
      'La notación Big-O describe cómo crecen operaciones y memoria al escalar el tamaño n de entrada.\n\n```text\nn = 1,000 registros\nO(n log n) ≈   9,966 ops  (Merge Sort / Quick Sort)\nO(n²)      = 1,000,000 ops (Bucles anidados)\n```\n\n¿Qué estructura usarías si necesitas búsquedas en O(1) promedio antes de ordenar?',
    icon: 'algorithms',
  },
]

export const defaultTutorResponse =
  'Los modelos activos pueden asistirte en Álgebra Lineal, Circuitos Digitales, Arquitectura Web y Algoritmos.\n\n```text\nComandos rápidos:\n- "Dame una pista socrática"\n- "Muéstrame la fórmula o matriz paso a paso"\n- "Verifica mi planteamiento"\n```\n\nEscribe tu duda técnica o usa una cápsula rápida debajo del chat.'
