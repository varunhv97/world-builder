import { describe, expect, it } from 'vitest'
import { applyTransaction, ReplaceTerrainChunkCommand } from './commands'
import { createEmptyTerrainChunk } from './loka/terrain'
import { WorldDocument } from './world-document'

const bootstrap = { worldId: '8e73c497-5bf5-4e08-9fa4-63b864a4d786', title: 'Ember Coast', bounds: { widthMeters: 64, heightMeters: 64 }, terrainGrid: { chunkCells: 2, cellSizeMeters: 4 }, materialPalette: ['water'], chunks: [] } as const

describe('command transactions', () => {
  it('applies commands without mutating the original document', () => {
    const initial = new WorldDocument(bootstrap)
    const chunk = createEmptyTerrainChunk({ column: 0, row: 0 }, bootstrap.terrainGrid, 1, 99)
    const result = applyTransaction(initial, { id: 'transaction-1', commands: [new ReplaceTerrainChunkCommand(chunk)] })

    expect(initial.terrainChunkCount).toBe(0)
    expect(result.document.terrainChunkAt(0, 0)?.elevationAt(0, 0)).toBe(99)
    expect(result.changedTerrainChunks).toEqual([{ column: 0, row: 0 }])
  })
})
