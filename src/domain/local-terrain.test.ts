import { describe, expect, it } from 'vitest'
import { DEFAULT_TERRAIN_OPTIONS, flattenTerrain, generateTerrain, generateTerrainFromOptions, paintTerrain, sculptTerrain, smoothTerrain } from './local-terrain'

describe('local terrain', () => {
  it('generates deterministic bounded terrain for a seed', () => {
    expect(generateTerrain(42, 4)).toEqual(generateTerrain(42, 4))
    expect(generateTerrain(42, 4)).toHaveLength(16)
  })
  it('sculpts only the requested cell without mutating the input', () => {
    const before = [0, 0, 0, 0]
    expect(sculptTerrain(before, 2, 1, 0, 35)).toEqual([18, 35, 10, 18])
    expect(before).toEqual([0, 0, 0, 0])
  })
  it('generates the same terrain from the same guided controls', () => {
    expect(generateTerrainFromOptions(DEFAULT_TERRAIN_OPTIONS, 4)).toEqual(generateTerrainFromOptions(DEFAULT_TERRAIN_OPTIONS, 4))
  })
  it('smooths, flattens, and paints a brush area without mutating inputs', () => {
    const heights = [0, 100, 0, 0]
    expect(smoothTerrain(heights, 2, 0, 0, 1, 1)[0]).toBeGreaterThan(0)
    expect(flattenTerrain(heights, 2, 0, 0, 50, 1, 1)[0]).toBe(50)
    expect(paintTerrain([1, 1, 1, 1], 2, 0, 0, 2, 1)).toEqual([2, 2, 2, 1])
    expect(heights).toEqual([0, 100, 0, 0])
  })
})
