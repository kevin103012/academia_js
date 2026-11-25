import type { DemoUser } from '../types/auth'

export const demoPassword = 'Sparks2026!'

export const demoUsers: DemoUser[] = [
  { id: 'student', name: 'Valentina Ríos', email: 'estudiante@juniorssparks.example', role: 'student', roleLabel: 'Estudiante', initials: 'VR' },
  { id: 'teacher', name: 'Mateo Salazar', email: 'docente@juniorssparks.example', role: 'teacher', roleLabel: 'Docente', initials: 'MS' },
  { id: 'coordinator', name: 'Elena Ríos', email: 'coordinacion@juniorssparks.example', role: 'coordinator', roleLabel: 'Coordinación', initials: 'ER' },
  { id: 'admin', name: 'Camila Vargas', email: 'admin@juniorssparks.example', role: 'admin', roleLabel: 'Administración', initials: 'CV' },
]
