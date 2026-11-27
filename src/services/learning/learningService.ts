import { env } from '../../config/env'
import { materials, orientationMaterial, passingScore } from '../../data/learningCatalog'
import type { CourseMaterial, LearningEntry } from '../../types/learning'
import { apiClient } from '../http/apiClient'

export { passingScore }

export function courseMaterial(courseId: string): CourseMaterial {
  return Object.hasOwn(materials, courseId) ? materials[courseId] : orientationMaterial
}

export function courseLessons(courseId: string) {
  return courseMaterial(courseId).lessons
}

export function completedLessonCount(courseId: string, entry?: LearningEntry) {
  return courseLessons(courseId).filter((lesson) => entry?.lessons.includes(lesson.id)).length
}

export function isOrientation(courseId: string) {
  return !Object.hasOwn(materials, courseId)
}

export interface LearningService {
  getCourseMaterial(courseId: string): Promise<CourseMaterial>
}

const localLearningService: LearningService = {
  async getCourseMaterial(courseId) {
    return courseMaterial(courseId)
  },
}

const httpLearningService: LearningService = {
  getCourseMaterial: (courseId) => apiClient.get<CourseMaterial>(`/courses/${encodeURIComponent(courseId)}/material`),
}

export const learningService: LearningService = env.useMocks ? localLearningService : httpLearningService
