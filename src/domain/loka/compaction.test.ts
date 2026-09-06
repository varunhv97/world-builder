import { describe, expect, it } from 'vitest'
import { compactCheckpoint } from './compaction'
describe('checkpoint compaction', () => { it('validates a new checkpoint before reporting compacted work', () => { const result = compactCheckpoint('8e73c497-5bf5-4e08-9fa4-63b864a4d786', { title: 'Ember Coast' }, [{ id: 'one', sequence: 1, baseCheckpointId: 'old', forward: {}, inverse: {}, committedAt: '2026-09-06T00:00:00.000Z' }]); expect(result.checkpoint.byteLength).toBeGreaterThan(48); expect(result.compactedThroughSequence).toBe(1) }) })
