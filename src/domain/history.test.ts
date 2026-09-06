import { describe, expect, it } from 'vitest'
import { ReplaceTerrainChunkCommand } from './commands'
import { DocumentHistory } from './history'
import { createEmptyTerrainChunk } from './loka/terrain'
import { WorldDocument } from './world-document'

const bootstrap = { worldId: '8e73c497-5bf5-4e08-9fa4-63b864a4d786', title: 'Ember Coast', bounds: { widthMeters: 64, heightMeters: 64 }, terrainGrid: { chunkCells: 2, cellSizeMeters: 4 }, materialPalette: ['water'], chunks: [] } as const

describe('DocumentHistory', () => {
  it('undoes and redoes stored inverse commands exactly', () => {
    const history = new DocumentHistory(); const initial = new WorldDocument(bootstrap)
    const chunk = createEmptyTerrainChunk({ column: 0, row: 0 }, bootstrap.terrainGrid, 1, 77)
    const changed = history.commit(initial, { id: 'stroke-1', commands: [new ReplaceTerrainChunkCommand(chunk)] })
    const undone = history.undo(changed)!
    const redone = history.redo(undone)!
    expect(undone.terrainChunkCount).toBe(0)
    expect(redone.terrainChunkAt(0, 0)?.elevationAt(0, 0)).toBe(77)
  })
})
