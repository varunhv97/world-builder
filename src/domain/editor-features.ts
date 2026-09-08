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

/** Advisory geography checks never block intentional creator choices. */
export function validateFeatureAgainstTerrain(feature: EditorFeature, elevations: readonly number[], materials: readonly number[], dimension: number): string[] {
  const warnings = validateEditorFeature(feature)
  const elevationAt = (coordinate: TerrainCoordinate) => elevations[coordinate.row * dimension + coordinate.column]
  const materialAt = (coordinate: TerrainCoordinate) => materials[coordinate.row * dimension + coordinate.column]
  if (feature.attributes['type'] === 'river') {
    for (let index = 1; index < feature.coordinates.length; index += 1) {
      const previous = elevationAt(feature.coordinates[index - 1]!)
      const current = elevationAt(feature.coordinates[index]!)
      if (previous !== undefined && current !== undefined && current > previous) warnings.push('River path includes an uphill segment.')
    }
  }
  if (['settlement', 'forest', 'mountain', 'biome'].includes(String(feature.attributes['type'])) && feature.coordinates.some((coordinate) => materialAt(coordinate) === 0)) warnings.push('This feature includes water terrain and is usually placed on land.')
  return warnings
}
