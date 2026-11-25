import { createContext, useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import { createInitialWorkspace } from '../data/workspaceSeed'
import { workspaceService } from '../services'
import type { Commit, Workspace } from '../types/workspace'
import { dateKey } from '../utils/date'
import { createId } from '../utils/id'

export interface WorkspaceContextValue {
  workspace: Workspace
  loaded: boolean
  storageError: boolean
  setWorkspace: (updater: Workspace | ((current: Workspace) => Workspace)) => void
  commit: Commit
}

export const WorkspaceContext = createContext<WorkspaceContextValue | null>(null)

interface WorkspaceProviderProps {
  actorName: string
  onSaved?: () => void
  children: ReactNode
}

export function WorkspaceProvider({ actorName, onSaved, children }: WorkspaceProviderProps) {
  const [workspace, setWorkspaceState] = useState<Workspace>(createInitialWorkspace)
  const [loaded, setLoaded] = useState(false)
  const [storageError, setStorageError] = useState(false)
  const shouldPersistRef = useRef(false)

  useEffect(() => {
    let active = true
    workspaceService.load()
      .then((data) => {
        if (!active) return
        shouldPersistRef.current = false
        setWorkspaceState(data)
        setLoaded(true)
      })
      .catch(() => {
        if (active) setLoaded(true)
      })
    return () => { active = false }
  }, [])

  useEffect(() => {
    if (!loaded || !shouldPersistRef.current) return
    let active = true
    workspaceService.save(workspace)
      .then((saved) => {
        if (active) setStorageError(!saved)
      })
      .catch(() => {
        if (active) setStorageError(true)
      })
    return () => { active = false }
  }, [workspace, loaded])

  const setWorkspace = useCallback((updater: Workspace | ((current: Workspace) => Workspace)) => {
    shouldPersistRef.current = true
    setWorkspaceState((current) => (typeof updater === 'function' ? updater(current) : updater))
  }, [])

  const commit: Commit = useCallback((action, update) => {
    const record = { id: createId(), actor: actorName, action, date: dateKey() }
    setWorkspace((current) => {
      const updated = update(current)
      return { ...updated, audit: [record, ...updated.audit].slice(0, 200) }
    })
    onSaved?.()
  }, [actorName, onSaved, setWorkspace])

  return (
    <WorkspaceContext.Provider value={{ workspace, loaded, storageError, setWorkspace, commit }}>
      {children}
    </WorkspaceContext.Provider>
  )
}
