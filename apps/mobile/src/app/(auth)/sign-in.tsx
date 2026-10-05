import { useState } from 'react'
import { View } from 'react-native'
import { Link } from 'expo-router'
import * as WebBrowser from 'expo-web-browser'
import { toUserMessage } from '@taxsteps/core'
import { Banner, Button, H, Muted, Screen, T, TextField } from '@/components/ui'
import { WEB_URL, supabase } from '@/lib/supabase'
import { colors } from '@/lib/theme'

export default function SignIn() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function submit() {
    setBusy(true)
    setError(null)
    const { error: err } = await supabase.auth.signInWithPassword({ email: email.trim(), password })
    setBusy(false)
    if (err) setError(toUserMessage(err)) // on success the root layout switches to the app
  }

  return (
    <Screen style={{ paddingTop: 40, gap: 18 }}>
      <H size={34}>Welcome back</H>
      <Muted size={15}>Sign in to see your expenses on any device.</Muted>
      <TextField label="Email" value={email} onChangeText={setEmail} autoCapitalize="none" autoComplete="email" keyboardType="email-address" textContentType="emailAddress" />
      <TextField label="Password" value={password} onChangeText={setPassword} secureTextEntry autoComplete="current-password" textContentType="password" onSubmitEditing={submit} />
      {error && <Banner>{error}</Banner>}
      <Button label={busy ? 'Signing in…' : 'Sign in'} onPress={submit} loading={busy} disabled={!email || !password} />
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
        <T weight="semibold" color={colors.accentRamp[700]} onPress={() => void WebBrowser.openBrowserAsync(`${WEB_URL}/forgot-password`)} accessibilityRole="link">
          Forgot password?
        </T>
        <Link href="/sign-up"><T weight="semibold" color={colors.accentRamp[700]}>Create an account</T></Link>
      </View>
    </Screen>
  )
}
