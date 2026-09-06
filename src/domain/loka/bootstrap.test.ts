import { describe, expect, it } from 'vitest'
import { LokaFormatError } from './header'
import { findChunk, validateBootstrapIndex, type LokaBootstrapIndex } from './bootstrap'

const INDEX: LokaBootstrapIndex = {
  worldId: '8e73c497-5bf5-4e08-9fa4-63b864a4d786',
  title: 'Ember Coast',
  bounds: { widthMeters: 4_096, heightMeters: 4_096 },
  terrainGrid: { chunkCells: 64, cellSizeMeters: 4 },
  materialPalette: ['water', 'grassland', 'rock'],
  previewChunkId: 'THMB:preview',
  chunks: [
    {
      id: 'HMAP:0-0',
      type: 'HMAP',
      schemaVersion: 1,
      coordinate: { column: 0, row: 0 },
      byteOffset: 4_096,
      compressedByteLength: 512,
      uncompressedByteLength: 4_096,
      codec: 'deflate',
      checksum: 0,
    },
    {
      id: 'THMB:preview',
      type: 'THMB',
      schemaVersion: 1,
      byteOffset: 4_608,
      compressedByteLength: 128,
      uncompressedByteLength: 128,
      codec: 'none',
      checksum: 0,
    },
  ],
}

describe('LOKA bootstrap index', () => {
  it('accepts a valid index and locates a chunk by ID', () => {
    expect(() => validateBootstrapIndex(INDEX)).not.toThrow()
    expect(findChunk(INDEX, 'HMAP:0-0')?.type).toBe('HMAP')
  })

  it('rejects duplicate chunk IDs', () => {
    expect(() =>
      validateBootstrapIndex({
        ...INDEX,
        chunks: [...INDEX.chunks, INDEX.chunks[0]!],
      }),
    ).toThrow(/duplicate/i)
  })

  it('rejects a terrain grid that cannot be evenly partitioned into binary chunks', () => {
    expect(() =>
      validateBootstrapIndex({
        ...INDEX,
        terrainGrid: { ...INDEX.terrainGrid, chunkCells: 60 },
      }),
    ).toThrow(LokaFormatError)
  })

  it('requires the preview reference to point to a thumbnail chunk', () => {
    expect(() =>
      validateBootstrapIndex({
        ...INDEX,
        previewChunkId: 'HMAP:0-0',
      }),
    ).toThrow(/THMB/)
  })
})
