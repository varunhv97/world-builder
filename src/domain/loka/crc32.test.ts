import { describe, expect, it } from 'vitest'
import { crc32 } from './crc32'

describe('crc32', () => {
  it('matches the standard IEEE CRC-32 reference vector', () => {
    expect(crc32(new TextEncoder().encode('123456789'))).toBe(0xcbf4_3926)
  })
})
