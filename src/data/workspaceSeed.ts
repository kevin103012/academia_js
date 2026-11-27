import type { Workspace } from '../types/workspace'
import { dateAt } from '../utils/date'

export function createInitialWorkspace(): Workspace {
  return {
    courses: [
      {
        id: 'science',
        category: 'hardware',
        name: 'Sistemas Digitales y Microcontroladores ESP32',
        group: 'Ing. de Sistemas · Ciclo IV',
        teacher: 'Mateo Salazar',
        color: 'teal',
        description: 'Diseña circuitos con compuertas lógicas, sensores digitales, PWM y telemetría básica en ESP32.',
      },
      {
        id: 'fpga',
        category: 'hardware',
        name: 'Diseño Lógico con VHDL y FPGA',
        group: 'Ing. de Sistemas · Ciclo V',
        teacher: 'Carlos Huamán',
        color: 'teal',
        description: 'Implementa máquinas de estado, sumadores combinacionales y síntesis de hardware programable.',
      },
      {
        id: 'math',
        category: 'matematica',
        name: 'Álgebra Lineal con Python y NumPy',
        group: 'Ing. de Sistemas · Ciclo III',
        teacher: 'Mateo Salazar',
        color: 'gold',
        description: 'Resuelve sistemas lineales por Gauss-Jordan, transformaciones y autovalores aplicados a ML.',
      },
      {
        id: 'calculus',
        category: 'matematica',
        name: 'Cálculo Multivariable y Optimización',
        group: 'Ing. de Sistemas · Ciclo IV',
        teacher: 'Elena Quispe',
        color: 'gold',
        description: 'Modela gradientes, jacobianos y descenso de gradiente para funciones de pérdida en IA.',
      },
      {
        id: 'language',
        category: 'frameworks',
        name: 'Desarrollo Full-Stack con React 19 y TypeScript',
        group: 'Ing. de Sistemas · Ciclo VI',
        teacher: 'Mateo Salazar',
        color: 'blue',
        description: 'Construye aplicaciones modulares con React Router, contratos tipados, hooks y consumo de APIs REST.',
      },
      {
        id: 'nestjs',
        category: 'frameworks',
        name: 'Arquitectura Hexagonal y Microservicios con NestJS',
        group: 'Ing. de Sistemas · Ciclo VI',
        teacher: 'Sofía Alarcón',
        color: 'blue',
        description: 'Desacopla casos de uso, puertos, adaptadores PostgreSQL y colas de eventos en servicios escalables.',
      },
      {
        id: 'algorithms-cpp',
        category: 'algoritmos',
        name: 'Estructuras de Datos y Grafos en C++',
        group: 'Ing. de Sistemas · Ciclo IV',
        teacher: 'Carlos Huamán',
        color: 'teal',
        description: 'Domina árboles balanceados, Dijkstra, programación dinámica y análisis de complejidad Big-O.',
      },
    ],
    activities: [
      {
        id: 'circuit',
        courseId: 'science',
        title: 'Control lógico de relé y LED con ESP32',
        instructions:
          'Diseña un circuito con compuerta AND previa al LED indicador y verifica en la tabla de verdad qué nivel de entrada habilita la salida a 4.9 V.',
        due: dateAt(2),
      },
      {
        id: 'proportions',
        courseId: 'math',
        title: 'Escalonado de matriz aumentada con NumPy',
        instructions:
          'Resuelve un sistema 3×3 por Gauss-Jordan, calcula su determinante y contrasta el rango obtenido.',
        due: dateAt(4),
      },
      {
        id: 'journal',
        courseId: 'language',
        title: 'Desacoplamiento de authService en React 19 + TS',
        instructions:
          'Separa el contrato AuthService en src/services/auth/ y consume el estado desde useAuth() sin tocar localStorage desde la vista.',
        due: dateAt(-3),
      },
    ],
    submissions: [
      {
        id: 'sample-journal',
        activityId: 'journal',
        studentId: 'student',
        content:
          'Aislé la persistencia en apiClient y localStore para poder activar un backend REST con VITE_API_URL sin modificar los hooks.',
        submittedAt: dateAt(-4),
        score: 18,
        feedback: 'Buena separación de interfaces y adaptadores. En la siguiente entrega incluye manejo tipado de errores HTTP.',
      },
    ],
    notices: [
      {
        id: 'lab',
        title: 'Práctica de laboratorio con placas ESP32',
        content:
          'Para la sesión del jueves trae el esquema de compuertas lógicas y cable USB-C. El laboratorio proveerá los protoboards, resistencias de 330 Ω y LEDs.',
        author: 'Mateo Salazar',
        date: dateAt(-1),
      },
      {
        id: 'families',
        title: 'Nuevos grupos activos en Comunidad técnica',
        content:
          'Ya están abiertos los canales de Club de Álgebra Lineal, Laboratorio ESP32 y Arquitectura React 19 para resolver dudas con mentores.',
        author: 'Camila Vargas',
        date: dateAt(-3),
      },
    ],
    events: [
      {
        id: 'lab-event',
        title: 'Laboratorio ESP32 y compuertas digitales',
        date: dateAt(2),
        time: '09:00',
        endTime: '11:00',
        category: 'Clase',
        audience: 'campus',
        location: 'Laboratorio de Hardware 204',
      },
      {
        id: 'families-event',
        title: 'Code Review: NestJS y React 19',
        date: dateAt(6),
        time: '16:30',
        endTime: '18:00',
        category: 'Reunión',
        audience: 'campus',
        location: 'Sala de Sistemas B',
      },
    ],
    attendance: [
      { courseId: 'science', studentId: 'student', date: dateAt(-3), status: 'Presente' },
      { courseId: 'science', studentId: 'student', date: dateAt(-2), status: 'Presente' },
      { courseId: 'science', studentId: 'student', date: dateAt(-1), status: 'Tardanza' },
    ],
    students: [
      { id: 'student', name: 'Valentina Ríos', group: 'Ing. de Sistemas · Ciclo III' },
      { id: 'sofia', name: 'Sofía Mendoza', group: 'Ing. de Sistemas · Ciclo III' },
      { id: 'diego', name: 'Diego Torres', group: 'Ing. de Sistemas · Ciclo IV' },
    ],
    progress: {
      science: { enrolled: true, lessons: ['circuit-basics'] },
      language: { enrolled: true, lessons: ['reading-main-idea'] },
    },
    audit: [],
  }
}
