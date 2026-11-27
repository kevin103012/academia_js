import { env } from '../../config/env'
import { materials, orientationMaterial, passingScore } from '../../data/learningCatalog'
import type { CourseMaterial, LearningEntry, Lesson, LessonLabKind } from '../../types/learning'
import { apiClient } from '../http/apiClient'
import { localStore } from '../storage/localStore'
import { getSupabaseClient } from '../supabase/supabaseClient'

export { passingScore }

const CUSTOM_MATERIALS_KEY = 'junior-sparks:custom-course-materials:v1'

function loadMaterialOverrides(): Record<string, CourseMaterial> {
  return localStore.getJson<Record<string, CourseMaterial>>(CUSTOM_MATERIALS_KEY) ?? {}
}

export function courseMaterial(courseId: string): CourseMaterial {
  const custom = loadMaterialOverrides()
  if (Object.hasOwn(custom, courseId)) {
    return custom[courseId]
  }
  return Object.hasOwn(materials, courseId) ? materials[courseId] : orientationMaterial
}

export function courseLessons(courseId: string) {
  return courseMaterial(courseId).lessons
}

export function completedLessonCount(courseId: string, entry?: LearningEntry) {
  return courseLessons(courseId).filter((lesson) => entry?.lessons.includes(lesson.id)).length
}

export function isOrientation(courseId: string) {
  const custom = loadMaterialOverrides()
  return !Object.hasOwn(custom, courseId) && !Object.hasOwn(materials, courseId)
}

export interface LearningService {
  getCourseMaterial(courseId: string): Promise<CourseMaterial>
  saveCourseMaterial(courseId: string, material: CourseMaterial): Promise<CourseMaterial>
  hydrateCourseMaterialFromSupabase(courseId: string): Promise<CourseMaterial>
}

function parseDurationSec(duration?: string): number {
  if (!duration) return 390
  const [m, s] = duration.split(':').map((n) => Number(n))
  if (Number.isFinite(m) && Number.isFinite(s)) return Math.max(30, m * 60 + s)
  return 390
}

function formatDurationSec(sec?: number): string {
  if (!sec || !Number.isFinite(sec)) return '06:30'
  const m = Math.floor(sec / 60)
  const s = sec % 60
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

const localLearningService: LearningService = {
  async getCourseMaterial(courseId) {
    return courseMaterial(courseId)
  },
  async saveCourseMaterial(courseId, material) {
    const custom = loadMaterialOverrides()
    custom[courseId] = material
    const supabase = getSupabaseClient()
    if (supabase && material.lessons.length > 0) {
      const rows = material.lessons.map((lesson, idx) => ({
        id: lesson.id,
        course_id: courseId,
        position: idx + 1,
        title: lesson.title,
        summary: lesson.summary ?? '',
        minutes: Math.max(1, lesson.minutes || 8),
        video_url: lesson.videoUrl?.trim() ?? '',
        video_title: lesson.videoTitle?.trim() ?? '',
        video_duration_sec: parseDurationSec(lesson.videoDuration),
        reading: lesson.reading ?? [],
        theory_blocks: {
          sublessons: lesson.sublessons ?? [],
          exercises: lesson.exercises ?? [],
        },
        exercise: lesson.exercise ?? '',
        formula_or_code: lesson.formulaOrCode ?? null,
        key_steps: lesson.keySteps ?? [],
        lab_kind: lesson.labKind ?? 'architecture',
        lab_goal: lesson.labGoal ?? null,
        lab_hint: lesson.labHint ?? null,
        questions: idx === 0 ? material.questions ?? [] : [],
      }))
      const { error } = await supabase.from('course_lessons').upsert(rows, { onConflict: 'id' })
      if (error) {
        throw new Error(`No se pudo guardar en Supabase: ${error.message}`)
      }
    }
    localStore.setJson(CUSTOM_MATERIALS_KEY, custom)
    return material
  },
  async hydrateCourseMaterialFromSupabase(courseId) {
    const supabase = getSupabaseClient()
    if (!supabase) return courseMaterial(courseId)
    const { data, error } = await supabase
      .from('course_lessons')
      .select('*')
      .eq('course_id', courseId)
      .order('position', { ascending: true })
    if (error || !data || data.length === 0) {
      return courseMaterial(courseId)
    }
    const base = courseMaterial(courseId)
    const lessons: Lesson[] = data.map((row) => {
      const theoryExtra = (row.theory_blocks as {
        sublessons?: Lesson['sublessons']
        exercises?: Lesson['exercises']
      } | null) ?? {}
      const matchingBase = base.lessons.find((l) => l.id === row.id)
      return {
        id: String(row.id),
        title: String(row.title),
        summary: String(row.summary ?? ''),
        minutes: Number(row.minutes ?? 8),
        videoUrl: row.video_url ? String(row.video_url) : matchingBase?.videoUrl,
        videoTitle: row.video_title ? String(row.video_title) : matchingBase?.videoTitle,
        videoDuration:
          typeof row.video_duration_sec === 'number' && row.video_duration_sec > 0
            ? formatDurationSec(row.video_duration_sec)
            : matchingBase?.videoDuration ?? '06:30',
        reading: Array.isArray(row.reading) && row.reading.length ? row.reading.map(String) : matchingBase?.reading ?? [''],
        sublessons: Array.isArray(theoryExtra.sublessons)
          ? theoryExtra.sublessons
          : matchingBase?.sublessons,
        exercise: String(row.exercise ?? matchingBase?.exercise ?? ''),
        exercises: Array.isArray(theoryExtra.exercises)
          ? theoryExtra.exercises
          : matchingBase?.exercises,
        formulaOrCode: row.formula_or_code ? String(row.formula_or_code) : matchingBase?.formulaOrCode,
        keySteps: Array.isArray(row.key_steps) && row.key_steps.length ? row.key_steps.map(String) : matchingBase?.keySteps,
        labKind: (row.lab_kind as LessonLabKind) ?? matchingBase?.labKind ?? 'architecture',
        labGoal: row.lab_goal ? String(row.lab_goal) : matchingBase?.labGoal,
        labHint: row.lab_hint ? String(row.lab_hint) : matchingBase?.labHint,
      }
    })
    const firstQuestions = Array.isArray(data[0]?.questions) && data[0].questions.length
      ? (data[0].questions as CourseMaterial['questions'])
      : base.questions
    const merged: CourseMaterial = { lessons, questions: firstQuestions }
    const custom = loadMaterialOverrides()
    custom[courseId] = merged
    localStore.setJson(CUSTOM_MATERIALS_KEY, custom)
    return merged
  },
}

const httpLearningService: LearningService = {
  getCourseMaterial: (courseId) => apiClient.get<CourseMaterial>(`/courses/${encodeURIComponent(courseId)}/material`),
  saveCourseMaterial: (courseId, material) =>
    apiClient.put<CourseMaterial>(`/courses/${encodeURIComponent(courseId)}/material`, material),
  hydrateCourseMaterialFromSupabase: (courseId) => localLearningService.hydrateCourseMaterialFromSupabase(courseId),
}

export const learningService: LearningService =
  env.apiUrl && !env.hasSupabase ? httpLearningService : localLearningService
