export function recoverTerrain(serialized: string | null, expectedCells: number): number[] | undefined {
  return recoverEditorState(serialized, expectedCells)?.heights
}

export interface RecoveredEditorState {
  readonly heights: number[]
  readonly materials: number[]
}

/** Safely restores the locally durable editor layers without trusting storage. */
export function recoverEditorState(serialized: string | null, expectedCells: number): RecoveredEditorState | undefined {
  if (serialized === null) return undefined
  try {
    const parsed: unknown = JSON.parse(serialized)
    if (!isTerrainRecord(parsed, expectedCells)) return undefined
    return { heights: [...parsed.heights], materials: parsed.materials === undefined ? Array(expectedCells).fill(1) : [...parsed.materials] }
  } catch { return undefined }
}
function isTerrainRecord(value: unknown, expectedCells: number): value is { heights: number[]; materials?: number[] } {
  return typeof value === 'object' && value !== null && 'heights' in value && Array.isArray(value.heights) && value.heights.length === expectedCells && value.heights.every((height) => typeof height === 'number' && Number.isFinite(height)) && (!('materials' in value) || (Array.isArray(value.materials) && value.materials.length === expectedCells && value.materials.every((material) => Number.isInteger(material) && material >= 0 && material <= 2)))
}
