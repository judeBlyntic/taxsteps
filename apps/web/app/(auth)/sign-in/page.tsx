'use client'
import { Suspense, useState, type FormEvent } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { toUserMessage } from '@taxsteps/core'
import { createClient } from '@/lib/supabase/client'
import { GoogleButton } from '@/components/auth/GoogleButton'
import { TextField } from '@/components/ui/Field'

function Notice() {
  const params = useSearchParams()
  if (params.get('deleted')) return <div className="banner banner-ok">Your account and data have been deleted.</div>
  if (params.get('confirmed')) return <div className="banner banner-ok">Email confirmed — please sign in.</div>
  if (params.get('error') === 'google') return <div className="banner banner-warn">Google sign-in didn&apos;t finish. Please try again, or use your email and password.</div>
  if (params.get('error')) return <div className="banner banner-warn">That link has expired or was already used. Please try again.</div>
  return null
}

export default function SignInPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function submit(e: FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError(null)
    const { error: err } = await createClient().auth.signInWithPassword({ email: email.trim(), password })
    setBusy(false)
    if (err) return setError(toUserMessage(err))
    router.replace('/')
    router.refresh()
  }

  return (
    <form className="auth-card" onSubmit={submit} noValidate>
      <h2>Welcome back</h2>
      <p className="muted" style={{ margin: 0 }}>Sign in to see your expenses on any device.</p>
      <Suspense><Notice /></Suspense>
      <GoogleButton />
      <TextField label="Email" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
      <TextField label="Password" type="password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} />
      {error && <div className="banner banner-warn" role="alert">{error}</div>}
      <button className="btn btn-primary btn-xl" disabled={busy || !email || !password}>{busy ? 'Signing in…' : 'Sign in'}</button>
      <div className="row" style={{ justifyContent: 'space-between', fontSize: 14 }}>
        <Link className="link" href="/forgot-password">Forgot password?</Link>
        <span>New here? <Link className="link" href="/sign-up">Create an account</Link></span>
      </div>
    </form>
  )
}
