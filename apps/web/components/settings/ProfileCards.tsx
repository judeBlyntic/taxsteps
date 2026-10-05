'use client'
import { useState, type FormEvent } from 'react'
import { CURRENCIES, FALLBACK_REGION, ProfileUpdateSchema, TAX_REGIONS, regionFor, toUserMessage, type Profile } from '@taxsteps/core'
import { useUpdateProfile } from '@taxsteps/data'
import { SelectField, TextField } from '@/components/ui/Field'
import { useToast } from '@/components/ui/Toast'

const MONTHS = Array.from({ length: 12 }, (_, i) => new Intl.DateTimeFormat('en', { month: 'long', timeZone: 'UTC' }).format(new Date(Date.UTC(2026, i, 1))))
const REGIONS = Object.values(TAX_REGIONS).sort((a, b) => a.name.localeCompare(b.name))
const TIMEZONES: string[] = typeof Intl.supportedValuesOf === 'function' ? Intl.supportedValuesOf('timeZone') : ['Pacific/Auckland', 'UTC']

export function ProfileCard({ profile, email }: { profile: Profile; email: string }) {
  const update = useUpdateProfile()
  const toast = useToast()
  const tax = regionFor(profile.country).taxLabel
  const [form, setForm] = useState({ full_name: profile.full_name ?? '', business_name: profile.business_name ?? '', tax_number: profile.tax_number ?? '' })

  async function save(e: FormEvent) {
    e.preventDefault()
    try {
      await update.mutateAsync({
        full_name: form.full_name.trim() || null, business_name: form.business_name.trim() || null, tax_number: form.tax_number.trim() || null,
      })
      toast.show('Profile saved')
    } catch (err) {
      toast.show(toUserMessage(err), 'error')
    }
  }

  return (
    <form className="tile stack" style={{ gap: 14 }} onSubmit={save}>
      <h4>Account &amp; business</h4>
      <div className="field-grid">
        <TextField label="Name" value={form.full_name} maxLength={120} onChange={(e) => setForm({ ...form, full_name: e.target.value })} />
        <TextField label="Email" value={email} readOnly />
        <TextField label="Business name" value={form.business_name} maxLength={160} onChange={(e) => setForm({ ...form, business_name: e.target.value })} />
        <TextField label={`${tax} number`} value={form.tax_number} maxLength={40} onChange={(e) => setForm({ ...form, tax_number: e.target.value })} />
      </div>
      <button className="btn btn-dark btn-lg" style={{ alignSelf: 'flex-start' }} disabled={update.isPending}>{update.isPending ? 'Saving…' : 'Save profile'}</button>
    </form>
  )
}

export function RegionCard({ profile }: { profile: Profile }) {
  const update = useUpdateProfile()
  const toast = useToast()
  const [form, setForm] = useState({
    country: profile.country ?? FALLBACK_REGION.country, currency: profile.currency, timezone: profile.timezone,
    locale: profile.locale, fy_start_month: profile.fy_start_month, fy_start_day: profile.fy_start_day,
  })
  const region = regionFor(form.country)

  function chooseCountry(code: string) {
    const r = regionFor(code)
    setForm((f) => code === FALLBACK_REGION.country ? { ...f, country: code }
      : { ...f, country: code, currency: r.currency, fy_start_month: r.fyStartMonth, fy_start_day: r.fyStartDay })
  }

  const localeError = ProfileUpdateSchema.shape.locale.safeParse(form.locale.trim()).success ? null : 'Use a locale like en-NZ, en-US or de-DE'

  async function save(e: FormEvent) {
    e.preventDefault()
    if (localeError) return
    try {
      await update.mutateAsync({ ...form, locale: form.locale.trim(), country: form.country === FALLBACK_REGION.country ? null : form.country })
      toast.show('Region settings saved')
    } catch (err) {
      toast.show(toUserMessage(err), 'error')
    }
  }

  return (
    <form className="tile stack" style={{ gap: 14 }} onSubmit={save}>
      <h4>Region &amp; tax year</h4>
      <div className="field-grid">
        <SelectField label="Country" value={form.country} onChange={(e) => chooseCountry(e.target.value)}>
          {REGIONS.map((r) => <option key={r.country} value={r.country}>{r.name}</option>)}
          <option value={FALLBACK_REGION.country}>Other</option>
        </SelectField>
        <SelectField label="Currency" value={form.currency} onChange={(e) => setForm({ ...form, currency: e.target.value })}>
          {[...new Set([form.currency, ...CURRENCIES])].map((c) => <option key={c}>{c}</option>)}
        </SelectField>
        <SelectField label="Timezone" className="full" value={form.timezone} onChange={(e) => setForm({ ...form, timezone: e.target.value })}>
          {[...new Set([form.timezone, ...TIMEZONES])].map((t) => <option key={t}>{t}</option>)}
        </SelectField>
        <SelectField label="Financial year starts" value={form.fy_start_month} onChange={(e) => setForm({ ...form, fy_start_month: Number(e.target.value) })}>
          {MONTHS.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
        </SelectField>
        <SelectField label="Day" value={form.fy_start_day} onChange={(e) => setForm({ ...form, fy_start_day: Number(e.target.value) })}>
          {Array.from({ length: 31 }, (_, i) => <option key={i} value={i + 1}>{i + 1}</option>)}
        </SelectField>
        <TextField label="Number & date format" className="full" value={form.locale} maxLength={35}
          onChange={(e) => setForm({ ...form, locale: e.target.value })} error={localeError} note={<span className="muted">e.g. en-NZ, en-US, de-DE</span>} />
      </div>
      <p className="muted" style={{ margin: 0, fontSize: 13 }}>Tax is labelled “{region.taxLabel}” for this country.</p>
      <button className="btn btn-dark btn-lg" style={{ alignSelf: 'flex-start' }} disabled={update.isPending}>{update.isPending ? 'Saving…' : 'Save region'}</button>
    </form>
  )
}
