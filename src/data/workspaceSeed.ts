import type { Workspace } from '../types/workspace'
import { dateAt } from '../utils/date'

export function createInitialWorkspace(): Workspace {
  return {
    courses: [
      { id: 'science', name: 'Circuitos Digitales y Hardware', group: 'Ing. de Sistemas · Ciclo IV', teacher: 'Mateo Salazar', color: 'teal', description: 'Analiza compuertas lógicas, circuitos electrónicos y arquitectura de microcontroladores.' },
      { id: 'math', name: 'Álgebra Lineal Aplicada', group: 'Ing. de Sistemas · Ciclo III', teacher: 'Mateo Salazar', color: 'gold', description: 'Domina matrices, sistemas lineales, transformaciones, autovalores y vectores en computación.' },
      { id: 'language', name: 'Frameworks y Arquitectura Web', group: 'Ing. de Sistemas · Ciclo VI', teacher: 'Mateo Salazar', color: 'blue', description: 'Construye aplicaciones modulares con TypeScript, React, APIs REST y arquitectura limpia.' },
    ],
    activities: [
      { id: 'circuit', courseId: 'science', title: 'Simulación de circuito lógico y LED', instructions: 'Diseña un circuito con una pila, un interruptor y una compuerta AND previa al LED. Explica la tabla de verdad y qué ocurre al abrir el interruptor.', due: dateAt(2) },
      { id: 'proportions', courseId: 'math', title: 'Resolución matricial por Gauss-Jordan', instructions: 'Resuelve un sistema de 3 ecuaciones con 3 incógnitas mediante operaciones elementales por filas, indica el rango y verifica la solución.', due: dateAt(4) },
      { id: 'journal', courseId: 'language', title: 'Refactorización modular en React y TypeScript', instructions: 'Separa un componente monolítico en capas types/, services/ y hooks/ manteniendo el estado desacoplado de localStorage.', due: dateAt(-3) },
    ],
    submissions: [
      { id: 'sample-journal', activityId: 'journal', studentId: 'student', content: 'Aislé la persistencia en apiClient y localStore para poder activar un backend REST con VITE_API_URL sin modificar los hooks.', submittedAt: dateAt(-4), score: 18, feedback: 'Buena separación de interfaces y adaptadores. En la siguiente entrega incluye manejo tipado de errores HTTP.' },
    ],
    notices: [
      { id: 'lab', title: 'Práctica en laboratorio de hardware', content: 'Para la sesión del jueves trae el esquema de compuertas lógicas y el protoboard. El laboratorio proveerá los sensores y LEDs.', author: 'Mateo Salazar', date: dateAt(-1) },
      { id: 'families', title: 'Actualización de modelos IA para tutoría', content: 'El equipo de administración activó los modelos especializados en Álgebra Lineal y Circuitos Digitales dentro del Tutor de estudio.', author: 'Camila Vargas', date: dateAt(-3) },
    ],
    events: [
      { id: 'lab-event', title: 'Laboratorio de circuitos digitales', date: dateAt(2), time: '09:00', location: 'Laboratorio de Hardware 204' },
      { id: 'families-event', title: 'Revisión de arquitectura y APIs', date: dateAt(6), time: '16:30', location: 'Sala de Sistemas B' },
    ],
    attendance: [
      { studentId: 'student', date: dateAt(-3), status: 'Presente' },
      { studentId: 'student', date: dateAt(-2), status: 'Presente' },
      { studentId: 'student', date: dateAt(-1), status: 'Tardanza' },
    ],
    students: [
      { id: 'student', name: 'Valentina Ríos', group: 'Ing. de Sistemas · Ciclo III' },
      { id: 'sofia', name: 'Sofía Mendoza', group: 'Ing. de Sistemas · Ciclo III' },
      { id: 'diego', name: 'Diego Torres', group: 'Ing. de Sistemas · Ciclo IV' },
    ],
    progress: { science: { enrolled: true, lessons: ['circuit-basics'] } },
    audit: [],
  }
}
