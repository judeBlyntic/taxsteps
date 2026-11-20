import { Stack } from 'expo-router'
import { colors } from '@/lib/theme'

export const unstable_settings = { anchor: 'onboarding' }

export default function AuthLayout() {
  return <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.bg } }} />
}
