import { describe, expect, it } from 'vitest'
import { generateTerrain, sculptTerrain } from './local-terrain'

describe('local terrain', () => {
  it('generates deterministic bounded terrain for a seed', () => {
    expect(generateTerrain(42, 4)).toEqual(generateTerrain(42, 4))
    expect(generateTerrain(42, 4)).toHaveLength(16)
  })
  it('sculpts only the requested cell without mutating the input', () => {
    const before = [0, 0, 0, 0]
    expect(sculptTerrain(before, 2, 1, 0, 35)).toEqual([0, 35, 0, 0])
    expect(before).toEqual([0, 0, 0, 0])
  })
})
