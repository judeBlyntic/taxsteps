'use client'
import { useMemo, useState, type FormEvent } from 'react'
import Link from 'next/link'
import { MailCheck } from 'lucide-react'
import { CURRENCIES, FALLBACK_REGION, TAX_REGIONS, TERMS_VERSION, regionFor, toUserMessage } from '@taxsteps/core'
import { createClient } from '@/lib/supabase/client'
import { GoogleButton } from '@/components/auth/GoogleButton'
import { SelectField, TextField } from '@/components/ui/Field'
import { ICON } from '@/components/ui/icons'

const MONTHS = Array.from({ length: 12 }, (_, i) => new Intl.DateTimeFormat('en', { month: 'long', timeZone: 'UTC' }).format(new Date(Date.UTC(2026, i, 1))))
const REGIONS = Object.values(TAX_REGIONS).sort((a, b) => a.name.localeCompare(b.name))

function guessCountry(): string {
  if (typeof navigator === 'undefined') return 'NZ'
  const region = new Intl.Locale(navigator.language).maximize().region
  return region && TAX_REGIONS[region] ? region : FALLBACK_REGION.country
}

export default function SignUpPage() {
  const initial = useMemo(() => regionFor(guessCountry()), [])
  const [form, setForm] = useState({
    fullName: '', email: '', password: '', country: initial.country, currency: initial.currency,
    fyStartMonth: initial.fyStartMonth, fyStartDay: initial.fyStartDay,
  })
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [sent, setSent] = useState(false)
  const [agreed, setAgreed] = useState(false)
  const set = <K extends keyof typeof form>(k: K, v: (typeof form)[K]) => setForm((f) => ({ ...f, [k]: v }))

  function chooseCountry(code: string) {
    const r = regionFor(code)
    setForm((f) => ({ ...f, country: code, currency: code === FALLBACK_REGION.country ? f.currency : r.currency, fyStartMonth: r.fyStartMonth, fyStartDay: r.fyStartDay }))
  }

  async function submit(e: FormEvent) {
    e.preventDefault()
    if (!agreed) return setError('Please agree to the Terms of Service and Privacy Policy to continue.')
    if (form.password.length < 8) return setError('Please choose a password with at least 8 characters.')
    setBusy(true)
    setError(null)
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone
    const region = regionFor(form.country)
    const { error: err } = await createClient().auth.signUp({
      email: form.email.trim(),
      password: form.password,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/confirm`,
        data: {
          full_name: form.fullName.trim(), country: form.country === FALLBACK_REGION.country ? null : form.country,
          currency: form.currency, timezone,
          locale: form.country === FALLBACK_REGION.country ? navigator.language || region.locale : region.locale,
          fy_start_month: form.fyStartMonth, fy_start_day: form.fyStartDay,
          terms_version: TERMS_VERSION, // the server records when it was accepted
        },
      },
    })
    setBusy(false)
    if (err) return setError(toUserMessage(err))
    setSent(true)
  }

  if (sent) {
    return (
      <div className="auth-card">
        <span className="brand-mark" style={{ width: 56, height: 56 }}><MailCheck {...ICON} /></span>
        <h2>Check your email</h2>
        <p className="muted" style={{ margin: 0 }}>We sent a confirmation link to <b>{form.email}</b>. Open it to activate your account, then sign in.</p>
        <Link className="btn btn-secondary btn-xl" href="/sign-in">Back to sign in</Link>
      </div>
    )
  }

  return (
    <form className="auth-card" onSubmit={submit} noValidate>
      <h2>Create your account</h2>
      <label className="terms-check">
        <input type="checkbox" checked={agreed} onChange={(e) => { setAgreed(e.target.checked); setError(null) }} required />
        <span>
          I agree to the <Link className="link" href="/terms" target="_blank">Terms of Service</Link> and{' '}
          <Link className="link" href="/privacy" target="_blank">Privacy Policy</Link>. Tax Steps never sells or shares my business information.
        </span>
      </label>
      <GoogleButton disabled={!agreed} />
      <TextField label="Your name" autoComplete="name" value={form.fullName} onChange={(e) => set('fullName', e.target.value)} />
      <TextField label="Email" type="email" autoComplete="email" required value={form.email} onChange={(e) => set('email', e.target.value)} />
      <TextField label="Password" type="password" autoComplete="new-password" required minLength={8} value={form.password}
        onChange={(e) => set('password', e.target.value)} note={<span className="muted">At least 8 characters</span>} />
      <div className="field-grid">
        <SelectField label="Country" value={form.country} onChange={(e) => chooseCountry(e.target.value)}>
          {REGIONS.map((r) => <option key={r.country} value={r.country}>{r.name}</option>)}
          <option value={FALLBACK_REGION.country}>Other</option>
        </SelectField>
        <SelectField label="Currency" value={form.currency} onChange={(e) => set('currency', e.target.value)}>
          {CURRENCIES.map((c) => <option key={c}>{c}</option>)}
        </SelectField>
        <SelectField label="Financial year starts" value={form.fyStartMonth} onChange={(e) => set('fyStartMonth', Number(e.target.value))}>
          {MONTHS.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
        </SelectField>
        <SelectField label="Day" value={form.fyStartDay} onChange={(e) => set('fyStartDay', Number(e.target.value))}>
          {Array.from({ length: 31 }, (_, i) => <option key={i} value={i + 1}>{i + 1}</option>)}
        </SelectField>
      </div>
      <p className="muted" style={{ margin: 0, fontSize: 13 }}>
        We prefill your tax year from your country — check it matches your balance date. You can change all of this later.
      </p>
      {error && <div className="banner banner-warn" role="alert">{error}</div>}
      <button className="btn btn-primary btn-xl" disabled={busy || !agreed || !form.email || !form.password}>{busy ? 'Creating account…' : 'Create account'}</button>
      <p style={{ margin: 0, fontSize: 14 }}>Already have an account? <Link className="link" href="/sign-in">Sign in</Link></p>
    </form>
  )
}
