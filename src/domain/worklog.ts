/**
 * Persistence-facing shape for a committed editor transaction. Inverse data is
 * device-local; cloud synchronization will upload only the forward record.
 */
export interface WorklogRecord<Forward, Inverse> {
  readonly id: string
  readonly sequence: number
  readonly baseCheckpointId: string
  readonly forward: Forward
  readonly inverse: Inverse
  readonly committedAt: string
}

/** Small append-only in-memory core; storage adapters supply durable backing. */
export class AppendOnlyWorklog<Forward, Inverse> {
  #records: WorklogRecord<Forward, Inverse>[] = []

  append(record: WorklogRecord<Forward, Inverse>): void {
    const previous = this.#records.at(-1)
    if (previous !== undefined && record.sequence !== previous.sequence + 1) {
      throw new Error('Worklog sequence must be contiguous.')
    }
    this.#records.push(record)
  }

  records(): readonly WorklogRecord<Forward, Inverse>[] {
    return [...this.#records]
  }
}
