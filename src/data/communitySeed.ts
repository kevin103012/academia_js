import type { CommunityGroup, CommunityState } from '../types/community'

const seedTime = (time: string) => Date.parse(`2026-11-20T${time}:00-05:00`)

// Cuentas demo que ya pertenecían a estos grupos antes de los mensajes de ejemplo.
const demoMembers = () => {
  const joinedAt = Date.parse('2026-11-01T00:00:00-05:00')
  return [
    { userId: 'student', name: 'Valentina Ríos', joinedAt },
    { userId: 'teacher', name: 'Mateo Salazar', joinedAt },
  ]
}

export function createInitialCommunityState(): CommunityState {
  const groups: CommunityGroup[] = [
    {
      id: 'comm-linalg',
      name: 'Club de Álgebra Lineal y NumPy',
      category: 'matematica',
      categoryLabel: 'Matemática y Ciencia de Datos',
      description: 'Resuelve sistemas por Gauss-Jordan, autovalores y notebooks vectoriales con NumPy.',
      tags: ['#NumPy', '#GaussJordan', '#Autovalores'],
      memberCount: 64,
      onlineCount: 14,
      mentorName: 'Mateo Salazar',
      pinnedNote: 'Reto semanal: diagonalizar una matriz simétrica 3×3 y graficar sus autovectores en Python.',
      members: demoMembers(),
      messages: [
        {
          id: 'm-1',
          authorId: 'teacher',
          createdAt: seedTime('09:15'),
          author: 'Mateo Salazar',
          authorRole: 'Docente',
          initials: 'MS',
          sentAt: '09:15',
          text: 'Recuerden comprobar el número de pivotes antes de asumir independencia lineal.\n\n```python\nimport numpy as np\nA = np.array([[2, 1], [4, 3]])\nprint("Rango:", np.linalg.matrix_rank(A))\n```',
        },
        {
          id: 'm-2',
          authorId: 'sofia',
          createdAt: seedTime('09:22'),
          author: 'Sofía Mendoza',
          authorRole: 'Estudiante',
          initials: 'SM',
          sentAt: '09:22',
          text: '¡Confirmado! En el laboratorio Split-Screen me dio Rango = 2 y det(A) = 2.0.',
        },
      ],
    },
    {
      id: 'comm-esp32',
      name: 'Laboratorio ESP32, Arduino y PCB',
      category: 'hardware',
      categoryLabel: 'Hardware y Sistemas Embebidos',
      description: 'Esquemas de compuertas, cálculo de resistencias, PWM y lectura de sensores digitales.',
      tags: ['#ESP32', '#Compuertas', '#Protoboard'],
      memberCount: 52,
      onlineCount: 11,
      mentorName: 'Carlos Huamán',
      pinnedNote: 'Antes de energizar tu ESP32, valida 3.3 V / 5 V en pines GPIO y resistencia limitadora.',
      members: demoMembers(),
      messages: [
        {
          id: 'm-3',
          authorId: 'diego',
          createdAt: seedTime('10:04'),
          author: 'Diego Torres',
          authorRole: 'Estudiante',
          initials: 'DT',
          sentAt: '10:04',
          text: 'Chicos, ¿qué resistencia usan para limitar un LED azul con salida de 5 V de compuerta AND?',
        },
        {
          id: 'm-4',
          authorId: 'seed:Carlos Huamán',
          createdAt: seedTime('10:07'),
          author: 'Carlos Huamán',
          authorRole: 'Docente',
          initials: 'CH',
          sentAt: '10:07',
          text: 'Usa 330 Ω o 220 Ω para mantener la corriente segura.\n\n```text\nI = (5.0V - 2.0V) / 330Ω ≈ 9.1 mA\n```',
        },
      ],
    },
    {
      id: 'comm-react',
      name: 'Arquitectura Clean, React 19 y TypeScript',
      category: 'frameworks',
      categoryLabel: 'Frameworks y Arquitectura',
      description: 'Separación de capas, hooks reutilizables, contratos REST tipados y testing modular.',
      tags: ['#React19', '#TypeScript', '#CleanArch'],
      memberCount: 79,
      onlineCount: 19,
      mentorName: 'Sofía Alarcón',
      pinnedNote: 'Regla del canal: toda persistencia va encapsulada en src/services/, nunca directo en JSX.',
      members: demoMembers(),
      messages: [
        {
          id: 'm-5',
          authorId: 'seed:Sofía Alarcón',
          createdAt: seedTime('11:30'),
          author: 'Sofía Alarcón',
          authorRole: 'Mentor',
          initials: 'SA',
          sentAt: '11:30',
          text: 'Comparto el patrón base de adaptador HTTP vs. Mock por variable de entorno:\n\n```ts\nexport const courseService = env.useMocks ? localService : httpService\n```',
        },
      ],
    },
    {
      id: 'comm-cpp',
      name: 'Programación Competitiva y Grafos C++',
      category: 'algoritmos',
      categoryLabel: 'Algoritmos y Lenguajes',
      description: 'Entrenamiento con Dijkstra, programación dinámica, segment trees y complejidad Big-O.',
      tags: ['#C++20', '#Grafos', '#BigO'],
      memberCount: 45,
      onlineCount: 9,
      mentorName: 'Carlos Huamán',
      pinnedNote: 'Sesión práctica todos los viernes 18:00: 3 problemas de caminos mínimos.',
      members: [],
      messages: [
        {
          id: 'm-6',
          authorId: 'seed:Carlos Huamán',
          createdAt: seedTime('14:10'),
          author: 'Carlos Huamán',
          authorRole: 'Docente',
          initials: 'CH',
          sentAt: '14:10',
          text: 'Bienvenidos al grupo de Grafos. Empiecen implementando listas de adyacencia con vector<pair<int,int>>.',
        },
      ],
    },
    {
      id: 'comm-nestjs',
      name: 'Microservicios con NestJS, Docker y SQL',
      category: 'frameworks',
      categoryLabel: 'Frameworks y Arquitectura',
      description: 'Puertos hexagonales, migraciones PostgreSQL, autenticación JWT y contenedores Docker.',
      tags: ['#NestJS', '#PostgreSQL', '#Docker'],
      memberCount: 58,
      onlineCount: 12,
      mentorName: 'Sofía Alarcón',
      pinnedNote: 'Guía de Docker Compose para levantar API NestJS + PostgreSQL 16 publicada en avisos.',
      members: [],
      messages: [
        {
          id: 'm-7',
          authorId: 'seed:Sofía Alarcón',
          createdAt: seedTime('15:00'),
          author: 'Sofía Alarcón',
          authorRole: 'Mentor',
          initials: 'SA',
          sentAt: '15:00',
          text: '¿Alguien ya conectó su módulo de AuthService con tokens JWT reales en NestJS?',
        },
      ],
    },
    {
      id: 'comm-grad',
      name: 'Cálculo Multivariable y Redes Neuronales',
      category: 'matematica',
      categoryLabel: 'Matemática y Ciencia de Datos',
      description: 'Derivadas parciales, regla de la cadena en backpropagation y ajuste de tasa de aprendizaje.',
      tags: ['#Gradient', '#Backprop', '#MathML'],
      memberCount: 39,
      onlineCount: 7,
      mentorName: 'Elena Quispe',
      pinnedNote: 'Compara curvas de Val Loss vs. Train Loss con el laboratorio neuronal de Administración.',
      members: [],
      messages: [
        {
          id: 'm-8',
          authorId: 'seed:Elena Quispe',
          createdAt: seedTime('16:20'),
          author: 'Elena Quispe',
          authorRole: 'Docente',
          initials: 'EQ',
          sentAt: '16:20',
          text: 'Cuando Val Loss sube mientras Train Loss baja, aplica Dropout (15%) o poda selectiva.',
        },
      ],
    },
  ]

  return {
    groups,
    activeGroupId: groups[0].id,
  }
}
