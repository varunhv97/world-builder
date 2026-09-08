import { applyEditorDelta, diffEditorContent, type EditorContent, type IndexedDelta } from './editor-delta'

export interface MergeConflict {
  readonly layer: 'terrain' | 'surface' | 'features'
  readonly indexes?: readonly number[]
}

export interface EditorMergeResult {
  readonly merged: EditorContent
  readonly conflicts: readonly MergeConflict[]
}

/**
 * Three-way merge from a common checkpoint. Non-overlapping cell edits merge;
 * conflicting edits are reported so callers can preserve a recovered copy.
 */
export function mergeEditorContent(base: EditorContent, local: EditorContent, remote: EditorContent): EditorMergeResult {
  const localDelta = diffEditorContent(base, local)
  const remoteDelta = diffEditorContent(base, remote)
  const terrainConflicts = overlappingIndexes(localDelta.heightChanges, remoteDelta.heightChanges)
  const surfaceConflicts = overlappingIndexes(localDelta.materialChanges, remoteDelta.materialChanges)
  const featuresConflict = localDelta.featuresBefore !== undefined && remoteDelta.featuresBefore !== undefined
  const safeRemote = {
    heightChanges: remoteDelta.heightChanges.filter((change) => !terrainConflicts.includes(change.index)),
    materialChanges: remoteDelta.materialChanges.filter((change) => !surfaceConflicts.includes(change.index)),
    ...(featuresConflict ? {} : remoteDelta.featuresBefore === undefined ? {} : { featuresBefore: remoteDelta.featuresBefore, featuresAfter: remoteDelta.featuresAfter }),
  }
  const merged = applyEditorDelta(local, safeRemote, 'forward')
  const conflicts: MergeConflict[] = [
    ...(terrainConflicts.length === 0 ? [] : [{ layer: 'terrain' as const, indexes: terrainConflicts }]),
    ...(surfaceConflicts.length === 0 ? [] : [{ layer: 'surface' as const, indexes: surfaceConflicts }]),
    ...(featuresConflict ? [{ layer: 'features' as const }] : []),
  ]
  return { merged, conflicts }
}

function overlappingIndexes(local: readonly IndexedDelta<number>[], remote: readonly IndexedDelta<number>[]): number[] {
  const remoteByIndex = new Map(remote.map((change) => [change.index, change]))
  return local.filter((change) => {
    const other = remoteByIndex.get(change.index)
    return other !== undefined && other.after !== change.after
  }).map((change) => change.index)
}
