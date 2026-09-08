import { createClient, type SupabaseClient } from '@supabase/supabase-js'

interface SupabaseEnvironment {
  readonly url: string
  readonly publishableKey: string
}

let client: SupabaseClient | undefined

/** Returns undefined in local-only development; credentials are never hard-coded. */
export function getSupabaseClient(): SupabaseClient | undefined {
  if (client !== undefined) return client
  const environment = readEnvironment()
  if (environment === undefined) return undefined
  client = createClient(environment.url, environment.publishableKey, { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true } })
  return client
}

function readEnvironment(): SupabaseEnvironment | undefined {
  const url = import.meta.env['VITE_SUPABASE_URL']
  const publishableKey = import.meta.env['VITE_SUPABASE_PUBLISHABLE_KEY']
  if (url === undefined || publishableKey === undefined || url.length === 0 || publishableKey.length === 0) return undefined
  return { url, publishableKey }
}
