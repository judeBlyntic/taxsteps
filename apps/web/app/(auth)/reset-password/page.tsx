'use client'
import { useState, type FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import { toUserMessage } from '@taxsteps/core'
import { createClient } from '@/lib/supabase/client'
import { TextField } from '@/components/ui/Field'

export default function ResetPasswordPage() {
  const router = useRouter()
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function submit(e: FormEvent) {
    e.preventDefault()
    if (password.length < 8) return setError('Please choose a password with at least 8 characters.')
    if (password !== confirm) return setError("Those passwords don't match.")
    setBusy(true)
    setError(null)
    const supabase = createClient()
    const { data } = await supabase.auth.getSession()
    if (!data.session) {
      setBusy(false)
      return setError('This reset link has expired. Please request a new one.')
    }
    const { error: err } = await supabase.auth.updateUser({ password })
    setBusy(false)
    if (err) return setError(toUserMessage(err))
    router.replace('/')
    router.refresh()
  }

  return (
    <form className="auth-card" onSubmit={submit} noValidate>
      <h2>Choose a new password</h2>
      <TextField label="New password" type="password" autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} />
      <TextField label="Confirm password" type="password" autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} />
      {error && <div className="banner banner-warn" role="alert">{error}</div>}
      <button className="btn btn-primary btn-xl" disabled={busy}>{busy ? 'Saving…' : 'Save password'}</button>
    </form>
  )
}
