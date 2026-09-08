import { describe, expect, it } from 'vitest'
import { createEditorWorld } from '../editor-world'
import { DEFAULT_TERRAIN_OPTIONS } from '../local-terrain'
import { decodeEditorWorldSnapshot, encodeEditorWorldSnapshot } from './editor-snapshot'

describe('editor LOKA snapshot', () => {
  it('round-trips canonical editor content through a checksummed LOKA file', () => {
    const world = createEditorWorld({ title: 'Aster', generation: DEFAULT_TERRAIN_OPTIONS, heights: [0, 1, 2, 3], materials: [1, 1, 2, 0], features: [] }, new Date('2026-01-01T00:00:00.000Z'))
    expect(decodeEditorWorldSnapshot(encodeEditorWorldSnapshot(world))).toEqual(world)
  })

  it('rejects altered snapshots', () => {
    const world = createEditorWorld({ title: 'Aster', generation: DEFAULT_TERRAIN_OPTIONS, heights: [0, 1, 2, 3], materials: [1, 1, 2, 0], features: [] })
    const bytes = encodeEditorWorldSnapshot(world)
    const lastIndex = bytes.length - 1
    bytes[lastIndex] = (bytes[lastIndex] ?? 0) ^ 1
    expect(() => decodeEditorWorldSnapshot(bytes)).toThrow()
  })
})
