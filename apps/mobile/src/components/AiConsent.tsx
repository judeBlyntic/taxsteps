// Explicit, one-time permission before any receipt photo goes to the AI provider.
// Required by App Review Guideline 5.1.2(i) (third-party AI) and Google Play's User Data policy.
// Stored per account on this device; nothing is captured or uploaded until it is granted.
import { useCallback, useState } from 'react'
import { View } from 'react-native'
import { useFocusEffect, useRouter } from 'expo-router'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { Sparkles } from 'lucide-react-native'
import { COPY } from '@taxsteps/core'
import { Button, H, Screen, T } from '@/components/ui'
import { useSession } from '@/lib/session'
import { colors } from '@/lib/theme'

const keyFor = (userId: string) => `taxsteps.aiConsent.v1.${userId}`

export function useAiConsent() {
  const userId = useSession().session?.user.id ?? 'signed-out'
  const [granted, setGranted] = useState<boolean | null>(null)
  // Re-read on every focus: it's granted on the Scan screen and can be withdrawn in Settings.
  // (Signing out unmounts these screens, so a value never carries over to another account.)
  useFocusEffect(useCallback(() => {
    void AsyncStorage.getItem(keyFor(userId)).then((v) => setGranted(v === '1')).catch(() => setGranted(false))
  }, [userId]))
  const grant = useCallback(async () => {
    setGranted(true)
    await AsyncStorage.setItem(keyFor(userId), '1').catch(() => undefined)
  }, [userId])
  const revoke = useCallback(async () => {
    setGranted(false)
    await AsyncStorage.removeItem(keyFor(userId)).catch(() => undefined)
  }, [userId])
  return { granted, grant, revoke }
}

export function AiConsent({ onAllow, onManual, onClose }: { onAllow: () => void; onManual: () => void; onClose: () => void }) {
  const router = useRouter()
  return (
    <Screen style={{ paddingTop: 40, gap: 16 }}>
      <View style={{ width: 56, height: 56, borderRadius: 28, backgroundColor: colors.accent, alignItems: 'center', justifyContent: 'center' }}>
        <Sparkles size={26} color={colors.bg} strokeWidth={2.75} />
      </View>
      <H size={30}>{COPY.aiConsentTitle}</H>
      <T>{COPY.aiConsent}</T>
      <T color={colors.accentRamp[700]} accessibilityRole="link" onPress={() => router.push({ pathname: '/legal', params: { doc: 'privacy' } })}>
        Read the Privacy Policy
      </T>
      <Button label="Allow and scan" onPress={onAllow} />
      <Button label="Enter details manually instead" variant="secondary" onPress={onManual} />
      <Button label="Not now" variant="ghost" onPress={onClose} />
    </Screen>
  )
}
