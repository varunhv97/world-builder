import type { EditorFeature } from './editor-features'
import type { TerrainGenerationOptions } from './local-terrain'

export interface EditorWorld {
  readonly id: string
  readonly title: string
  readonly createdAt: string
  readonly updatedAt: string
  readonly generation: TerrainGenerationOptions
  readonly heights: readonly number[]
  readonly materials: readonly number[]
  readonly features: readonly EditorFeature[]
}

export interface LocalWorldLibrary {
  readonly version: 1
  readonly activeWorldId: string
  readonly worlds: readonly EditorWorld[]
}

export function createEditorWorld(input: Omit<EditorWorld, 'id' | 'createdAt' | 'updatedAt'>, now: Date = new Date()): EditorWorld {
  const timestamp = now.toISOString()
  return { ...cloneWorldContent(input), id: crypto.randomUUID(), createdAt: timestamp, updatedAt: timestamp }
}

export function updateEditorWorld(world: EditorWorld, update: Pick<EditorWorld, 'title' | 'generation' | 'heights' | 'materials' | 'features'>, now: Date = new Date()): EditorWorld {
  return { ...cloneWorldContent(update), id: world.id, createdAt: world.createdAt, updatedAt: now.toISOString() }
}

export function replaceWorld(library: LocalWorldLibrary, replacement: EditorWorld): LocalWorldLibrary {
  if (!library.worlds.some((world) => world.id === replacement.id)) throw new Error('Cannot replace a world that is not in this library.')
  return { ...library, worlds: library.worlds.map((world) => world.id === replacement.id ? cloneWorld(replacement) : world) }
}

export function addWorld(library: LocalWorldLibrary, world: EditorWorld): LocalWorldLibrary {
  if (library.worlds.some((existing) => existing.id === world.id)) throw new Error('Cannot add a world with a duplicate ID.')
  return { version: 1, activeWorldId: world.id, worlds: [...library.worlds, cloneWorld(world)] }
}

export function activateWorld(library: LocalWorldLibrary, worldId: string): LocalWorldLibrary {
  if (!library.worlds.some((world) => world.id === worldId)) throw new Error('Cannot activate an unknown world.')
  return { ...library, activeWorldId: worldId }
}

export function deleteWorld(library: LocalWorldLibrary, worldId: string): LocalWorldLibrary {
  if (library.worlds.length <= 1) throw new Error('A library must retain at least one world.')
  const worlds = library.worlds.filter((world) => world.id !== worldId)
  if (worlds.length === library.worlds.length) throw new Error('Cannot delete an unknown world.')
  return { version: 1, activeWorldId: library.activeWorldId === worldId ? worlds[0]!.id : library.activeWorldId, worlds }
}

export function cloneWorld(world: EditorWorld): EditorWorld {
  return { ...cloneWorldContent(world), id: world.id, createdAt: world.createdAt, updatedAt: world.updatedAt }
}

function cloneWorldContent(world: Pick<EditorWorld, 'title' | 'generation' | 'heights' | 'materials' | 'features'>): Pick<EditorWorld, 'title' | 'generation' | 'heights' | 'materials' | 'features'> {
  return { title: world.title, generation: { ...world.generation }, heights: [...world.heights], materials: [...world.materials], features: world.features.map((feature) => ({ ...feature, coordinates: feature.coordinates.map((coordinate) => ({ ...coordinate })), attributes: { ...feature.attributes } })) }
}
