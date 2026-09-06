import { decodeCheckpoint, encodeCheckpoint } from './checkpoint'
import type { WorklogRecord } from '../worklog'

/** Produces and validates a fresh checkpoint; callers may discard compacted worklog records only after this returns. */
export function compactCheckpoint<Forward, Inverse>(worldId: string, bootstrap: unknown, records: readonly WorklogRecord<Forward, Inverse>[]): { readonly checkpoint: Uint8Array; readonly compactedThroughSequence: number } {
  const checkpoint = encodeCheckpoint(worldId, { bootstrap, appliedWorklogSequences: records.map((record) => record.sequence) })
  decodeCheckpoint(checkpoint)
  return { checkpoint, compactedThroughSequence: records.at(-1)?.sequence ?? 0 }
}
