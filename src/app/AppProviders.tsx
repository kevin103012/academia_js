import { useEffect, type ReactNode } from 'react'
import { AuthProvider } from '../context/AuthContext'
import { themeService } from '../services'

export function AppProviders({ children }: { children: ReactNode }) {
  useEffect(() => {
    themeService.init()
    themeService.setLanguage(themeService.getLanguage())
    void themeService.loadCustomThemes().then(() => {
      themeService.init()
    })
  }, [])

  return <AuthProvider>{children}</AuthProvider>
}
