import { useEffect, useState } from 'react'
import { View } from 'react-native'
import { Redirect, useRouter } from 'expo-router'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { ArrowRight, BarChart3, ScanLine, ShieldCheck, Sparkles, type LucideIcon } from 'lucide-react-native'
import { Button, H, Muted, Screen, T } from '@/components/ui'
import { colors, shadow } from '@/lib/theme'

// A function, not a constant: theme colours must be read at render time.
const slides = (): { kicker: string; title: string; body: string; chip: string; icon: LucideIcon; bg: string; c1: string; c2: string; fg: string }[] => [
  { kicker: '01 · Scan', title: 'Track your receipts automatically', body: 'Take a photo and let AI pull out the merchant, totals and tax for you.', chip: 'Countdown · $87.45', icon: ScanLine, bg: colors.accent2Ramp[300], c1: colors.accent2Ramp[400], c2: colors.accentRamp[300], fg: colors.accent2Ramp[800] },
  { kicker: '02 · Private', title: "Your receipt photo isn't stored", body: 'We process the photo to extract the information, then discard the image.', chip: 'Photo discarded', icon: ShieldCheck, bg: colors.accentRamp[200], c1: colors.accentRamp[300], c2: colors.accent2Ramp[300], fg: colors.accentRamp[700] },
  { kicker: '03 · Organised', title: 'Everything in one place', body: 'Search, analyse and export to CSV, Excel, PDF or Google Sheets — on phone and web.', chip: 'Synced across devices', icon: BarChart3, bg: colors.neutral[200], c1: colors.accent2Ramp[200], c2: colors.accentRamp[400], fg: colors.text },
]
const SEEN_KEY = 'taxsteps.onboarded.v1'

export default function Onboarding() {
  const router = useRouter()
  const [i, setI] = useState(0)
  const [seen, setSeen] = useState<boolean | null>(null)
  useEffect(() => { void AsyncStorage.getItem(SEEN_KEY).then((v) => setSeen(v === '1')).catch(() => setSeen(false)) }, [])
  if (seen === null) return null
  if (seen) return <Redirect href="/sign-in" />
  const SLIDES = slides()
  const s = SLIDES[i]!
  const last = i === SLIDES.length - 1
  const finish = (to: '/sign-in' | '/sign-up') => { void AsyncStorage.setItem(SEEN_KEY, '1'); router.replace(to) }
  const Icon = s.icon

  return (
    <Screen scroll={false} style={{ padding: 18, gap: 22 }}>
      <View style={{ flex: 1, borderRadius: 40, backgroundColor: s.bg, overflow: 'hidden' }}>
        <View style={{ position: 'absolute', width: 320, height: 320, borderRadius: 160, right: -110, top: -80, backgroundColor: s.c1 }} />
        <View style={{ position: 'absolute', width: 190, height: 190, borderRadius: 95, left: -50, bottom: -40, backgroundColor: s.c2 }} />
        <View style={{ position: 'absolute', left: 18, top: 18, paddingHorizontal: 10, paddingVertical: 3, borderRadius: 12, backgroundColor: colors.bg }}>
          <T weight="bold" size={11}>{s.kicker}</T>
        </View>
        <View style={[{ position: 'absolute', alignSelf: 'center', top: '35%', width: 156, height: 156, borderRadius: 78, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center' }, shadow.lg]}>
          <Icon size={62} color={s.fg} strokeWidth={2.75} />
        </View>
        <View style={[{ position: 'absolute', right: 16, bottom: 18, flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 9, paddingHorizontal: 14, borderRadius: 999, backgroundColor: colors.text }, shadow.md]}>
          <Sparkles size={16} color={colors.bg} strokeWidth={2.75} />
          <T weight="bold" size={13} color={colors.bg}>{s.chip}</T>
        </View>
      </View>
      <View style={{ gap: 10, paddingHorizontal: 4 }}>
        <View style={{ flexDirection: 'row', gap: 6 }} accessibilityLabel={`Step ${i + 1} of ${SLIDES.length}`}>
          {SLIDES.map((_, k) => <View key={k} style={{ height: 8, width: k === i ? 26 : 8, borderRadius: 999, backgroundColor: k === i ? colors.accent : colors.neutral[300] }} />)}
        </View>
        <H size={34}>{s.title}</H>
        <Muted size={15}>{s.body}</Muted>
      </View>
      {last ? (
        <View style={{ gap: 8 }}>
          <Button label="Create account" onPress={() => finish('/sign-up')} />
          <Button label="I already have an account" variant="secondary" onPress={() => finish('/sign-in')} />
        </View>
      ) : (
        <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
          <Button label="Skip" variant="ghost" onPress={() => finish('/sign-in')} style={{ paddingHorizontal: 12 }} />
          <Button label="Continue" icon={ArrowRight} onPress={() => setI(i + 1)} style={{ flex: 1 }} />
        </View>
      )}
    </Screen>
  )
}
