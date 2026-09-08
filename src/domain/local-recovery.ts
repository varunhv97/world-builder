export function recoverTerrain(serialized: string | null, expectedCells: number): number[] | undefined {
  return recoverEditorState(serialized, expectedCells)?.heights
}

export interface RecoveredEditorState {
  readonly heights: number[]
  readonly materials: number[]
  readonly features: EditorFeature[]
}

/** Safely restores the locally durable editor layers without trusting storage. */
export function recoverEditorState(serialized: string | null, expectedCells: number): RecoveredEditorState | undefined {
  if (serialized === null) return undefined
  try {
    const parsed: unknown = JSON.parse(serialized)
    if (!isTerrainRecord(parsed, expectedCells)) return undefined
    return { heights: [...parsed.heights], materials: parsed.materials === undefined ? Array(expectedCells).fill(1) : [...parsed.materials], features: parsed.features === undefined ? [] : parsed.features.map((feature) => ({ ...feature, coordinates: feature.coordinates.map((coordinate) => ({ ...coordinate })), attributes: { ...feature.attributes } })) }
  } catch { return undefined }
}
function isTerrainRecord(value: unknown, expectedCells: number): value is { heights: number[]; materials?: number[]; features?: EditorFeature[] } {
  return typeof value === 'object' && value !== null && 'heights' in value && Array.isArray(value.heights) && value.heights.length === expectedCells && value.heights.every((height) => typeof height === 'number' && Number.isFinite(height)) && (!('materials' in value) || (Array.isArray(value.materials) && value.materials.length === expectedCells && value.materials.every((material) => Number.isInteger(material) && material >= 0 && material <= 2))) && (!('features' in value) || (Array.isArray(value.features) && value.features.every(isEditorFeature)))
}

function isEditorFeature(value: unknown): value is EditorFeature {
  if (typeof value !== 'object' || value === null) return false
  const feature = value as Partial<EditorFeature>
  return typeof feature.id === 'string' && typeof feature.name === 'string' && (feature.kind === 'point' || feature.kind === 'path' || feature.kind === 'area') && Array.isArray(feature.coordinates) && feature.coordinates.every((coordinate) => typeof coordinate === 'object' && coordinate !== null && Number.isInteger((coordinate as { column?: unknown }).column) && Number.isInteger((coordinate as { row?: unknown }).row)) && typeof feature.attributes === 'object' && feature.attributes !== null
}
import type { EditorFeature } from './editor-features'
