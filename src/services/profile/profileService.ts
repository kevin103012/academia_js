import { env } from '../../config/env'
import type { DemoRole, DemoUser } from '../../types/auth'
import { localStore } from '../storage/localStore'
import { getSupabaseClient } from '../supabase/supabaseClient'

export interface ProfileSocialLinks {
  github?: string
  linkedin?: string
  instagram?: string
  portfolio?: string
}

export interface UserProfileDetails {
  id: string
  fullName: string
  email: string
  initials: string
  role: DemoRole
  roleLabel: string
  academicBlock: string
  institution: string
  bio: string
  socialLinks: ProfileSocialLinks
  publicActivities: string[]
  isProfilePublic: boolean
  activeCourseIds: string[]
  completedCourseIds: string[]
}

const PROFILE_CACHE_PREFIX = 'junior-sparks:profile:v1:'
const DIRECTORY_CACHE_KEY = 'junior-sparks:profile-directory:v1'
const profileColumns = 'id,full_name,initials,role,role_label,academic_block,institution,bio,social_links,public_activities,is_profile_public'

function defaultProfileFromUser(user: DemoUser): UserProfileDetails {
  return {
    id: user.id,
    fullName: user.name,
    email: user.email,
    initials: user.initials,
    role: user.role,
    roleLabel: user.roleLabel,
    academicBlock: user.role === 'student' ? 'Ing. de Sistemas · Ciclo III' : 'Facultad de Sistemas',
    institution: 'SENATI · Ingeniería de Sistemas',
    bio: '',
    socialLinks: {},
    publicActivities: [],
    isProfilePublic: user.role === 'student',
    activeCourseIds: [],
    completedCourseIds: [],
  }
}

const fallbackDirectory: UserProfileDetails[] = [
  {
    id: 'student',
    fullName: 'Valentina Ríos',
    email: 'estudiante@juniorssparks.example',
    initials: 'VR',
    role: 'student',
    roleLabel: 'Estudiante',
    academicBlock: 'Ing. de Sistemas · Ciclo III',
    institution: 'SENATI · Ingeniería de Sistemas',
    bio: 'Apasionada por álgebra lineal, React 19 y sistemas embebidos con ESP32.',
    socialLinks: {
      github: 'https://github.com/valentinarios',
      linkedin: 'https://linkedin.com/in/valentinarios',
    },
    publicActivities: ['Hackathon ESP32 2026', 'Club de Álgebra Lineal'],
    isProfilePublic: true,
    activeCourseIds: ['science', 'language'],
    completedCourseIds: [],
  },
  {
    id: 'sofia',
    fullName: 'Sofía Mendoza',
    email: 'sofia.mendoza@juniorssparks.example',
    initials: 'SM',
    role: 'student',
    roleLabel: 'Estudiante',
    academicBlock: 'Ing. de Sistemas · Ciclo III',
    institution: 'SENATI · Ciencia de Datos',
    bio: 'Enfocada en NumPy, Python aplicado y diseño de bases de datos PostgreSQL.',
    socialLinks: {
      github: 'https://github.com/sofiamendoza',
    },
    publicActivities: ['Semillero Python', 'Grupo de Estudio Cálculo'],
    isProfilePublic: true,
    activeCourseIds: ['math'],
    completedCourseIds: ['algorithms-cpp'],
  },
  {
    id: 'diego',
    fullName: 'Diego Torres',
    email: 'diego.torres@juniorssparks.example',
    initials: 'DT',
    role: 'student',
    roleLabel: 'Estudiante',
    academicBlock: 'Ing. de Sistemas · Ciclo IV',
    institution: 'SENATI · Automatización y Hardware',
    bio: 'Hardware digital, FPGA y telemetría IoT en campo.',
    socialLinks: {
      instagram: 'https://instagram.com/diego.hardware',
    },
    publicActivities: ['Laboratorio ESP32', 'Robótica Aplicada'],
    isProfilePublic: true,
    activeCourseIds: ['science'],
    completedCourseIds: ['math'],
  },
]

function mapRowToProfile(
  row: Record<string, unknown>,
  enrollments: { course_id: string; student_id: string; status: string; certified_at: string | null }[] = [],
): UserProfileDetails {
  const social = (row.social_links ?? {}) as ProfileSocialLinks
  const id = String(row.id)
  const mine = enrollments.filter((e) => e.student_id === id)
  return {
    id,
    fullName: String(row.full_name ?? ''),
    email: String(row.email ?? ''),
    initials: String(row.initials ?? 'US'),
    role: (row.role as DemoRole) ?? 'student',
    roleLabel: String(row.role_label ?? 'Estudiante'),
    academicBlock: String(row.academic_block ?? 'Ing. de Sistemas · Ciclo III'),
    institution: String(row.institution ?? 'SENATI · Ingeniería de Sistemas'),
    bio: String(row.bio ?? ''),
    socialLinks: {
      github: social.github ?? '',
      linkedin: social.linkedin ?? '',
      instagram: social.instagram ?? '',
      portfolio: social.portfolio ?? '',
    },
    publicActivities: Array.isArray(row.public_activities) ? (row.public_activities as string[]) : [],
    isProfilePublic: Boolean(row.is_profile_public ?? true),
    activeCourseIds: mine.filter((e) => !e.certified_at && e.status === 'active').map((e) => e.course_id),
    completedCourseIds: mine.filter((e) => Boolean(e.certified_at) || e.status === 'completed').map((e) => e.course_id),
  }
}

export const profileService = {
  async loadProfile(user: DemoUser): Promise<UserProfileDetails> {
    const cached = localStore.getJson<UserProfileDetails>(`${PROFILE_CACHE_PREFIX}${user.id}`)
    const supabase = env.hasSupabase ? getSupabaseClient() : null
    if (!supabase) return cached ?? defaultProfileFromUser(user)

    const [profRes, enrRes] = await Promise.all([
      supabase.from('profiles').select(profileColumns).eq('id', user.id).maybeSingle(),
      supabase.from('course_enrollments').select('course_id, student_id, status, certified_at').eq('student_id', user.id),
    ])
    if (profRes.error || !profRes.data) return cached ?? defaultProfileFromUser(user)

    const profile = mapRowToProfile(
      { ...profRes.data, email: user.email },
      (enrRes.data ?? []) as { course_id: string; student_id: string; status: string; certified_at: string | null }[],
    )
    localStore.setJson(`${PROFILE_CACHE_PREFIX}${user.id}`, profile)
    return profile
  },

  async saveProfile(profile: UserProfileDetails): Promise<UserProfileDetails> {
    const supabase = env.hasSupabase ? getSupabaseClient() : null
    if (supabase) {
      const { error } = await supabase
        .from('profiles')
        .update({
          full_name: profile.fullName,
          institution: profile.institution,
          bio: profile.bio,
          social_links: profile.socialLinks,
          public_activities: profile.publicActivities,
          is_profile_public: profile.isProfilePublic,
          updated_at: new Date().toISOString(),
        })
        .eq('id', profile.id)
      if (error) throw new Error('No se pudo guardar tu perfil en el campus.')
    }
    localStore.setJson(`${PROFILE_CACHE_PREFIX}${profile.id}`, profile)
    return profile
  },

  async savePreferences(userId: string, prefs: { theme?: string; language?: string }): Promise<void> {
    const supabase = env.hasSupabase ? getSupabaseClient() : null
    if (!supabase) return
    const payload: Record<string, string> = { updated_at: new Date().toISOString() }
    if (prefs.theme) payload.preferred_theme = prefs.theme
    if (prefs.language) payload.preferred_language = prefs.language
    await supabase.from('profiles').update(payload).eq('id', userId)
  },

  async loadPublicDirectory(): Promise<UserProfileDetails[]> {
    const cached = localStore.getJson<UserProfileDetails[]>(DIRECTORY_CACHE_KEY)
    const supabase = env.hasSupabase ? getSupabaseClient() : null
    if (!supabase) return cached ?? fallbackDirectory

    const [profRes, enrRes] = await Promise.all([
      supabase
        .from('profiles')
        .select(profileColumns)
        .eq('is_profile_public', true)
        .eq('role', 'student')
        .order('full_name'),
      supabase.rpc('public_campus_course_history'),
    ])

    if (profRes.error || enrRes.error) return []

    const enrollments = (enrRes.data ?? []) as {
      course_id: string
      student_id: string
      status: string
      certified_at: string | null
    }[]
    const list = (profRes.data ?? []).map((row) => mapRowToProfile(row as Record<string, unknown>, enrollments))
    localStore.setJson(DIRECTORY_CACHE_KEY, list)
    return list
  },
}
