import { useEffect, useState } from 'react'
import type { User } from '@supabase/supabase-js'
import type { EditorWorld } from '../domain/editor-world'
import { getSupabaseClient } from '../cloud/supabase'
import { saveCloudCheckpoint } from '../cloud/world-sync'

type CloudStatus = 'unavailable' | 'local' | 'saving' | 'saved' | 'error'

/** Debounced checkpoint sync for authenticated solo creators; local recovery remains independent. */
export function CloudSync({ world }: { readonly world: EditorWorld }) {
  const [user, setUser] = useState<User | undefined>()
  const [syncStatus, setSyncStatus] = useState<CloudStatus>('local')
  const cloudConfigured = getSupabaseClient() !== undefined

  useEffect(() => {
    const supabase = getSupabaseClient()
    if (supabase === undefined) return undefined
    void supabase.auth.getUser().then(({ data }) => setUser(data.user ?? undefined))
    const { data: subscription } = supabase.auth.onAuthStateChange((_event, session) => setUser(session?.user))
    return () => subscription.subscription.unsubscribe()
  }, [])

  useEffect(() => {
    if (user === undefined) return undefined
    const timer = window.setTimeout(() => {
      setSyncStatus('saving')
      void saveCloudCheckpoint(world).then(() => setSyncStatus('saved')).catch(() => setSyncStatus('error'))
    }, 900)
    return () => window.clearTimeout(timer)
  }, [user, world])

  const status = user === undefined ? (cloudConfigured ? 'local' : 'unavailable') : syncStatus
  const text: Record<CloudStatus, string> = { unavailable: 'Saved locally', local: 'Sign in to sync', saving: 'Saving to cloud…', saved: 'Synced to cloud', error: 'Cloud save needs attention' }
  return <span className={`cloud-status is-${status}`} role="status">{text[status]}</span>
}
