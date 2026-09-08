import { useEffect, useState, type FormEvent } from 'react'
import { currentUser, signIn, signOut, signUp } from '../cloud/auth'
import { getSupabaseClient } from '../cloud/supabase'

/** Minimal account affordance; it disappears in the intentionally local-only configuration. */
export function AccountPanel() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [signedInEmail, setSignedInEmail] = useState<string | undefined>()
  const [message, setMessage] = useState<string | undefined>()
  const cloudConfigured = getSupabaseClient() !== undefined

  useEffect(() => {
    if (!cloudConfigured) return undefined
    void currentUser().then((user) => setSignedInEmail(user?.email)).catch(() => setMessage('Unable to verify the current account.'))
    return undefined
  }, [cloudConfigured])

  if (!cloudConfigured) return null
  if (signedInEmail !== undefined) return <div className="account-panel"><span>{signedInEmail}</span><button className="quiet-action" type="button" onClick={() => { void signOut().then(() => setSignedInEmail(undefined)).catch((error: unknown) => setMessage(error instanceof Error ? error.message : 'Unable to sign out.')) }}>Sign out</button>{message !== undefined && <p role="status">{message}</p>}</div>

  const submit = (mode: 'sign-in' | 'sign-up') => async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setMessage(undefined)
    try {
      if (mode === 'sign-up') await signUp(email, password)
      else await signIn(email, password)
      const user = await currentUser()
      setSignedInEmail(user?.email)
      setMessage(mode === 'sign-up' && user === undefined ? 'Check your email to verify your account, then sign in.' : undefined)
    } catch (error: unknown) { setMessage(error instanceof Error ? error.message : 'Unable to continue.') }
  }

  return <form className="account-panel" onSubmit={submit('sign-in')}><label>Email<input autoComplete="email" required type="email" value={email} onChange={(event) => setEmail(event.target.value)} /></label><label>Password<input autoComplete="current-password" minLength={12} required type="password" value={password} onChange={(event) => setPassword(event.target.value)} /></label><button className="quiet-action" type="submit">Sign in</button><button className="quiet-action" type="button" onClick={() => { void (async () => { try { await signUp(email, password); setMessage('Check your email to verify your account, then sign in.') } catch (error: unknown) { setMessage(error instanceof Error ? error.message : 'Unable to create account.') } })() }}>Create account</button>{message !== undefined && <p role="status">{message}</p>}</form>
}
