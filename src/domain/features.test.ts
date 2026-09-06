import { describe, expect, it } from 'vitest'
import { validateFeature } from './features'
describe('geographic features', () => { it('flags malformed river paths without blocking them', () => { expect(validateFeature({ id: 'river-1', kind: 'path', name: 'Ashrun', coordinates: [{ x: 0, y: 4 }, { x: 1, y: 2 }], attributes: { type: 'river' } })).toContain('River path includes an uphill segment.') }) })
