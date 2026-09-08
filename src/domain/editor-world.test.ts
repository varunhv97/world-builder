import { describe, expect, it } from 'vitest'
import { activateWorld, addWorld, createEditorWorld, deleteWorld, replaceWorld, updateEditorWorld, type LocalWorldLibrary } from './editor-world'
import { DEFAULT_TERRAIN_OPTIONS } from './local-terrain'

function world(title: string) { return createEditorWorld({ title, generation: DEFAULT_TERRAIN_OPTIONS, heights: [0, 0, 0, 0], materials: [1, 1, 1, 1], features: [] }, new Date('2026-01-01T00:00:00.000Z')) }

describe('editor worlds', () => {
  it('updates content without mutating the original world', () => {
    const original = world('First')
    const updated = updateEditorWorld(original, { title: 'Renamed', generation: DEFAULT_TERRAIN_OPTIONS, heights: [1, 0, 0, 0], materials: [1, 1, 1, 1], features: [] }, new Date('2026-01-02T00:00:00.000Z'))
    expect(original.title).toBe('First')
    expect(updated.title).toBe('Renamed')
    expect(updated.createdAt).toBe(original.createdAt)
    expect(updated.updatedAt).not.toBe(original.updatedAt)
  })

  it('selects a surviving world when deleting the active world', () => {
    const first = world('First'); const second = world('Second')
    const library: LocalWorldLibrary = { version: 1, activeWorldId: first.id, worlds: [first, second] }
    expect(deleteWorld(library, first.id).activeWorldId).toBe(second.id)
    expect(replaceWorld(library, updateEditorWorld(first, { title: 'Updated', generation: DEFAULT_TERRAIN_OPTIONS, heights: [0, 0, 0, 0], materials: [1, 1, 1, 1], features: [] })).worlds[0]!.title).toBe('Updated')
  })
  it('adds and activates independently navigable worlds', () => {
    const first = world('First'); const second = world('Second')
    const library: LocalWorldLibrary = { version: 1, activeWorldId: first.id, worlds: [first] }
    expect(activateWorld(addWorld(library, second), first.id).activeWorldId).toBe(first.id)
  })
})
