import { createContext, useCallback, useEffect, useState, type ReactNode } from 'react'
import { authService } from '../services'
import type { DemoUser } from '../types/auth'

export type AuthStatus = 'loading' | 'ready'

export interface AuthContextValue {
  user: DemoUser | null
  status: AuthStatus
  signIn: (email: string, password: string) => Promise<DemoUser | null>
  signOut: () => Promise<void>
}

export const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<DemoUser | null>(null)
  const [status, setStatus] = useState<AuthStatus>('loading')

  useEffect(() => {
    let active = true
    authService.getSession()
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
    return () => { active = false }
  }, [])

  const signIn = useCallback(async (email: string, password: string) => {
    const authenticated = await authService.signIn(email, password)
    if (authenticated) {
      setUser(authenticated)
    }
    return authenticated
  }, [])

  const signOut = useCallback(async () => {
    await authService.signOut()
    setUser(null)
  }, [])

  return (
    <AuthContext.Provider value={{ user, status, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  )
}
