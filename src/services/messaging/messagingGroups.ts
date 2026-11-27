import type { MessageContact, MessageGroup } from '../../types/messaging'

const compare = (a: string, b: string) => a.localeCompare(b, 'es')

/**
 * Grupos a los que puede escribir un usuario, derivados de sus contactos (quien comparte curso).
 * - Alumno: «Todos mis profesores» y «Mis compañeros de curso» (uno por curso).
 * - Docente: «Todo el curso» (uno por curso) y «Todos mis alumnos» si tiene más de un curso.
 * Un grupo sin integrantes no se ofrece.
 */
export function listGroups(role: 'student' | 'teacher', contacts: MessageContact[]): MessageGroup[] {
  const toMember = (contact: MessageContact) => ({ id: contact.id, name: contact.name })
  const courseNames = [...new Set(contacts.flatMap((contact) => contact.courseNames))].sort(compare)
  const groups: MessageGroup[] = []

  if (role === 'student') {
    const teachers = contacts.filter((contact) => contact.role === 'teacher')
    if (teachers.length) {
      groups.push({
        id: 'all-teachers',
        kind: 'all-teachers',
        label: 'Todos mis profesores',
        description: `${teachers.length} docente${teachers.length === 1 ? '' : 's'} de tus cursos`,
        members: teachers.map(toMember),
      })
    }
    for (const course of courseNames) {
      const classmates = contacts.filter((contact) => contact.role === 'student' && contact.courseNames.includes(course))
      if (!classmates.length) continue
      groups.push({
        id: `classmates:${encodeURIComponent(course)}`,
        kind: 'course-classmates',
        label: `Mis compañeros de curso · ${course}`,
        description: `${classmates.length} compañero${classmates.length === 1 ? '' : 's'}`,
        members: classmates.map(toMember),
      })
    }
  } else {
    for (const course of courseNames) {
      const students = contacts.filter((contact) => contact.role === 'student' && contact.courseNames.includes(course))
      if (!students.length) continue
      groups.push({
        id: `students:${encodeURIComponent(course)}`,
        kind: 'course-students',
        label: `Todo el curso · ${course}`,
        description: `${students.length} alumno${students.length === 1 ? '' : 's'}`,
        members: students.map(toMember),
      })
    }
    const everyone = contacts.filter((contact) => contact.role === 'student')
    if (courseNames.length > 1 && everyone.length) {
      groups.push({
        id: 'all-students',
        kind: 'all-students',
        label: 'Todos mis alumnos',
        description: `${everyone.length} alumnos de ${courseNames.length} cursos`,
        members: everyone.map(toMember),
      })
    }
  }

  return groups
}
