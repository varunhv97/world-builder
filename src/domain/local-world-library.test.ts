import { describe, expect, it } from 'vitest'
import { createEditorWorld, type LocalWorldLibrary } from './editor-world'
import { DEFAULT_TERRAIN_OPTIONS } from './local-terrain'
import { recoverLocalWorldLibrary } from './local-world-library'

describe('local world library recovery', () => {
  it('restores only a complete library with a valid active world', () => {
    const world = createEditorWorld({ title: 'Aster', generation: DEFAULT_TERRAIN_OPTIONS, heights: [0], materials: [1], features: [] })
    const library: LocalWorldLibrary = { version: 1, activeWorldId: world.id, worlds: [world] }
    expect(recoverLocalWorldLibrary(JSON.stringify(library))).toEqual(library)
    expect(recoverLocalWorldLibrary(JSON.stringify({ version: 1, activeWorldId: 'missing', worlds: [] }))).toBeUndefined()
  })
})
