import { applyCommandWithInverse, type CommandTransaction, type WorldCommand } from './commands'
import { WorldDocument } from './world-document'

export interface HistoryEntry { readonly id: string; readonly forward: readonly WorldCommand[]; readonly inverse: readonly WorldCommand[] }
export class DocumentHistory {
  #undo: HistoryEntry[] = []; #redo: HistoryEntry[] = []
  commit(document: WorldDocument, transaction: CommandTransaction): WorldDocument {
    let current = document; const inverse: WorldCommand[] = []
    for (const command of transaction.commands) { const applied = applyCommandWithInverse(current, command); current = applied.document; inverse.unshift(applied.inverse) }
    this.#undo.push({ id: transaction.id, forward: transaction.commands, inverse }); this.#redo = []
    return current
  }
  undo(document: WorldDocument): WorldDocument | undefined { const entry = this.#undo.pop(); if (!entry) return undefined; const next = applyAll(document, entry.inverse); this.#redo.push(entry); return next }
  redo(document: WorldDocument): WorldDocument | undefined { const entry = this.#redo.pop(); if (!entry) return undefined; const next = applyAll(document, entry.forward); this.#undo.push(entry); return next }
}
function applyAll(document: WorldDocument, commands: readonly WorldCommand[]): WorldDocument { return commands.reduce((current, command) => command.apply(current).document, document) }
