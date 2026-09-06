import { describe, expect, it } from 'vitest'
import { AppendOnlyWorklog } from './worklog'

describe('AppendOnlyWorklog', () => {
  it('retains immutable append order and rejects sequence gaps', () => {
    const worklog = new AppendOnlyWorklog<string, string>()
    worklog.append({ id: 'one', sequence: 1, baseCheckpointId: 'checkpoint-1', forward: 'forward', inverse: 'inverse', committedAt: '2026-09-06T00:00:00.000Z' })

    expect(worklog.records()).toHaveLength(1)
    expect(() => worklog.append({ id: 'three', sequence: 3, baseCheckpointId: 'checkpoint-1', forward: 'forward', inverse: 'inverse', committedAt: '2026-09-06T00:00:01.000Z' })).toThrow(/contiguous/i)
  })
})
