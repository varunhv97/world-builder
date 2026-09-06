import { describe, expect, it } from 'vitest'
import { recoverTerrain } from './local-recovery'
describe('local recovery', () => {
  it('recovers a valid terrain snapshot and rejects malformed storage', () => {
    expect(recoverTerrain('{"heights":[1,2,3,4]}', 4)).toEqual([1, 2, 3, 4])
    expect(recoverTerrain('{bad', 4)).toBeUndefined()
    expect(recoverTerrain('{"heights":[1]}', 4)).toBeUndefined()
  })
})
