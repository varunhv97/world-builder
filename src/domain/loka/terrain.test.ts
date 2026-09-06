import { describe, expect, it } from 'vitest'
import { LokaFormatError } from './header'
import { createEmptyTerrainChunk, TerrainChunk } from './terrain'

const GRID = { chunkCells: 2, cellSizeMeters: 4 } as const

describe('TerrainChunk', () => {
  it('owns input cell arrays and returns copies for serialization', () => {
    const elevations = new Int16Array([0, 1, 2, 3])
    const materialIndices = new Uint8Array([0, 1, 1, 0])
    const chunk = new TerrainChunk({
      coordinate: { column: 0, row: 0 },
      grid: GRID,
      paletteSize: 2,
      elevations,
      materialIndices,
    })

    elevations[0] = 99
    const payload = chunk.toPayload()
    payload.elevations[1] = 99

    expect(chunk.elevationAt(0, 0)).toBe(0)
    expect(chunk.elevationAt(1, 0)).toBe(1)
    expect(chunk.materialIndexAt(0, 1)).toBe(1)
  })

  it('creates a full chunk with the supplied default cells', () => {
    const chunk = createEmptyTerrainChunk({ column: -1, row: 2 }, GRID, 3, 120, 2)

    expect(chunk.cellCount).toBe(4)
    expect(chunk.elevationAt(1, 1)).toBe(120)
    expect(chunk.materialIndexAt(1, 1)).toBe(2)
  })

  it('rejects an absent material palette reference', () => {
    expect(
      () =>
        new TerrainChunk({
          coordinate: { column: 0, row: 0 },
          grid: GRID,
          paletteSize: 2,
          elevations: new Int16Array(4),
          materialIndices: new Uint8Array([0, 1, 2, 0]),
        }),
    ).toThrow(LokaFormatError)
  })

  it('rejects reads outside the terrain chunk', () => {
    const chunk = createEmptyTerrainChunk({ column: 0, row: 0 }, GRID, 1)

    expect(() => chunk.elevationAt(2, 0)).toThrow(/outside/i)
  })
})
