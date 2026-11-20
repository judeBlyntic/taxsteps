'use client'
import { useState, type FormEvent } from 'react'
import Link from 'next/link'
import { toUserMessage } from '@taxsteps/core'
import { createClient } from '@/lib/supabase/client'
import { TextField } from '@/components/ui/Field'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [tried, setTried] = useState(false) // the field error shows after the first submit and clears once filled
  const emailError = tried && !email.trim() ? 'Enter your email address.' : null

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setTried(true)
    if (!email.trim()) return e.currentTarget.querySelector<HTMLInputElement>('input[type=email]')?.focus()
    setBusy(true)
    setError(null)
    const { error: err } = await createClient().auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${window.location.origin}/auth/confirm?next=/reset-password`,
    })
    setBusy(false)
    if (err) return setError(toUserMessage(err))
    setSent(true)
  }

  return (
    <form className="auth-card" onSubmit={submit} noValidate>
      <h2>Reset your password</h2>
      {sent ? (
        <div className="banner banner-ok" role="status">If an account exists for {email}, a reset link is on its way. Open it on this device.</div>
      ) : (
        <>
          <p className="muted" style={{ margin: 0 }}>We&apos;ll email you a link to choose a new password.</p>
          <TextField label="Email" type="email" autoComplete="email" required error={emailError} value={email} onChange={(e) => setEmail(e.target.value)} />
          {error && <div className="banner banner-warn" role="alert">{error}</div>}
          <button className="btn btn-primary btn-xl" disabled={busy}>{busy ? 'Sending…' : 'Send reset link'}</button>
        </>
      )}
      <Link className="link" href="/sign-in">Back to sign in</Link>
    </form>
  )
}
