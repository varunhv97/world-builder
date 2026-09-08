import { describe, expect, it } from 'vitest'
import { applyEditorDelta, diffEditorContent, isEmptyEditorDelta } from './editor-delta'

describe('editor deltas', () => {
  it('records only changed terrain cells and applies exact inverse values', () => {
    const before = { heights: [0, 0, 0, 0], materials: [1, 1, 1, 1], features: [] }
    const after = { heights: [0, 10, 0, 0], materials: [1, 2, 1, 1], features: [] }
    const delta = diffEditorContent(before, after)
    expect(delta.heightChanges).toEqual([{ index: 1, before: 0, after: 10 }])
    expect(delta.materialChanges).toEqual([{ index: 1, before: 1, after: 2 }])
    expect(applyEditorDelta(after, delta, 'inverse')).toEqual(before)
  })

  it('does not write an empty delta for an unchanged editor', () => {
    expect(isEmptyEditorDelta(diffEditorContent({ heights: [0], materials: [1], features: [] }, { heights: [0], materials: [1], features: [] }))).toBe(true)
  })
})
