import { env } from '../../config/env'
import { createInitialWorkspace } from '../../data/workspaceSeed'
import type { Workspace } from '../../types/workspace'
import { apiClient } from '../http/apiClient'
import { localStore } from '../storage/localStore'

export interface WorkspaceService {
  load(): Promise<Workspace>
  save(workspace: Workspace): Promise<boolean>
}

const WORKSPACE_KEY = 'junior-sparks:workspace:v4'

function isValidWorkspace(candidate: Partial<Workspace> | null, defaults: Workspace): candidate is Workspace {
  if (!candidate) return false
  return Object.keys(defaults).every((key) => {
    const field = key as keyof Workspace
    return Array.isArray(defaults[field])
      ? Array.isArray(candidate[field])
      : typeof candidate[field] === 'object' && candidate[field] !== null
  })
}

const localWorkspaceService: WorkspaceService = {
  async load() {
    const defaults = createInitialWorkspace()
    const saved = localStore.getJson<Partial<Workspace>>(WORKSPACE_KEY)
    return isValidWorkspace(saved, defaults) ? saved : defaults
  },

  async save(workspace) {
    return localStore.setJson(WORKSPACE_KEY, workspace)
  },
}

const httpWorkspaceService: WorkspaceService = {
  load: () => apiClient.get<Workspace>('/workspace'),
  save: async (workspace) => {
    await apiClient.put<void>('/workspace', workspace)
    return true
  },
}

export const workspaceService: WorkspaceService = env.useMocks ? localWorkspaceService : httpWorkspaceService
