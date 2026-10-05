import { Pressable, View } from 'react-native'
import { useRouter } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import type { BottomTabBarProps } from 'expo-router/js-tabs'
import { BarChart3, Home, Receipt, ScanLine, Settings, type LucideIcon } from 'lucide-react-native'
import { colors, shadow } from '@/lib/theme'
import { T } from './ui'

const TABS: Record<string, { label: string; icon: LucideIcon }> = {
  index: { label: 'Home', icon: Home },
  documents: { label: 'Documents', icon: Receipt },
  reports: { label: 'Reports', icon: BarChart3 },
  settings: { label: 'Settings', icon: Settings },
}

/** Home · Documents · [Scan] · Reports · Settings — the Scan button is always the obvious action. */
export function TabBar({ state, navigation }: BottomTabBarProps) {
  const router = useRouter()
  const insets = useSafeAreaInsets()
  const routes = state.routes.filter((r) => TABS[r.name])
  const tab = (name: string) => {
    const route = routes.find((r) => r.name === name)
    if (!route) return null
    const focused = state.routes[state.index]?.key === route.key
    const { label, icon: Icon } = TABS[name]!
    return (
      <Pressable key={name} accessibilityRole="tab" accessibilityState={{ selected: focused }} accessibilityLabel={label}
        onPress={() => navigation.navigate(route.name)} style={{ flex: 1, alignItems: 'center', gap: 3 }}>
        <View style={{ width: 54, height: 30, borderRadius: 999, alignItems: 'center', justifyContent: 'center', backgroundColor: focused ? colors.accent2Ramp[200] : 'transparent' }}>
          <Icon size={22} color={focused ? colors.text : colors.neutral[600]} strokeWidth={2.75} />
        </View>
        <T weight="bold" size={11} color={focused ? colors.text : colors.neutral[600]}>{label}</T>
      </Pressable>
    )
  }
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', paddingTop: 10, paddingBottom: Math.max(insets.bottom, 8), backgroundColor: colors.bg, borderTopWidth: 1, borderTopColor: colors.divider }}>
      {tab('index')}{tab('documents')}
      <View style={{ width: 80, alignItems: 'center' }}>
        <Pressable accessibilityRole="button" accessibilityLabel="Scan receipt" onPress={() => router.push('/scan')}
          style={({ pressed }) => [{ width: 66, height: 66, marginTop: -34, borderRadius: 33, alignItems: 'center', justifyContent: 'center', backgroundColor: pressed ? colors.accentRamp[600] : colors.accent, borderWidth: 6, borderColor: colors.bg }, shadow.md]}>
          <ScanLine size={26} color={colors.bg} strokeWidth={2.75} />
        </Pressable>
      </View>
      {tab('reports')}{tab('settings')}
    </View>
  )
}
