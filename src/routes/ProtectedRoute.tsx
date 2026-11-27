import type { ReactNode } from 'react'
import { Navigate } from 'react-router'
import { LoadingMark } from '../components/ui/LoadingMark'
import { useAuth } from '../hooks/useAuth'
import { paths } from './paths'

export function ProtectedRoute({ children }: { children: ReactNode }) {
  const { user, status } = useAuth()

  if (status === 'loading') {
    return (
      <main className="campus-loading">
        <LoadingMark label="Cargando el campus" />
      </main>
    )
  }

  if (!user) {
    return <Navigate to={paths.signIn} replace />
  }

  return <>{children}</>
}
