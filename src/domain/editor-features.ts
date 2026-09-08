export type EditorFeatureKind = 'point' | 'path' | 'area'

export interface TerrainCoordinate {
  readonly column: number
  readonly row: number
}

/** A low-level, renderer-independent geographic primitive in the local editor. */
export interface EditorFeature {
  readonly id: string
  readonly kind: EditorFeatureKind
  readonly name: string
  readonly coordinates: readonly TerrainCoordinate[]
  readonly attributes: Readonly<Record<string, string | number>>
}

export function validateEditorFeature(feature: EditorFeature): string[] {
  const warnings: string[] = []
  if (feature.name.trim().length === 0) warnings.push('A feature needs a name.')
  if (feature.kind === 'point' && feature.coordinates.length !== 1) warnings.push('A point needs exactly one location.')
  if (feature.kind === 'path' && feature.coordinates.length < 2) warnings.push('A path needs at least two locations.')
  if (feature.kind === 'area' && feature.coordinates.length < 3) warnings.push('An area needs at least three locations.')
  if (feature.coordinates.some((coordinate) => !Number.isInteger(coordinate.column) || !Number.isInteger(coordinate.row) || coordinate.column < 0 || coordinate.row < 0)) warnings.push('Feature coordinates must be non-negative grid locations.')
  return warnings
}

export function createEditorFeature(kind: EditorFeatureKind, coordinates: readonly TerrainCoordinate[], index: number): EditorFeature {
  const labels: Record<EditorFeatureKind, string> = { point: 'Landmark', path: 'Path', area: 'Region' }
  return {
    id: crypto.randomUUID(),
    kind,
    name: `${labels[kind]} ${index + 1}`,
    coordinates: coordinates.map((coordinate) => ({ ...coordinate })),
    attributes: kind === 'path' ? { type: 'river' } : {},
  }
}
