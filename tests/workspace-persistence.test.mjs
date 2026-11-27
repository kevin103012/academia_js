import test from 'node:test'
import assert from 'node:assert/strict'
import {
  canPersistWorkspace,
  loadErrorMessage,
  saveErrorMessage,
  savedNotice,
} from '../src/context/workspacePersistence.ts'

test('workspace never persists before a clean load, including after a failed one', () => {
  assert.equal(canPersistWorkspace({ loaded: false, loadError: false }, true), false)
  assert.equal(canPersistWorkspace({ loaded: true, loadError: true }, true), false)
  assert.equal(canPersistWorkspace({ loaded: true, loadError: false }, false), false)
  assert.equal(canPersistWorkspace({ loaded: true, loadError: false }, true), true)
})

test('saved notice is only produced for a completed save and names the right storage', () => {
  assert.equal(savedNotice(true), 'Cambios guardados en este navegador.')
  assert.equal(savedNotice(false), 'Cambios guardados.')
  assert.equal(savedNotice(false).includes('navegador'), false)
})

test('failure messages do not promise persistence and the remote load names example data', () => {
  assert.match(loadErrorMessage(false), /datos de ejemplo/)
  assert.match(loadErrorMessage(true), /no se guardarán/)
  assert.match(saveErrorMessage(), /No se pudieron guardar/)
  assert.doesNotMatch(saveErrorMessage(), /guardados en este navegador/)
})
