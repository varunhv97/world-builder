import type { EditorFeature } from './editor-features'
import type { TerrainGenerationOptions } from './local-terrain'

export interface RecoveredEditorState {
  readonly heights: number[]
  readonly materials: number[]
  readonly features: EditorFeature[]
  readonly title?: string
  readonly worldId?: string
  readonly createdAt?: string
  readonly generation?: TerrainGenerationOptions
}

export function recoverTerrain(serialized: string | null, expectedCells: number): number[] | undefined {
  return recoverEditorState(serialized, expectedCells)?.heights
}

/** Safely restores locally durable world content without trusting browser storage. */
export function recoverEditorState(serialized: string | null, expectedCells: number): RecoveredEditorState | undefined {
  if (serialized === null) return undefined
  try {
    const parsed: unknown = JSON.parse(serialized)
    if (!isTerrainRecord(parsed, expectedCells)) return undefined
    return {
      heights: [...parsed.heights],
      materials: parsed.materials === undefined ? Array(expectedCells).fill(1) : [...parsed.materials],
      features: parsed.features === undefined ? [] : parsed.features.map((feature) => ({ ...feature, coordinates: feature.coordinates.map((coordinate) => ({ ...coordinate })), attributes: { ...feature.attributes } })),
      ...(parsed.title === undefined ? {} : { title: parsed.title }),
      ...(parsed.worldId === undefined ? {} : { worldId: parsed.worldId }),
      ...(parsed.createdAt === undefined ? {} : { createdAt: parsed.createdAt }),
      ...(parsed.generation === undefined ? {} : { generation: { ...parsed.generation } }),
    }
  } catch { return undefined }
}

function isTerrainRecord(value: unknown, expectedCells: number): value is { heights: number[]; materials?: number[]; features?: EditorFeature[]; title?: string; worldId?: string; createdAt?: string; generation?: TerrainGenerationOptions } {
  return typeof value === 'object' && value !== null && 'heights' in value && Array.isArray(value.heights) && value.heights.length === expectedCells && value.heights.every((height) => typeof height === 'number' && Number.isFinite(height)) && (!('materials' in value) || (Array.isArray(value.materials) && value.materials.length === expectedCells && value.materials.every((material) => Number.isInteger(material) && material >= 0 && material <= 2))) && (!('features' in value) || (Array.isArray(value.features) && value.features.every(isEditorFeature))) && (!('title' in value) || typeof value.title === 'string') && (!('worldId' in value) || typeof value.worldId === 'string') && (!('createdAt' in value) || typeof value.createdAt === 'string') && (!('generation' in value) || isGenerationOptions(value.generation))
}

function isEditorFeature(value: unknown): value is EditorFeature {
  if (typeof value !== 'object' || value === null) return false
  const feature = value as Partial<EditorFeature>
  return typeof feature.id === 'string' && typeof feature.name === 'string' && (feature.kind === 'point' || feature.kind === 'path' || feature.kind === 'area') && Array.isArray(feature.coordinates) && feature.coordinates.every((coordinate) => typeof coordinate === 'object' && coordinate !== null && Number.isInteger((coordinate as { column?: unknown }).column) && Number.isInteger((coordinate as { row?: unknown }).row)) && typeof feature.attributes === 'object' && feature.attributes !== null
}

function isGenerationOptions(value: unknown): value is TerrainGenerationOptions {
  if (typeof value !== 'object' || value === null) return false
  const options = value as Partial<TerrainGenerationOptions>
  return Number.isSafeInteger(options.seed) && (options.preset === 'archipelago' || options.preset === 'highlands' || options.preset === 'plains') && [options.landmass, options.mountainIntensity, options.waterLevel, options.roughness].every((option) => typeof option === 'number' && option >= 0 && option <= 1)
}
