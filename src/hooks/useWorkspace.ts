import { createContext, useContext } from 'react'
import type { WorkspaceContextValue } from '../context/WorkspaceContext'

export const WorkspaceContext = createContext<WorkspaceContextValue | null>(null)

export function useWorkspace() {
  const context = useContext(WorkspaceContext)
  if (!context) {
    throw new Error('useWorkspace must be used inside WorkspaceProvider')
  }
  return context
}
