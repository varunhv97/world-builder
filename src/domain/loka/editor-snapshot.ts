import type { EditorWorld } from '../editor-world'
import { decodeCheckpoint, encodeCheckpoint } from './checkpoint'

const SNAPSHOT_KIND = 'world-builder/editor-world'
const SNAPSHOT_VERSION = 1

/**
 * A portable local-editor snapshot. The LOKA checkpoint header and checksum
 * protect the payload today; the domain record deliberately excludes UI state
 * and can later be emitted into canonical LOKA chunks without changing callers.
 */
export function encodeEditorWorldSnapshot(world: EditorWorld): Uint8Array {
  return encodeCheckpoint(world.id, { kind: SNAPSHOT_KIND, version: SNAPSHOT_VERSION, world })
}

export function decodeEditorWorldSnapshot(bytes: Uint8Array): EditorWorld {
  const { header, bootstrap } = decodeCheckpoint(bytes)
  if (!isSnapshot(bootstrap) || bootstrap.world.id !== header.worldId) throw new Error('LOKA file does not contain a supported World Builder snapshot.')
  return cloneWorld(bootstrap.world)
}

function isSnapshot(value: unknown): value is { readonly kind: typeof SNAPSHOT_KIND; readonly version: typeof SNAPSHOT_VERSION; readonly world: EditorWorld } {
  if (typeof value !== 'object' || value === null) return false
  const snapshot = value as { kind?: unknown; version?: unknown; world?: unknown }
  return snapshot.kind === SNAPSHOT_KIND && snapshot.version === SNAPSHOT_VERSION && isEditorWorld(snapshot.world)
}

function isEditorWorld(value: unknown): value is EditorWorld {
  if (typeof value !== 'object' || value === null) return false
  const world = value as Partial<EditorWorld>
  return typeof world.id === 'string' && typeof world.title === 'string' && typeof world.createdAt === 'string' && typeof world.updatedAt === 'string' && Array.isArray(world.heights) && world.heights.every(Number.isFinite) && Array.isArray(world.materials) && world.materials.every(Number.isInteger) && Array.isArray(world.features) && typeof world.generation === 'object' && world.generation !== null
}

function cloneWorld(world: EditorWorld): EditorWorld {
  return { ...world, generation: { ...world.generation }, heights: [...world.heights], materials: [...world.materials], features: world.features.map((feature) => ({ ...feature, coordinates: feature.coordinates.map((coordinate) => ({ ...coordinate })), attributes: { ...feature.attributes } })) }
}
