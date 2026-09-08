import { describe, expect, it } from 'vitest'
import { createEditorFeature, validateEditorFeature } from './editor-features'

describe('editor features', () => {
  it('creates immutable low-level primitives with stable kinds', () => {
    const coordinates = [{ column: 2, row: 3 }]
    const feature = createEditorFeature('point', coordinates, 0)
    coordinates[0]!.column = 8
    expect(feature.name).toBe('Landmark 1')
    expect(feature.coordinates).toEqual([{ column: 2, row: 3 }])
  })

  it('reports incomplete paths and areas without blocking intentional work', () => {
    expect(validateEditorFeature(createEditorFeature('path', [{ column: 1, row: 1 }], 0))).toContain('A path needs at least two locations.')
    expect(validateEditorFeature(createEditorFeature('area', [{ column: 1, row: 1 }, { column: 2, row: 1 }], 0))).toContain('An area needs at least three locations.')
  })
})
