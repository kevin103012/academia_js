export interface WorkspaceLoadState {
  loaded: boolean
  loadError: boolean
}

/**
 * A failed load leaves the provider showing seed data. Persisting in that state
 * would send example records to the backend, so saving stays blocked until a
 * retry succeeds.
 */
export function canPersistWorkspace(state: WorkspaceLoadState, dirty: boolean): boolean {
  return dirty && state.loaded && !state.loadError
}

export function savedNotice(useMocks: boolean): string {
  return useMocks ? 'Cambios guardados en este navegador.' : 'Cambios guardados.'
}

export function loadErrorMessage(useMocks: boolean): string {
  return useMocks
    ? 'No se pudieron leer los datos guardados. Los cambios no se guardarán hasta que la carga funcione.'
    : 'No se pudieron cargar los datos del servidor. No se enviarán datos de ejemplo: reintenta la carga antes de seguir.'
}

export function saveErrorMessage(): string {
  return 'No se pudieron guardar los últimos cambios. Siguen visibles en esta pestaña; revisa la conexión y vuelve a intentarlo.'
}
