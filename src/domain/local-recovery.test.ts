import { describe, expect, it } from 'vitest'
import { recoverEditorState, recoverTerrain } from './local-recovery'
describe('local recovery', () => {
  it('recovers a valid terrain snapshot and rejects malformed storage', () => {
    expect(recoverTerrain('{"heights":[1,2,3,4]}', 4)).toEqual([1, 2, 3, 4])
    expect(recoverTerrain('{bad', 4)).toBeUndefined()
    expect(recoverTerrain('{"heights":[1]}', 4)).toBeUndefined()
  })
})

describe('editor recovery', () => {
  it('restores meaningful terrain paint alongside elevation', () => {
    expect(recoverEditorState(JSON.stringify({ heights: [1, 2, 3, 4], materials: [0, 1, 2, 1] }), 4)).toEqual({ heights: [1, 2, 3, 4], materials: [0, 1, 2, 1], features: [] })
  })
})
