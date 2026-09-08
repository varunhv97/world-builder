import { describe, expect, it } from 'vitest'
import { createEditorFeature, validateEditorFeature, validateFeatureAgainstTerrain } from './editor-features'

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
  it('flags uphill rivers as an advisory terrain-realism warning', () => {
    const river = createEditorFeature('path', [{ column: 0, row: 0 }, { column: 1, row: 0 }], 0)
    expect(validateFeatureAgainstTerrain(river, [10, 20, 0, 0], [1, 1, 1, 1], 2)).toContain('River path includes an uphill segment.')
  })
})
