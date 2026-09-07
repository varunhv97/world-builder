export const LOCAL_TERRAIN_DIMENSION = 32

export type TerrainPreset = 'archipelago' | 'highlands' | 'plains'

export interface TerrainGenerationOptions {
  readonly seed: number
  readonly preset: TerrainPreset
  readonly landmass: number
  readonly mountainIntensity: number
  readonly waterLevel: number
  readonly roughness: number
}

export const DEFAULT_TERRAIN_OPTIONS: TerrainGenerationOptions = {
  seed: 42,
  preset: 'highlands',
  landmass: 0.65,
  mountainIntensity: 0.55,
  waterLevel: 0.35,
  roughness: 0.45,
}

export function generateTerrain(seed: number, dimension = LOCAL_TERRAIN_DIMENSION): number[] {
  return generateTerrainFromOptions({ ...DEFAULT_TERRAIN_OPTIONS, seed }, dimension)
}

/** Produces a reproducible starting landscape from creator-facing controls. */
export function generateTerrainFromOptions(options: TerrainGenerationOptions, dimension = LOCAL_TERRAIN_DIMENSION): number[] {
  validateGenerationOptions(options)
  let state = options.seed >>> 0
  return Array.from({ length: dimension ** 2 }, (_, index) => {
    state = (state * 1_664_525 + 1_013_904_223) >>> 0
    const x = index % dimension
    const y = Math.floor(index / dimension)
    const normalizedX = (x / (dimension - 1)) * 2 - 1
    const normalizedY = (y / (dimension - 1)) * 2 - 1
    const distanceFromCenter = Math.hypot(normalizedX, normalizedY)
    const radialLand = (options.landmass - distanceFromCenter) * 1.4
    const presetShape = options.preset === 'archipelago'
      ? Math.sin(normalizedX * 8) * Math.cos(normalizedY * 7) * 0.22
      : options.preset === 'plains'
        ? Math.sin(x / 8) * 0.06 + Math.cos(y / 9) * 0.05
        : Math.sin(x / 4) * Math.cos(y / 5) * 0.22
    const noise = ((state / 2 ** 32) - 0.5) * options.roughness
    const mountains = Math.max(0, presetShape + noise) * options.mountainIntensity
    return Math.round((radialLand + mountains - options.waterLevel) * 400)
  })
}

export function sculptTerrain(heights: readonly number[], dimension: number, column: number, row: number, delta: number, radius = 2): number[] {
  return heights.map((height, index) => {
    const x = index % dimension
    const y = Math.floor(index / dimension)
    const distance = Math.hypot(x - column, y - row)
    if (distance > radius) return height
    return height + Math.round(delta * (1 - distance / radius))
  })
}

export function smoothTerrain(heights: readonly number[], dimension: number, column: number, row: number, strength: number, radius = 2): number[] {
  const next = [...heights]
  forEachBrushCell(dimension, column, row, radius, (x, y, falloff) => {
    const neighbors = [-1, 0, 1].flatMap((offsetY) => [-1, 0, 1].map((offsetX) => ({ x: x + offsetX, y: y + offsetY })))
      .filter((neighbor) => neighbor.x >= 0 && neighbor.y >= 0 && neighbor.x < dimension && neighbor.y < dimension)
    const average = neighbors.reduce((sum, neighbor) => sum + heights[neighbor.y * dimension + neighbor.x]!, 0) / neighbors.length
    const index = y * dimension + x
    next[index] = Math.round(heights[index]! + (average - heights[index]!) * strength * falloff)
  })
  return next
}

export function flattenTerrain(heights: readonly number[], dimension: number, column: number, row: number, targetElevation: number, strength: number, radius = 2): number[] {
  const next = [...heights]
  forEachBrushCell(dimension, column, row, radius, (x, y, falloff) => {
    const index = y * dimension + x
    next[index] = Math.round(heights[index]! + (targetElevation - heights[index]!) * strength * falloff)
  })
  return next
}

export function paintTerrain(materials: readonly number[], dimension: number, column: number, row: number, material: number, radius = 2): number[] {
  const next = [...materials]
  forEachBrushCell(dimension, column, row, radius, (x, y) => { next[y * dimension + x] = material })
  return next
}

function forEachBrushCell(dimension: number, column: number, row: number, radius: number, visitor: (column: number, row: number, falloff: number) => void): void {
  for (let y = Math.max(0, Math.floor(row - radius)); y <= Math.min(dimension - 1, Math.ceil(row + radius)); y += 1) {
    for (let x = Math.max(0, Math.floor(column - radius)); x <= Math.min(dimension - 1, Math.ceil(column + radius)); x += 1) {
      const distance = Math.hypot(x - column, y - row)
      if (distance <= radius) visitor(x, y, 1 - distance / radius)
    }
  }
}

function validateGenerationOptions(options: TerrainGenerationOptions): void {
  if (!Number.isSafeInteger(options.seed)) throw new Error('Terrain seed must be a safe integer.')
  for (const value of [options.landmass, options.mountainIntensity, options.waterLevel, options.roughness]) {
    if (!Number.isFinite(value) || value < 0 || value > 1) throw new Error('Terrain generation controls must be between 0 and 1.')
  }
}
