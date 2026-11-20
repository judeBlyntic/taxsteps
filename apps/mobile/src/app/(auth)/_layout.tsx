import { Stack } from 'expo-router'
import { useAppTheme } from '@/lib/app-theme'
import { PALETTES } from '@/lib/theme'

export const unstable_settings = { anchor: 'onboarding' }

export default function AuthLayout() {
  const { theme } = useAppTheme() // the compiler caches screenOptions; it only sees `theme` change, not the live tokens
  return <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: PALETTES[theme].colors.bg } }} />
}
