import type { EditorWorld } from '../domain/editor-world'
import { encodeEditorWorldSnapshot } from '../domain/loka/editor-snapshot'
import { getSupabaseClient } from './supabase'

export interface CloudWorldSummary {
  readonly id: string
  readonly title: string
  readonly updatedAt: string
  readonly sequence: number
}

/** Cloud transport only accepts canonical snapshots; it never receives UI state or inverse history. */
export async function uploadCheckpoint(world: EditorWorld, sequence: number): Promise<void> {
  const supabase = getRequiredClient()
  const { data: identity, error: identityError } = await supabase.auth.getUser()
  if (identityError !== null || identity.user === null) throw new Error('Sign in before saving to cloud.')
  const path = `${identity.user.id}/${world.id}/${sequence}.loka`
  const snapshot = encodeEditorWorldSnapshot(world)
  const { error: uploadError } = await supabase.storage.from('loka-checkpoints').upload(path, new Blob([new Uint8Array(snapshot).buffer as ArrayBuffer]), { contentType: 'application/octet-stream', upsert: false })
  if (uploadError !== null) throw new Error(uploadError.message)
  const { error: worldError } = await supabase.from('worlds').upsert({ id: world.id, owner_id: identity.user.id, title: world.title, checkpoint_path: path, current_sequence: sequence }, { onConflict: 'id' })
  if (worldError !== null) throw new Error(worldError.message)
}

export async function listCloudWorlds(): Promise<CloudWorldSummary[]> {
  const supabase = getRequiredClient()
  const { data, error } = await supabase.from('worlds').select('id,title,updated_at,current_sequence').order('updated_at', { ascending: false })
  if (error !== null) throw new Error(error.message)
  return data.map((world) => ({ id: world.id as string, title: world.title as string, updatedAt: world.updated_at as string, sequence: world.current_sequence as number }))
}

function getRequiredClient() {
  const client = getSupabaseClient()
  if (client === undefined) throw new Error('Cloud persistence is not configured for this deployment.')
  return client
}
