import { useCallback, useEffect, useState, type ReactNode } from 'react'
import { AuthContext } from '../hooks/useAuth'
import { authService } from '../services'
import type {
  AccessRequestSubmission,
  DemoUser,
  SignInResult,
  SubmitAccessRequestResult,
} from '../types/auth'

export type AuthStatus = 'loading' | 'ready'

export interface AuthContextValue {
  user: DemoUser | null
  status: AuthStatus
  signIn: (email: string, password: string) => Promise<DemoUser | null>
  signInDetailed: (email: string, password: string) => Promise<SignInResult>
  submitAccessRequest: (payload: AccessRequestSubmission) => Promise<SubmitAccessRequestResult>
  signOut: () => Promise<void>
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<DemoUser | null>(null)
  const [status, setStatus] = useState<AuthStatus>('loading')

  useEffect(() => {
    let active = true
    authService
      .getSession()
      .then((session) => {
        if (!active) return
        setUser(session)
        setStatus('ready')
      })
      .catch(() => {
        if (!active) return
        setUser(null)
        setStatus('ready')
      })
    return () => {
      active = false
    }
  }, [])

  const signInDetailed = useCallback(async (email: string, password: string) => {
    const result = await authService.signInDetailed(email, password)
    if (result.status === 'authenticated') {
      setUser(result.user)
    }
    return result
  }, [])

  const signIn = useCallback(
    async (email: string, password: string) => {
      const result = await signInDetailed(email, password)
      return result.status === 'authenticated' ? result.user : null
    },
    [signInDetailed],
  )

  const submitAccessRequest = useCallback(async (payload: AccessRequestSubmission) => {
    return authService.submitAccessRequest(payload)
  }, [])

  const signOut = useCallback(async () => {
    await authService.signOut()
    setUser(null)
  }, [])

  return (
    <AuthContext.Provider value={{ user, status, signIn, signInDetailed, submitAccessRequest, signOut }}>
      {children}
    </AuthContext.Provider>
  )
}
