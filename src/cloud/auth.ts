import type { User } from '@supabase/supabase-js'
import { getSupabaseClient } from './supabase'

export class CloudConfigurationError extends Error {
  constructor() { super('Cloud sign-in is not configured for this deployment.') }
}

/** Auth boundary: passwords go directly to Supabase Auth and never enter local world storage. */
export async function signUp(email: string, password: string): Promise<void> {
  assertPassword(password)
  const supabase = requireClient()
  const { error } = await supabase.auth.signUp({ email, password })
  if (error !== null) throw new Error(error.message)
}

export async function signIn(email: string, password: string): Promise<void> {
  const supabase = requireClient()
  const { error } = await supabase.auth.signInWithPassword({ email, password })
  if (error !== null) throw new Error(error.message)
}

export async function signOut(): Promise<void> {
  const supabase = requireClient()
  const { error } = await supabase.auth.signOut()
  if (error !== null) throw new Error(error.message)
}

export async function currentUser(): Promise<User | undefined> {
  const supabase = getSupabaseClient()
  if (supabase === undefined) return undefined
  const { data, error } = await supabase.auth.getUser()
  if (error !== null) throw new Error(error.message)
  return data.user ?? undefined
}

function requireClient() {
  const client = getSupabaseClient()
  if (client === undefined) throw new CloudConfigurationError()
  return client
}

function assertPassword(password: string): void {
  if (password.length < 12) throw new Error('Use at least 12 characters for your password.')
}
