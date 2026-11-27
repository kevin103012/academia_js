import type { Course, Student, Workspace } from '../types/workspace'

// En la demo, workspace.progress guarda las matrículas de un único alumno.
// Con backend, reemplazar por la lista real de matrículas de cada curso.
const demoStudentId = 'student'

function hasSubmitted(workspace: Workspace, courseId: string, studentId: string) {
  return workspace.submissions.some(
    (submission) =>
      submission.studentId === studentId &&
      workspace.activities.some((activity) => activity.id === submission.activityId && activity.courseId === courseId),
  )
}

/**
 * Alumnos de un curso: el alumno de la demo si está matriculado, los demás del padrón
 * si su grupo coincide con el del curso, y cualquiera que ya haya entregado algo.
 */
export function belongsToCourse(workspace: Workspace, course: Course, student: Pick<Student, 'id' | 'group'>) {
  const member =
    student.id === demoStudentId ? Boolean(workspace.progress[course.id]?.enrolled) : student.group === course.group
  return member || hasSubmitted(workspace, course.id, student.id)
}

export function courseRoster(workspace: Workspace, course: Course) {
  return workspace.students.filter((student) => belongsToCourse(workspace, course, student))
}
