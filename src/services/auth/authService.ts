import { env } from '../../config/env'
import { demoPassword, demoUsers } from '../../data/demoUsers'
import type { DemoUser } from '../../types/auth'
import { apiClient } from '../http/apiClient'
import { localStore } from '../storage/localStore'

export interface AuthService {
  getSession(): Promise<DemoUser | null>
  signIn(email: string, password: string): Promise<DemoUser | null>
  signOut(): Promise<void>
}

const SESSION_KEY = 'juniors-sparks:session:v1'

const localAuthService: AuthService = {
  async getSession() {
    const savedId = localStore.getText(SESSION_KEY)
    if (!savedId) return null
    return demoUsers.find((user) => user.id === savedId) ?? null
  },

  async signIn(email, password) {
    await new Promise((resolve) => window.setTimeout(resolve, 420))
    const normalized = email.trim().toLowerCase()
    const user = demoUsers.find((account) => account.email === normalized)
    if (!user || password !== demoPassword) return null
    localStore.setText(SESSION_KEY, user.id)
    return user
  },

  async signOut() {
    localStore.remove(SESSION_KEY)
  },
}

const httpAuthService: AuthService = {
  getSession: () => apiClient.get<DemoUser | null>('/auth/session'),
  signIn: (email, password) => apiClient.post<DemoUser | null>('/auth/login', { email, password }),
  signOut: () => apiClient.post<void>('/auth/logout'),
}

export const authService: AuthService = env.useMocks ? localAuthService : httpAuthService
