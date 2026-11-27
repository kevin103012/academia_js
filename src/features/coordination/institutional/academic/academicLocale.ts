import { formatDate, readDate } from '../../../../utils/date'
import type { CourseFieldError, ReportField } from './academicModel'

const labels = {
  summary: ['Resumen académico', 'Academic overview'],
  summaryDescription: ['Compara las matrículas, las notas y la asistencia de los cursos de tu institución.', 'Compare enrollments, grades and attendance across your institution’s courses.'],
  reports: ['Reportes académicos', 'Academic reports'],
  reportsDescription: ['Elige los cursos y las columnas que necesitas. La vista previa muestra exactamente qué se exporta.', 'Choose the courses and columns you need. The preview shows exactly what will be exported.'],
  courses: ['Cursos', 'Courses'],
  coursesDescription: ['Organiza la oferta académica y consulta el avance de cada curso.', 'Manage your course catalog and review progress in each course.'],
  activities: ['Actividades', 'Activities'],
  activitiesDescription: ['Revisa los plazos, las entregas y las calificaciones que faltan.', 'Review deadlines, submissions and work awaiting grades.'],
  filters: ['Filtros académicos', 'Academic filters'], block: ['Bloque', 'Block'], period: ['Período', 'Period'], course: ['Curso', 'Course'],
  allBlocks: ['Todos los bloques', 'All blocks'], allPeriods: ['Todos los períodos', 'All periods'], allCourses: ['Todos los cursos', 'All courses'],
  from: ['Desde', 'From'], until: ['Hasta', 'To'],
  dateMethod: ['El rango usa la fecha de matrícula, entrega, asistencia o vencimiento, según el dato.', 'The range uses the enrollment, submission, attendance or deadline date, depending on the metric.'],
  attendanceTrend: ['Tendencia de asistencia', 'Attendance trend'],
  attendanceTrendMethod: ['Últimas ocho semanas con registros válidos. Cada fecha indica el inicio de una semana.', 'Last eight weeks with valid marks. Each date marks the start of a week.'],
  urgent: ['Seguimiento urgente', 'Urgent follow-up'], noUrgent: ['No hay pendientes urgentes para los cursos seleccionados.', 'No urgent items for the selected courses.'],
  overdueGrades: ['Entregas vencidas por calificar', 'Overdue submissions awaiting grading'],
  unresolvedIncidents: ['Incidencias sin resolver', 'Unresolved incidents'],
  reviewActivities: ['Revisar actividades', 'Review activities'], reviewIncidents: ['Revisar incidencias', 'Review incidents'],
  matchedCourses: ['Cursos en el filtro', 'Courses in view'], enrollments: ['Matrículas', 'Enrollments'], enrollment: ['Matrícula', 'Enrollment'], grade: ['Nota promedio', 'Average grade'],
  attendance: ['Asistencia', 'Attendance'], graded: ['Entregas calificadas', 'Graded submissions'], marked: ['Registros válidos', 'Valid marks'],
  courseWork: ['Actividades asignadas', 'Assigned activities'], instructor: ['Instructor', 'Instructor'],
  topEnrollments: ['Cursos con más matrículas', 'Courses with the most enrollments'], gradesByCourse: ['Nota promedio por curso', 'Average grade by course'],
  attendanceByCourse: ['Asistencia por curso', 'Attendance by course'], noMatchingCourses: ['Ningún curso coincide con estos filtros.', 'No courses match these filters.'],
  noAttendance: ['Sin asistencia registrada.', 'No attendance records.'], noGrades: ['No hay entregas calificadas.', 'No graded submissions.'],
  emptyValue: ['Sin datos', 'No data'], noActivity: ['No hay actividades para estos filtros.', 'No activities match these filters.'],
  gradeMethod: ['Cada nota se convierte a una escala porcentual antes de calcular el promedio. Las entregas sin nota no cuentan.', 'Each grade is converted to a percentage before averaging. Ungraded submissions are excluded.'],
  attendanceMethod: ['Presente y tardanza cuentan como asistencia. Ausencias cuentan en el total; faltas justificadas y días sin registro no cuentan.', 'Present and late count as attended. Absences count toward the total; excused and unrecorded days do not.'],
  enrollmentMethod: ['Una matrícula activa por estudiante y curso.', 'One active enrollment per student and course.'],
  openReport: ['Preparar reporte', 'Prepare report'], columns: ['Columnas del reporte', 'Report columns'], format: ['Formato', 'Format'],
  preview: ['Vista previa', 'Preview'], selectColumns: ['Selecciona al menos una columna para ver el reporte.', 'Select at least one column to preview the report.'],
  pdfHint: ['Elige «Guardar como PDF» en el diálogo de impresión.', 'Choose “Save as PDF” in the print dialog.'],
  export: ['Exportar reporte', 'Export report'], exporting: ['Preparando reporte…', 'Preparing report…'],
  exportError: ['No pudimos exportar el reporte. Intenta nuevamente.', 'The report couldn’t be exported. Try again.'],
  printBlocked: ['Permite las ventanas emergentes para abrir la impresión del reporte.', 'Allow pop-ups to open the print view.'],
  created: ['Curso creado.', 'Course created.'], create: ['Crear curso', 'Create course'], newCourse: ['Nuevo curso', 'New course'],
  name: ['Nombre del curso', 'Course name'], category: ['Categoría', 'Category'], chooseCategory: ['Selecciona una categoría', 'Select a category'],
  chooseTeacher: ['Selecciona un instructor', 'Select an instructor'], choosePeriod: ['Selecciona un período', 'Select a period'],
  startDate: ['Fecha de inicio', 'Start date'], endDate: ['Fecha de fin', 'End date'], days: ['Días de clase', 'Class days'],
  startTime: ['Hora de inicio', 'Start time'], endTime: ['Hora de fin', 'End time'], description: ['Descripción (opcional)', 'Description (optional)'],
  save: ['Guardar curso', 'Save course'], saving: ['Guardando…', 'Saving…'], cancel: ['Cancelar', 'Cancel'],
  courseError: ['No pudimos crear el curso. Revisa los datos e intenta nuevamente.', 'The course couldn’t be created. Check the details and try again.'],
  missingSetup: ['Necesitas al menos un instructor y un período en tu institución para crear un curso.', 'Your institution needs at least one instructor and academic period before you can create a course.'],
  lessons: ['Clases', 'Lessons'], noLessons: ['Este curso aún no tiene clases registradas.', 'No lessons have been recorded for this course.'],
  noCourseActivities: ['Este curso aún no tiene actividades asignadas.', 'No activities have been assigned for this course.'],
  courseAttendance: ['Asistencia por estudiante', 'Attendance by student'], student: ['Estudiante', 'Student'], studentUnknown: ['Estudiante sin nombre disponible', 'Student name unavailable'],
  attended: ['Asistencias', 'Attended'], noRoster: ['No hay matrículas ni registros de asistencia para este curso.', 'This course has no enrollments or attendance records.'],
  schedule: ['Horario', 'Schedule'], noSchedule: ['Horario sin registrar', 'No schedule recorded'],
  duration: ['Duración', 'Duration'], notSpecified: ['No especificado', 'Not specified'],
  due: ['Vencimiento', 'Deadline'], noDeadline: ['Sin fecha límite', 'No deadline'], duePassed: ['Plazo vencido', 'Past deadline'], dueOpen: ['Plazo vigente', 'Deadline open'],
  dueStatus: ['Estado del plazo', 'Deadline status'], statusAll: ['Todos los estados', 'All statuses'],
  submissions: ['Entregas', 'Submissions'], pending: ['Por calificar', 'Awaiting grading'],
} as const

const errorLabels: Record<CourseFieldError, readonly [string, string]> = {
  name: ['El nombre del curso debe tener entre 1 y 100 caracteres.', 'The course name must be 1–100 characters.'],
  category: ['Selecciona una categoría válida.', 'Select a valid category.'],
  teacher: ['Selecciona un instructor de tu institución.', 'Select an instructor from your institution.'],
  block: ['Indica un bloque académico de hasta 90 caracteres.', 'Enter an academic block of up to 90 characters.'],
  period: ['Selecciona un período académico válido.', 'Select a valid academic period.'],
  dates: ['Indica fechas dentro del período y una fecha de fin igual o posterior a la de inicio.', 'Enter dates within the period and an end date on or after the start date.'],
  schedule: ['Selecciona al menos un día y una hora de fin posterior a la de inicio.', 'Select at least one day and an end time after the start time.'],
  scheduleDates: ['Cada día seleccionado debe ocurrir al menos una vez dentro de las fechas del curso.', 'Each selected weekday must occur at least once within the course dates.'],
}

const reportLabelKeys: Record<ReportField, keyof typeof labels> = {
  course: 'course', instructor: 'instructor', block: 'block', period: 'period', enrolled: 'enrollments',
  activities: 'courseWork', graded: 'graded', average: 'grade', attendanceRate: 'attendance', marked: 'marked',
}
const englishCategories: Record<string, string> = {
  matematica: 'Mathematics and Data Science', hardware: 'Hardware and Embedded Systems',
  frameworks: 'Frameworks and Architecture', algoritmos: 'Algorithms and Languages',
}

export type AcademicCopy = ReturnType<typeof academicCopy>

export function academicCopy(language: string) {
  const en = language === 'en'
  const locale = en ? 'en' : 'es-PE'
  const index = en ? 1 : 0
  const t = (key: keyof typeof labels) => labels[key][index]
  const number = new Intl.NumberFormat(locale, { maximumFractionDigits: 2 })
  const weekday = new Intl.DateTimeFormat(locale, { weekday: 'short', timeZone: 'UTC' })
  return {
    t, locale, formatNumber: (value: number) => number.format(value),
    percent: (value: number | null) => value === null ? t('emptyValue') : number.format(value) + '%',
    date: (value: string, fallback = t('notSpecified')) => {
      const key = (value ?? '').slice(0, 10)
      if (!/^\d{4}-\d{2}-\d{2}$/.test(key) || Number.isNaN(readDate(key).getTime())) return fallback
      const options = { day: 'numeric', month: 'short', year: 'numeric' } as const
      return en ? new Intl.DateTimeFormat(locale, options).format(readDate(key)) : formatDate(key, options)
    },
    weekday: (day: number) => weekday.format(new Date(Date.UTC(2024, 0, day))),
    field: (field: ReportField) => t(reportLabelKeys[field]) + (field === 'average' || field === 'attendanceRate' ? ' (%)' : ''),
    error: (error: CourseFieldError) => errorLabels[error][index],
    category: (id: string, fallback: string) => en ? englishCategories[id] ?? fallback : fallback,
  }
}
