import { env } from '../../config/env'
import { demoPassword, demoUsers } from '../../data/demoUsers'
import { createInitialWorkspace } from '../../data/workspaceSeed'
import type { Workspace } from '../../types/workspace'
import { createId } from '../../utils/id'
import { initials } from '../../utils/text'
import type {
  AccessRequestSubmission,
  DemoUser,
  SignInResult,
  SubmitAccessRequestResult,
} from '../../types/auth'
import { apiClient } from '../http/apiClient'
import { localStore } from '../storage/localStore'
import { getSupabaseClient } from '../supabase/supabaseClient'

export interface AuthService {
  getSession(): Promise<DemoUser | null>
  signIn(email: string, password: string): Promise<DemoUser | null>
  signInDetailed(email: string, password: string): Promise<SignInResult>
  submitAccessRequest(payload: AccessRequestSubmission): Promise<SubmitAccessRequestResult>
  signOut(): Promise<void>
}

const SESSION_KEY = 'juniors-sparks:session-user:v2'
const LEGACY_SESSION_KEY = 'juniors-sparks:session:v1'
export const DEMO_WORKSPACE_KEY = 'junior-sparks:demo-workspace:v1'

function saveLocalSession(user: DemoUser) {
  localStore.setJson(SESSION_KEY, user)
  localStore.setText(LEGACY_SESSION_KEY, user.id)
}

function readLocalSession(): DemoUser | null {
  const stored = localStore.getJson<DemoUser>(SESSION_KEY)
  if (stored?.id && stored?.email && stored?.role) {
    return stored
  }
  const legacyId = localStore.getText(LEGACY_SESSION_KEY)
  if (!legacyId) return null
  return demoUsers.find((user) => user.id === legacyId) ?? null
}

function clearLocalSession() {
  localStore.remove(SESSION_KEY)
  localStore.remove(LEGACY_SESSION_KEY)
}

async function readManagedProfile(): Promise<DemoUser | null> {
  const supabase = getSupabaseClient()!
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) {
    clearLocalSession()
    return null
  }
  const { data, error } = await supabase.rpc('current_campus_profile')
  if (error) throw new Error('No se pudo verificar tu perfil del campus.')
  if (data) saveLocalSession(data as DemoUser)
  else clearLocalSession()
  return data as DemoUser | null
}

export async function completeCampusInvitation(password: string) {
  const supabase = getSupabaseClient()
  if (!supabase || !env.managedAuth) throw new Error('La activación de cuentas no está disponible.')
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) throw new Error('El enlace venció o ya se utilizó. Solicita una nueva invitación.')
  if (!(await readManagedProfile())) throw new Error('La cuenta todavía no está habilitada para el campus.')
  const { error } = await supabase.auth.updateUser({ password })
  if (error) throw new Error('No pudimos guardar esa contraseña. Prueba una diferente.')
}

const supabaseAuthService: AuthService = {
  getSession: readManagedProfile,

  async signInDetailed(email, password) {
    const supabase = getSupabaseClient()
    if (!supabase) return localAuthService.signInDetailed(email, password)

    const { error } = await supabase.auth.signInWithPassword({ email: email.trim().toLowerCase(), password })
    if (error) return { status: 'invalid_credentials' }
    const profile = await readManagedProfile()
    if (profile) return { status: 'authenticated', user: profile }
    await supabase.auth.signOut()
    return { status: 'pending_approval' }
  },

  async signIn(email, password) {
    const result = await this.signInDetailed(email, password)
    return result.status === 'authenticated' ? result.user : null
  },

  async submitAccessRequest(payload) {
    const supabase = getSupabaseClient()
    if (!supabase) return localAuthService.submitAccessRequest(payload)

    const { data, error } = await supabase.rpc('register_campus_request', {
      p_full_name: payload.fullName,
      p_email: payload.email,
      p_requested_role: payload.requestedRole,
      p_academic_block: payload.academicBlock,
      p_motivation: payload.motivation ?? '',
    })
    if (error || !data) {
      throw new Error(error?.message ?? 'No pudimos registrar la solicitud')
    }
    return data as SubmitAccessRequestResult
  },

  async signOut() {
    await getSupabaseClient()?.auth.signOut()
    clearLocalSession()
  },
}

const localAuthService: AuthService = {
  async getSession() {
    return readLocalSession()
  },

  async signInDetailed(email, password) {
    await new Promise((resolve) => window.setTimeout(resolve, 350))
    const normalized = email.trim().toLowerCase()
    const user = demoUsers.find((account) => account.email === normalized)
    if (user && password === demoPassword) {
      saveLocalSession(user)
      return { status: 'authenticated', user }
    }
    const demo = localStore.getJson<Workspace>(DEMO_WORKSPACE_KEY)
    const request = demo?.accessRequests.find((item) => item.email.toLowerCase() === normalized)
    if (request?.status === 'pending') return { status: 'pending_approval', requestedAt: request.requestedAt }
    if (request?.status === 'rejected') return { status: 'rejected' }
    if (request?.status !== 'approved' || !request.issuedTempPassword || password !== request.issuedTempPassword) {
      return { status: 'invalid_credentials' }
    }
    const approved: DemoUser = {
      id: request.approvedProfileId ?? `usr-${request.id}`, name: request.name, email: request.email,
      role: request.requestedRole, roleLabel: request.roleLabel, initials: initials(request.name), academicBlock: request.group,
    }
    saveLocalSession(approved)
    return { status: 'authenticated', user: approved }
  },

  async signIn(email, password) {
    const res = await this.signInDetailed(email, password)
    return res.status === 'authenticated' ? res.user : null
  },

  async submitAccessRequest(payload) {
    const email = payload.email.trim().toLowerCase()
    const workspace = localStore.getJson<Workspace>(DEMO_WORKSPACE_KEY) ?? createInitialWorkspace()
    if (demoUsers.some((user) => user.email === email) || workspace.accessRequests.some((item) => item.email.toLowerCase() === email && item.status !== 'rejected')) {
      return { status: 'already_registered', message: 'Ya existe una cuenta o solicitud con ese correo.' }
    }
    const roleLabel =
      payload.requestedRole === 'teacher'
        ? 'Docente'
        : payload.requestedRole === 'coordinator'
          ? 'Coordinación'
          : payload.requestedRole === 'admin'
            ? 'Administración'
            : 'Estudiante'
    const request = {
        id: createId(),
        name: payload.fullName.trim(),
        email,
        requestedRole: payload.requestedRole,
        roleLabel,
        group: payload.academicBlock,
        motivation: payload.motivation ?? '',
        status: 'pending' as const,
        requestedAt: new Date().toISOString().slice(0, 10),
    }
    if (!localStore.setJson(DEMO_WORKSPACE_KEY, { ...workspace, accessRequests: [request, ...workspace.accessRequests] })) {
      throw new Error('No se pudo guardar la solicitud de prueba.')
    }
    return { status: 'submitted', request }
  },

  async signOut() {
    clearLocalSession()
  },
}

const httpAuthService: AuthService = {
  getSession: () => apiClient.get<DemoUser | null>('/auth/session'),
  signIn: (email, password) => apiClient.post<DemoUser | null>('/auth/login', { email, password }),
  async signInDetailed(email, password) {
    const user = await apiClient.post<DemoUser | null>('/auth/login', { email, password })
    return user ? { status: 'authenticated', user } : { status: 'invalid_credentials' }
  },
  submitAccessRequest: (payload) =>
    apiClient.post<SubmitAccessRequestResult>('/auth/access-requests', payload),
  signOut: () => apiClient.post<void>('/auth/logout'),
}

export const authService: AuthService = env.hasSupabase
  ? supabaseAuthService
  : env.apiUrl
    ? httpAuthService
    : localAuthService
