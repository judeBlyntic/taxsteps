import { useMemo, useState } from 'react'
import { Pressable, View } from 'react-native'
import { Link } from 'expo-router'
import { MailCheck } from 'lucide-react-native'
import { FALLBACK_REGION, TAX_REGIONS, regionFor, toUserMessage } from '@taxsteps/core'
import { Banner, Button, Chip, H, Muted, Screen, T, TextField } from '@/components/ui'
import { WEB_URL, supabase } from '@/lib/supabase'
import { colors } from '@/lib/theme'

const REGIONS = Object.values(TAX_REGIONS).sort((a, b) => a.name.localeCompare(b.name))
const monthName = (m: number) => new Intl.DateTimeFormat('en', { month: 'long', timeZone: 'UTC' }).format(new Date(Date.UTC(2026, m - 1, 1)))

function deviceRegion(): string {
  const locale = Intl.DateTimeFormat().resolvedOptions().locale
  const region = locale.split('-').find((p) => /^[A-Z]{2}$/.test(p))
  return region && TAX_REGIONS[region] ? region : 'NZ'
}

export default function SignUp() {
  const [country, setCountry] = useState(useMemo(deviceRegion, []))
  const [showCountries, setShowCountries] = useState(false)
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [sent, setSent] = useState(false)
  const region = regionFor(country)

  async function submit() {
    if (password.length < 8) return setError('Please choose a password with at least 8 characters.')
    setBusy(true)
    setError(null)
    const { error: err } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: {
        // Confirmation links open on the web (no tokens are ever sent to custom app schemes).
        emailRedirectTo: `${WEB_URL}/auth/confirmed`,
        data: {
          full_name: fullName.trim(), country: country === FALLBACK_REGION.country ? null : country, currency: region.currency,
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone, locale: Intl.DateTimeFormat().resolvedOptions().locale,
          fy_start_month: region.fyStartMonth, fy_start_day: region.fyStartDay,
        },
      },
    })
    setBusy(false)
    if (err) return setError(toUserMessage(err))
    setSent(true)
  }

  if (sent) {
    return (
      <Screen style={{ paddingTop: 60, gap: 16 }}>
        <View style={{ width: 56, height: 56, borderRadius: 28, backgroundColor: colors.accent, alignItems: 'center', justifyContent: 'center' }}>
          <MailCheck size={26} color={colors.bg} strokeWidth={2.75} />
        </View>
        <H size={32}>Check your email</H>
        <Muted size={15}>We sent a confirmation link to {email}. Open it, then come back and sign in.</Muted>
        <Link href="/sign-in" asChild><Button label="Back to sign in" variant="secondary" /></Link>
      </Screen>
    )
  }

  return (
    <Screen style={{ paddingTop: 30, gap: 16 }}>
      <H size={32}>Create your account</H>
      <TextField label="Your name" value={fullName} onChangeText={setFullName} autoComplete="name" />
      <TextField label="Email" value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" autoComplete="email" />
      <TextField label="Password" value={password} onChangeText={setPassword} secureTextEntry autoComplete="new-password" note="At least 8 characters" />
      <View style={{ gap: 8 }}>
        <T weight="semibold" size={13}>Country</T>
        <Pressable accessibilityRole="button" onPress={() => setShowCountries((v) => !v)}
          style={{ minHeight: 48, borderRadius: 999, borderWidth: 1, borderColor: colors.divider, backgroundColor: colors.surface, paddingHorizontal: 16, justifyContent: 'center' }}>
          <T weight="semibold">{country === FALLBACK_REGION.country ? 'Other' : region.name}</T>
        </Pressable>
        {showCountries && (
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
            {[...REGIONS, FALLBACK_REGION].map((r) => (
              <Chip key={r.country} label={r.country === FALLBACK_REGION.country ? 'Other' : r.name} selected={r.country === country}
                onPress={() => { setCountry(r.country); setShowCountries(false) }} />
            ))}
          </View>
        )}
        <Muted>Currency {region.currency} · tax year starts {region.fyStartDay} {monthName(region.fyStartMonth)} · you can change these later.</Muted>
      </View>
      {error && <Banner>{error}</Banner>}
      <Button label={busy ? 'Creating account…' : 'Create account'} onPress={submit} loading={busy} disabled={!email || !password} />
      <Link href="/sign-in"><T weight="semibold" color={colors.accentRamp[700]}>I already have an account</T></Link>
    </Screen>
  )
}
