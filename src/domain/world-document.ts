import { validateBootstrapIndex, type LokaBootstrapIndex } from './loka/bootstrap'
import { LokaFormatError } from './loka/header'
import { TerrainChunk } from './loka/terrain'

/** Canonical in-memory world state. Mutation produces a new document instance. */
export class WorldDocument {
  readonly #bootstrap: LokaBootstrapIndex
  readonly #terrainChunks: ReadonlyMap<string, TerrainChunk>

  constructor(bootstrap: LokaBootstrapIndex, terrainChunks: readonly TerrainChunk[] = []) {
    validateBootstrapIndex(bootstrap)
    this.#bootstrap = bootstrap
    this.#terrainChunks = indexTerrainChunks(terrainChunks)
  }

  get bootstrap(): LokaBootstrapIndex {
    return this.#bootstrap
  }

  get terrainChunkCount(): number {
    return this.#terrainChunks.size
  }

  terrainChunkAt(column: number, row: number): TerrainChunk | undefined {
    return this.#terrainChunks.get(terrainChunkKey(column, row))
  }

  withTerrainChunk(chunk: TerrainChunk): WorldDocument {
    const nextChunks = [...this.#terrainChunks.values()].filter(
      (existing) => terrainChunkKey(existing.coordinate.column, existing.coordinate.row) !== terrainChunkKey(chunk.coordinate.column, chunk.coordinate.row),
    )

    return new WorldDocument(this.#bootstrap, [...nextChunks, chunk])
  }
}

function indexTerrainChunks(chunks: readonly TerrainChunk[]): ReadonlyMap<string, TerrainChunk> {
  const indexed = new Map<string, TerrainChunk>()

  for (const chunk of chunks) {
    const { column, row } = chunk.coordinate
    const key = terrainChunkKey(column, row)

    if (indexed.has(key)) {
      throw new LokaFormatError(`World document contains duplicate terrain chunk ${key}.`)
    }

    indexed.set(key, chunk)
  }

  return indexed
}

function terrainChunkKey(column: number, row: number): string {
  return `${column},${row}`
}
