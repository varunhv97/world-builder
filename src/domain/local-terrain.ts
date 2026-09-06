export const LOCAL_TERRAIN_DIMENSION = 32

export function generateTerrain(seed: number, dimension = LOCAL_TERRAIN_DIMENSION): number[] {
  let state = seed >>> 0
  return Array.from({ length: dimension ** 2 }, (_, index) => {
    state = (state * 1_664_525 + 1_013_904_223) >>> 0
    const x = index % dimension
    const y = Math.floor(index / dimension)
    return Math.round(((state / 2 ** 32) - 0.45 + Math.sin(x / 5) * 0.2 + Math.cos(y / 7) * 0.15) * 250)
  })
}

export function sculptTerrain(heights: readonly number[], dimension: number, column: number, row: number, delta: number): number[] {
  return heights.map((height, index) => {
    const x = index % dimension
    const y = Math.floor(index / dimension)
    const distance = Math.hypot(x - column, y - row)
    if (distance > 2) return height
    return height + Math.round(delta * (1 - distance / 2))
  })
}
