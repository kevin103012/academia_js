import { createContext, useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import { createInitialWorkspace } from '../data/workspaceSeed'
import { workspaceService } from '../services'
import type { Commit, Workspace } from '../types/workspace'
import { dateKey } from '../utils/date'
import { createId } from '../utils/id'
import { canPersistWorkspace } from './workspacePersistence'

export interface WorkspaceContextValue {
  workspace: Workspace
  loaded: boolean
  loadError: boolean
  storageError: boolean
  retryLoad: () => void
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
  const [loadError, setLoadError] = useState(false)
  const [storageError, setStorageError] = useState(false)
  const [loadAttempt, setLoadAttempt] = useState(0)
  const shouldPersistRef = useRef(false)
  const saveSequenceRef = useRef(0)
  const onSavedRef = useRef(onSaved)

  useEffect(() => {
    onSavedRef.current = onSaved
  }, [onSaved])

  useEffect(() => {
    let active = true
    setLoaded(false)
    workspaceService.load()
      .then((data) => {
        if (!active) return
        // The server copy wins: any local edit made while the load failed was
        // based on seed data and must not be persisted.
        shouldPersistRef.current = false
        saveSequenceRef.current += 1
        setWorkspaceState(data)
        setLoadError(false)
        setStorageError(false)
        setLoaded(true)
      })
      .catch(() => {
        if (!active) return
        shouldPersistRef.current = false
        setLoadError(true)
        setLoaded(true)
      })
    return () => { active = false }
  }, [loadAttempt])

  useEffect(() => {
    if (!canPersistWorkspace({ loaded, loadError }, shouldPersistRef.current)) return
    const sequence = ++saveSequenceRef.current
    let active = true
    workspaceService.save(workspace)
      .then((saved) => {
        if (!active || sequence !== saveSequenceRef.current) return
        setStorageError(!saved)
        if (saved) onSavedRef.current?.()
      })
      .catch(() => {
        if (!active || sequence !== saveSequenceRef.current) return
        setStorageError(true)
      })
    return () => { active = false }
  }, [workspace, loaded, loadError])

  const setWorkspace = useCallback((updater: Workspace | ((current: Workspace) => Workspace)) => {
    shouldPersistRef.current = true
    setWorkspaceState((current) => (typeof updater === 'function' ? updater(current) : updater))
  }, [])

  const retryLoad = useCallback(() => {
    setLoadAttempt((attempt) => attempt + 1)
  }, [])

  const commit: Commit = useCallback((action, update) => {
    const record = { id: createId(), actor: actorName, action, date: dateKey() }
    setWorkspace((current) => {
      const updated = update(current)
      return { ...updated, audit: [record, ...updated.audit].slice(0, 200) }
    })
  }, [actorName, setWorkspace])

  return (
    <WorkspaceContext.Provider
      value={{ workspace, loaded, loadError, storageError, retryLoad, setWorkspace, commit }}
    >
      {children}
    </WorkspaceContext.Provider>
  )
}
