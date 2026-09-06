export type GeographicFeatureKind = 'point' | 'path' | 'area'
export interface GeographicFeature { readonly id: string; readonly kind: GeographicFeatureKind; readonly name: string; readonly coordinates: readonly { readonly x: number; readonly y: number }[]; readonly attributes: Readonly<Record<string, string | number>> }
export function validateFeature(feature: GeographicFeature): string[] {
  const warnings: string[] = []
  if (feature.name.trim().length === 0) warnings.push('A geographic feature needs a name.')
  if (feature.kind === 'path' && feature.coordinates.length < 2) warnings.push('A path needs at least two points.')
  if (feature.kind === 'area' && feature.coordinates.length < 3) warnings.push('An area needs at least three points.')
  if (feature.attributes['type'] === 'river' && feature.coordinates.length > 1 && feature.coordinates.some((point, index) => index > 0 && point.y < feature.coordinates[index - 1]!.y)) warnings.push('River path includes an uphill segment.')
  return warnings
}
