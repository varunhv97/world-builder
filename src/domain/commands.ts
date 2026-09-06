import { LokaFormatError } from './loka/header'
import { TerrainChunk } from './loka/terrain'
import { WorldDocument } from './world-document'

export interface CommandResult {
  readonly document: WorldDocument
  readonly changedTerrainChunks: readonly { readonly column: number; readonly row: number }[]
}

/** A serializable domain operation; UI and renderers must not mutate documents directly. */
export interface WorldCommand {
  readonly type: string
  apply(document: WorldDocument): CommandResult
}

export class ReplaceTerrainChunkCommand implements WorldCommand {
  readonly type = 'terrain.replace-chunk'
  readonly chunk: TerrainChunk

  constructor(chunk: TerrainChunk) {
    this.chunk = chunk
  }

  apply(document: WorldDocument): CommandResult {
    const { column, row } = this.chunk.coordinate

    if (document.bootstrap.materialPalette.length === 0) {
      throw new LokaFormatError('Cannot replace terrain without a material palette.')
    }

    return {
      document: document.withTerrainChunk(this.chunk),
      changedTerrainChunks: [{ column, row }],
    }
  }
}

export class RemoveTerrainChunkCommand implements WorldCommand {
  readonly type = 'terrain.remove-chunk'
  readonly column: number
  readonly row: number

  constructor(column: number, row: number) {
    this.column = column
    this.row = row
  }

  apply(document: WorldDocument): CommandResult {
    return {
      document: document.withoutTerrainChunk(this.column, this.row),
      changedTerrainChunks: [{ column: this.column, row: this.row }],
    }
  }
}

export interface CommandTransaction {
  readonly id: string
  readonly commands: readonly WorldCommand[]
}

export function applyTransaction(
  document: WorldDocument,
  transaction: CommandTransaction,
): CommandResult {
  if (transaction.id.trim().length === 0 || transaction.commands.length === 0) {
    throw new LokaFormatError('A transaction requires an ID and at least one command.')
  }

  let currentDocument = document
  const changedTerrainChunks = new Map<string, { readonly column: number; readonly row: number }>()

  for (const command of transaction.commands) {
    const result = command.apply(currentDocument)
    currentDocument = result.document

    for (const coordinate of result.changedTerrainChunks) {
      changedTerrainChunks.set(`${coordinate.column},${coordinate.row}`, coordinate)
    }
  }

  return { document: currentDocument, changedTerrainChunks: [...changedTerrainChunks.values()] }
}
