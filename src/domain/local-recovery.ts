export function recoverTerrain(serialized: string | null, expectedCells: number): number[] | undefined {
  if (serialized === null) return undefined
  try {
    const parsed: unknown = JSON.parse(serialized)
    if (!isTerrainRecord(parsed, expectedCells)) return undefined
    return [...parsed.heights]
  } catch { return undefined }
}
function isTerrainRecord(value: unknown, expectedCells: number): value is { heights: number[] } {
  return typeof value === 'object' && value !== null && 'heights' in value && Array.isArray(value.heights) && value.heights.length === expectedCells && value.heights.every((height) => typeof height === 'number' && Number.isFinite(height))
}
