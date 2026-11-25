import { lazy, Suspense } from 'react'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router'
import { LoadingMark } from '../components/ui/LoadingMark'
import { LandingPage } from '../pages/landing/LandingPage'
import { SignInPage } from '../pages/sign-in/SignInPage'
import { paths } from './paths'
import { ProtectedRoute } from './ProtectedRoute'

const CampusPage = lazy(() => import('../pages/campus/CampusPage'))

export function AppRouter() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path={paths.home} element={<LandingPage />} />
        <Route path={paths.signIn} element={<SignInPage />} />
        <Route
          path={paths.campus}
          element={
            <ProtectedRoute>
              <Suspense
                fallback={
                  <main className="campus-loading">
                    <LoadingMark label="Cargando el campus" />
                  </main>
                }
              >
                <CampusPage />
              </Suspense>
            </ProtectedRoute>
          }
        />
        <Route path="*" element={<Navigate to={paths.home} replace />} />
      </Routes>
    </BrowserRouter>
  )
}
