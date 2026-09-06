import { LokaFormatError } from './header'

export const LOKA_CHUNK_TYPES = [
  'META',
  'PAL0',
  'HMAP',
  'MATL',
  'PNT0',
  'PTH0',
  'ARE0',
  'ATTR',
  'REF0',
  'THMB',
  'CACH',
] as const

export type LokaChunkType = (typeof LOKA_CHUNK_TYPES)[number]

export interface TerrainGridConfiguration {
  readonly chunkCells: number
  readonly cellSizeMeters: number
}

export interface WorldBounds {
  readonly widthMeters: number
  readonly heightMeters: number
}

export interface ChunkCoordinate {
  readonly column: number
  readonly row: number
}

export interface ChunkDirectoryEntry {
  readonly id: string
  readonly type: LokaChunkType
  readonly schemaVersion: number
  readonly coordinate?: ChunkCoordinate
  readonly byteOffset: number
  readonly compressedByteLength: number
  readonly uncompressedByteLength: number
  readonly codec: string
  readonly checksum: number
}

/**
 * The small, uncompressed record that lets a reader identify a world and find
 * payload chunks without decoding the whole file.
 */
export interface LokaBootstrapIndex {
  readonly worldId: string
  readonly title: string
  readonly bounds: WorldBounds
  readonly terrainGrid: TerrainGridConfiguration
  readonly materialPalette: readonly string[]
  readonly previewChunkId?: string
  readonly chunks: readonly ChunkDirectoryEntry[]
}

const MATERIAL_ID_PATTERN = /^[a-z][a-z0-9-]{0,63}$/u
const CHUNK_ID_PATTERN = /^[A-Z0-9]{4}:[a-z0-9-]{1,64}$/u

/** Validates a bootstrap index before it is encoded or accepted from a file. */
export function validateBootstrapIndex(index: LokaBootstrapIndex): void {
  validateUuid(index.worldId)
  validateTitle(index.title)
  validateBounds(index.bounds)
  validateTerrainGrid(index.terrainGrid)
  validateMaterialPalette(index.materialPalette)
  validateChunkDirectory(index.chunks)

  if (index.previewChunkId !== undefined) {
    const previewChunk = index.chunks.find((chunk) => chunk.id === index.previewChunkId)

    if (previewChunk?.type !== 'THMB') {
      throw new LokaFormatError('Preview chunk ID must reference a THMB chunk.')
    }
  }
}

/** Returns the requested directory entry, or undefined when the world has no such chunk. */
export function findChunk(
  index: LokaBootstrapIndex,
  chunkId: string,
): ChunkDirectoryEntry | undefined {
  return index.chunks.find((chunk) => chunk.id === chunkId)
}

function validateUuid(worldId: string): void {
  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/iu.test(
    worldId,
  )

  if (!isUuid) {
    throw new LokaFormatError('Bootstrap index world ID must be a canonical UUID string.')
  }
}

function validateTitle(title: string): void {
  if (title.trim().length === 0 || title.length > 200) {
    throw new LokaFormatError('World title must contain 1 to 200 characters.')
  }
}

function validateBounds(bounds: WorldBounds): void {
  validatePositiveFinite(bounds.widthMeters, 'World width')
  validatePositiveFinite(bounds.heightMeters, 'World height')
}

function validateTerrainGrid(grid: TerrainGridConfiguration): void {
  if (!Number.isInteger(grid.chunkCells) || grid.chunkCells < 2 || !isPowerOfTwo(grid.chunkCells)) {
    throw new LokaFormatError('Terrain chunk cells must be a power of two greater than one.')
  }

  validatePositiveFinite(grid.cellSizeMeters, 'Terrain cell size')
}

function validateMaterialPalette(palette: readonly string[]): void {
  if (palette.length === 0 || palette.length > 256) {
    throw new LokaFormatError('Material palette must contain between 1 and 256 entries.')
  }

  const knownMaterials = new Set<string>()

  for (const material of palette) {
    if (!MATERIAL_ID_PATTERN.test(material)) {
      throw new LokaFormatError(`Invalid material palette ID: ${material}.`)
    }

    if (knownMaterials.has(material)) {
      throw new LokaFormatError(`Material palette contains duplicate ID: ${material}.`)
    }

    knownMaterials.add(material)
  }
}

function validateChunkDirectory(chunks: readonly ChunkDirectoryEntry[]): void {
  const knownIds = new Set<string>()

  for (const chunk of chunks) {
    if (!CHUNK_ID_PATTERN.test(chunk.id)) {
      throw new LokaFormatError(`Invalid chunk ID: ${chunk.id}.`)
    }

    if (knownIds.has(chunk.id)) {
      throw new LokaFormatError(`Chunk directory contains duplicate ID: ${chunk.id}.`)
    }

    knownIds.add(chunk.id)
    validateChunkEntry(chunk)
  }
}

function validateChunkEntry(chunk: ChunkDirectoryEntry): void {
  if (!LOKA_CHUNK_TYPES.includes(chunk.type)) {
    throw new LokaFormatError(`Unsupported chunk type: ${chunk.type}.`)
  }

  if (!Number.isInteger(chunk.schemaVersion) || chunk.schemaVersion < 1 || chunk.schemaVersion > 0xffff) {
    throw new LokaFormatError(`Chunk ${chunk.id} has an invalid schema version.`)
  }

  validateSafeNonNegativeInteger(chunk.byteOffset, `Chunk ${chunk.id} byte offset`)
  validateSafeNonNegativeInteger(chunk.compressedByteLength, `Chunk ${chunk.id} compressed byte length`)
  validateSafeNonNegativeInteger(chunk.uncompressedByteLength, `Chunk ${chunk.id} uncompressed byte length`)

  if (chunk.byteOffset + chunk.compressedByteLength > Number.MAX_SAFE_INTEGER) {
    throw new LokaFormatError(`Chunk ${chunk.id} byte range exceeds the safe integer range.`)
  }

  if (chunk.codec.trim().length === 0 || chunk.codec.length > 32) {
    throw new LokaFormatError(`Chunk ${chunk.id} must declare a codec identifier.`)
  }

  if (!Number.isInteger(chunk.checksum) || chunk.checksum < 0 || chunk.checksum > 0xffff_ffff) {
    throw new LokaFormatError(`Chunk ${chunk.id} has an invalid checksum.`)
  }

  if (chunk.coordinate !== undefined) {
    validateCoordinate(chunk.coordinate, chunk.id)
  }
}

function validateCoordinate(coordinate: ChunkCoordinate, chunkId: string): void {
  if (!Number.isInteger(coordinate.column) || !Number.isInteger(coordinate.row)) {
    throw new LokaFormatError(`Chunk ${chunkId} coordinate must use integer grid positions.`)
  }
}

function validatePositiveFinite(value: number, label: string): void {
  if (!Number.isFinite(value) || value <= 0) {
    throw new LokaFormatError(`${label} must be a positive finite number.`)
  }
}

function validateSafeNonNegativeInteger(value: number, label: string): void {
  if (!Number.isSafeInteger(value) || value < 0) {
    throw new LokaFormatError(`${label} must be a non-negative safe integer.`)
  }
}

function isPowerOfTwo(value: number): boolean {
  return (value & (value - 1)) === 0
}
