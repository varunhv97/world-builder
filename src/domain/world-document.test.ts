import { describe, expect, it } from 'vitest'
import { createEmptyTerrainChunk } from './loka/terrain'
import { WorldDocument } from './world-document'

const bootstrap = {
  worldId: '8e73c497-5bf5-4e08-9fa4-63b864a4d786', title: 'Ember Coast',
  bounds: { widthMeters: 64, heightMeters: 64 }, terrainGrid: { chunkCells: 2, cellSizeMeters: 4 }, materialPalette: ['water'], chunks: [],
} as const

describe('WorldDocument', () => {
  it('returns a new document when terrain is replaced', () => {
    const original = new WorldDocument(bootstrap)
    const chunk = createEmptyTerrainChunk({ column: 0, row: 0 }, bootstrap.terrainGrid, 1, 42)
    const changed = original.withTerrainChunk(chunk)

    expect(original.terrainChunkCount).toBe(0)
    expect(changed.terrainChunkAt(0, 0)?.elevationAt(0, 0)).toBe(42)
  })

  it('removes terrain without mutating the source document', () => {
    const chunk = createEmptyTerrainChunk({ column: 0, row: 0 }, bootstrap.terrainGrid, 1)
    const source = new WorldDocument(bootstrap, [chunk])
    const changed = source.withoutTerrainChunk(0, 0)

    expect(source.terrainChunkCount).toBe(1)
    expect(changed.terrainChunkCount).toBe(0)
  })
})
