import { useCallback, useState } from 'react'
import { WorkspaceProvider } from '../../context/WorkspaceContext'
import { CampusShell } from '../../features/campus/layout/CampusShell'
import { useAuth } from '../../hooks/useAuth'
import { useDocumentTitle } from '../../hooks/useDocumentTitle'

export default function CampusPage() {
  useDocumentTitle('Campus | Junior’s Sparks')
  const { user } = useAuth()
  const [notice, setNotice] = useState<string>()

  const handleSaved = useCallback(() => {
    setNotice('Cambios guardados en este navegador.')
  }, [])

  if (!user) return null

  return (
    <WorkspaceProvider actorName={user.name} onSaved={handleSaved}>
      <CampusShell notice={notice} onNotify={setNotice} />
    </WorkspaceProvider>
  )
}
