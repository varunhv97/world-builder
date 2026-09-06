import { describe, expect, it } from 'vitest'
import {
  decodeLokaHeader,
  encodeLokaHeader,
  LokaFormatError,
  LOKA_HEADER_BYTES,
  LOKA_MAJOR_VERSION,
  LOKA_MINOR_VERSION,
} from './header'

const HEADER = {
  majorVersion: LOKA_MAJOR_VERSION,
  minorVersion: LOKA_MINOR_VERSION,
  flags: 3,
  worldId: '8e73c497-5bf5-4e08-9fa4-63b864a4d786',
  bootstrapIndexOffset: 4_096,
  bootstrapIndexLength: 1_024,
} as const

describe('LOKA/1 header codec', () => {
  it('round-trips a valid fixed header', () => {
    const encoded = encodeLokaHeader(HEADER)

    expect(encoded).toHaveLength(LOKA_HEADER_BYTES)
    expect(decodeLokaHeader(encoded)).toEqual(HEADER)
  })

  it('rejects a header whose contents changed after checksum calculation', () => {
    const encoded = encodeLokaHeader(HEADER)
    encoded[8] = 4

    expect(() => decodeLokaHeader(encoded)).toThrow(LokaFormatError)
    expect(() => decodeLokaHeader(encoded)).toThrow(/checksum/i)
  })

  it('rejects invalid writer input before producing bytes', () => {
    expect(() =>
      encodeLokaHeader({
        ...HEADER,
        worldId: 'not-a-world-id',
      }),
    ).toThrow(/UUID/i)
  })
})
