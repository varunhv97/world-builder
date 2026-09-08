import { describe, expect, it } from 'vitest'
import { mergeEditorContent } from './editor-merge'

describe('editor three-way merge', () => {
  const base = { heights: [0, 0, 0, 0], materials: [1, 1, 1, 1], features: [] }

  it('combines non-overlapping terrain edits', () => {
    const result = mergeEditorContent(base, { ...base, heights: [20, 0, 0, 0] }, { ...base, heights: [0, 0, 30, 0] })
    expect(result.conflicts).toEqual([])
    expect(result.merged.heights).toEqual([20, 0, 30, 0])
  })

  it('reports same-cell collisions instead of choosing last write wins', () => {
    const result = mergeEditorContent(base, { ...base, heights: [20, 0, 0, 0] }, { ...base, heights: [30, 0, 0, 0] })
    expect(result.conflicts).toEqual([{ layer: 'terrain', indexes: [0] }])
    expect(result.merged.heights).toEqual([20, 0, 0, 0])
  })
})
