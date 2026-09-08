import { cloneWorld, type EditorWorld, type LocalWorldLibrary } from './editor-world'

/** Validates the browser-local world library before it becomes editable state. */
export function recoverLocalWorldLibrary(serialized: string | null): LocalWorldLibrary | undefined {
  if (serialized === null) return undefined
  try {
    const value: unknown = JSON.parse(serialized)
    if (!isLibrary(value)) return undefined
    return { version: 1, activeWorldId: value.activeWorldId, worlds: value.worlds.map(cloneWorld) }
  } catch { return undefined }
}

function isLibrary(value: unknown): value is LocalWorldLibrary {
  if (typeof value !== 'object' || value === null) return false
  const library = value as Partial<LocalWorldLibrary>
  return library.version === 1 && typeof library.activeWorldId === 'string' && Array.isArray(library.worlds) && library.worlds.length > 0 && library.worlds.every(isWorld) && library.worlds.some((world) => world.id === library.activeWorldId) && new Set(library.worlds.map((world) => world.id)).size === library.worlds.length
}

function isWorld(value: unknown): value is EditorWorld {
  if (typeof value !== 'object' || value === null) return false
  const world = value as Partial<EditorWorld>
  return typeof world.id === 'string' && typeof world.title === 'string' && typeof world.createdAt === 'string' && typeof world.updatedAt === 'string' && Array.isArray(world.heights) && world.heights.every(Number.isFinite) && Array.isArray(world.materials) && world.materials.every(Number.isInteger) && Array.isArray(world.features) && typeof world.generation === 'object' && world.generation !== null
}
