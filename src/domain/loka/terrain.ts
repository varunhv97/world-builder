import { LokaFormatError } from './header'
import type { ChunkCoordinate, TerrainGridConfiguration } from './bootstrap'

export interface TerrainChunkInput {
  readonly coordinate: ChunkCoordinate
  readonly grid: TerrainGridConfiguration
  readonly paletteSize: number
  readonly elevations: Int16Array
  readonly materialIndices: Uint8Array
}

export interface TerrainChunkPayload {
  readonly coordinate: ChunkCoordinate
  readonly elevations: Int16Array
  readonly materialIndices: Uint8Array
}

/**
 * An immutable terrain chunk. It owns copies of input arrays and only exposes
 * copies to callers, preventing UI or renderer code from bypassing commands by
 * mutating canonical terrain cells in place.
 */
export class TerrainChunk {
  readonly #coordinate: ChunkCoordinate
  readonly #dimension: number
  readonly #elevations: Int16Array
  readonly #materialIndices: Uint8Array

  constructor(input: TerrainChunkInput) {
    validateTerrainChunkInput(input)

    this.#coordinate = { ...input.coordinate }
    this.#dimension = input.grid.chunkCells
    this.#elevations = new Int16Array(input.elevations)
    this.#materialIndices = new Uint8Array(input.materialIndices)
  }

  get cellCount(): number {
    return this.#elevations.length
  }

  get coordinate(): ChunkCoordinate {
    return { ...this.#coordinate }
  }

  elevationAt(column: number, row: number): number {
    return this.#elevations[this.cellIndex(column, row)]!
  }

  materialIndexAt(column: number, row: number): number {
    return this.#materialIndices[this.cellIndex(column, row)]!
  }

  toPayload(): TerrainChunkPayload {
    return {
      coordinate: this.coordinate,
      elevations: new Int16Array(this.#elevations),
      materialIndices: new Uint8Array(this.#materialIndices),
    }
  }

  private cellIndex(column: number, row: number): number {
    if (
      !Number.isInteger(column) ||
      !Number.isInteger(row) ||
      column < 0 ||
      row < 0 ||
      column >= this.#dimension ||
      row >= this.#dimension
    ) {
      throw new LokaFormatError('Terrain cell coordinates are outside this chunk.')
    }

    return row * this.#dimension + column
  }
}

export function createEmptyTerrainChunk(
  coordinate: ChunkCoordinate,
  grid: TerrainGridConfiguration,
  paletteSize: number,
  elevation = 0,
  materialIndex = 0,
): TerrainChunk {
  if (!Number.isInteger(elevation) || elevation < -32_768 || elevation > 32_767) {
    throw new LokaFormatError('Default terrain elevation must fit in a signed 16-bit cell.')
  }

  const cellCount = grid.chunkCells ** 2

  return new TerrainChunk({
    coordinate,
    grid,
    paletteSize,
    elevations: new Int16Array(cellCount).fill(elevation),
    materialIndices: new Uint8Array(cellCount).fill(materialIndex),
  })
}

function validateTerrainChunkInput(input: TerrainChunkInput): void {
  const { chunkCells } = input.grid

  if (!Number.isInteger(chunkCells) || chunkCells < 2) {
    throw new LokaFormatError('Terrain grid must have at least two cells per side.')
  }

  if (!Number.isInteger(input.coordinate.column) || !Number.isInteger(input.coordinate.row)) {
    throw new LokaFormatError('Terrain chunk coordinate must use integer grid positions.')
  }

  if (!Number.isInteger(input.paletteSize) || input.paletteSize < 1 || input.paletteSize > 256) {
    throw new LokaFormatError('Terrain material palette size must be between 1 and 256.')
  }

  const expectedCellCount = chunkCells ** 2

  if (input.elevations.length !== expectedCellCount || input.materialIndices.length !== expectedCellCount) {
    throw new LokaFormatError('Terrain elevation and material grids must match the configured cell count.')
  }

  for (const materialIndex of input.materialIndices) {
    if (materialIndex >= input.paletteSize) {
      throw new LokaFormatError('Terrain material cell references an absent palette entry.')
    }
  }
}
