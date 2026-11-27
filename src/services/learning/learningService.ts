import { env } from '../../config/env'
import { materials, orientationMaterial, passingScore } from '../../data/learningCatalog'
import type { CourseMaterial, LearningEntry } from '../../types/learning'
import type { Course } from '../../types/workspace'
import { apiClient } from '../http/apiClient'

export { passingScore }

type CourseContent = Pick<Course, 'id' | 'lessons'>

function catalogMaterial(courseId: string): CourseMaterial {
  return Object.hasOwn(materials, courseId) ? materials[courseId] : orientationMaterial
}

/** Temario vigente: las lecciones del docente sustituyen a las del catálogo. */
export function courseMaterial(course: CourseContent): CourseMaterial {
  const base = catalogMaterial(course.id)
  return course.lessons?.length ? { ...base, lessons: course.lessons } : base
}

export function courseLessons(course: CourseContent) {
  return courseMaterial(course).lessons
}

export function completedLessonCount(course: CourseContent, entry?: LearningEntry) {
  return courseLessons(course).filter((lesson) => entry?.lessons.includes(lesson.id)).length
}

export function isOrientation(courseId: string) {
  return !Object.hasOwn(materials, courseId)
}

export interface LearningService {
  getCourseMaterial(courseId: string): Promise<CourseMaterial>
}

const localLearningService: LearningService = {
  async getCourseMaterial(courseId) {
    return catalogMaterial(courseId)
  },
}

const httpLearningService: LearningService = {
  getCourseMaterial: (courseId) => apiClient.get<CourseMaterial>(`/courses/${encodeURIComponent(courseId)}/material`),
}

export const learningService: LearningService = env.useMocks ? localLearningService : httpLearningService
