import type { EditorFeature } from './editor-features'

export interface EditorContent {
  readonly heights: readonly number[]
  readonly materials: readonly number[]
  readonly features: readonly EditorFeature[]
}

export interface IndexedDelta<T> {
  readonly index: number
  readonly before: T
  readonly after: T
}

/** Exact forward/inverse information for a committed editor gesture. */
export interface EditorDelta {
  readonly heightChanges: readonly IndexedDelta<number>[]
  readonly materialChanges: readonly IndexedDelta<number>[]
  readonly featuresBefore?: readonly EditorFeature[]
  readonly featuresAfter?: readonly EditorFeature[]
}

export function diffEditorContent(before: EditorContent, after: EditorContent): EditorDelta {
  if (before.heights.length !== after.heights.length || before.materials.length !== after.materials.length) throw new Error('Cannot diff incompatible terrain dimensions.')
  const heightChanges = diffIndexed(before.heights, after.heights)
  const materialChanges = diffIndexed(before.materials, after.materials)
  const featuresChanged = JSON.stringify(before.features) !== JSON.stringify(after.features)
  return { heightChanges, materialChanges, ...(featuresChanged ? { featuresBefore: cloneFeatures(before.features), featuresAfter: cloneFeatures(after.features) } : {}) }
}

export function applyEditorDelta(content: EditorContent, delta: EditorDelta, direction: 'forward' | 'inverse'): EditorContent {
  const heights = applyIndexed(content.heights, delta.heightChanges, direction)
  const materials = applyIndexed(content.materials, delta.materialChanges, direction)
  const features = direction === 'forward' ? delta.featuresAfter : delta.featuresBefore
  return { heights, materials, features: features === undefined ? cloneFeatures(content.features) : cloneFeatures(features) }
}

export function isEmptyEditorDelta(delta: EditorDelta): boolean {
  return delta.heightChanges.length === 0 && delta.materialChanges.length === 0 && delta.featuresBefore === undefined
}

function diffIndexed(before: readonly number[], after: readonly number[]): IndexedDelta<number>[] {
  const changes: IndexedDelta<number>[] = []
  for (let index = 0; index < before.length; index += 1) if (before[index] !== after[index]) changes.push({ index, before: before[index]!, after: after[index]! })
  return changes
}

function applyIndexed(values: readonly number[], changes: readonly IndexedDelta<number>[], direction: 'forward' | 'inverse'): number[] {
  const next = [...values]
  for (const change of changes) next[change.index] = direction === 'forward' ? change.after : change.before
  return next
}

function cloneFeatures(features: readonly EditorFeature[]): EditorFeature[] {
  return features.map((feature) => ({ ...feature, coordinates: feature.coordinates.map((coordinate) => ({ ...coordinate })), attributes: { ...feature.attributes } }))
}
