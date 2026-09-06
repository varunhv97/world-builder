import { describe, expect, it } from 'vitest'
import { decodeCheckpoint, encodeCheckpoint } from './checkpoint'
describe('LOKA checkpoints', () => { it('round-trips header and bootstrap payload', () => { const bytes = encodeCheckpoint('8e73c497-5bf5-4e08-9fa4-63b864a4d786', { title: 'Ember Coast' }); expect(decodeCheckpoint(bytes).bootstrap).toEqual({ title: 'Ember Coast' }) }) })
