import { useMemo } from 'react'
import { Pressable, View } from 'react-native'
import { useRouter } from 'expo-router'
import { ArrowRight, CloudOff, ScanLine } from 'lucide-react-native'
import { formatMoney, formatMonth, lastNMonths, monthRange, otherCurrencies, totalsFor } from '@taxsteps/core'
import { useCategories, useDocuments, useSummary } from '@taxsteps/data'
import { DocumentRow } from '@/components/DocumentRow'
import { Banner, Button, Card, H, Muted, Screen, T } from '@/components/ui'
import { colors, shadow } from '@/lib/theme'
import { useOfflineQueue } from '@/lib/use-offline-queue'
import { useToday } from '@/lib/use-today'

function greeting(timeZone: string) {
  const h = Number(new Intl.DateTimeFormat('en-GB', { hour: 'numeric', hour12: false, timeZone }).format(new Date()))
  return h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening'
}

export default function HomeScreen() {
  const router = useRouter()
  const { today, profile, locale, currency, taxLabel } = useToday()
  const { isOnline, pending } = useOfflineQueue()
  const cur = lastNMonths(today, 1)[0]!
  const range = monthRange(cur.year, cur.month)
  const summary = useSummary(range)
  const recent = useDocuments({})
  const { data: categories } = useCategories()
  const catMap = useMemo(() => new Map((categories ?? []).map((c) => [c.id, c])), [categories])
  const s = summary.data
  const t = s ? totalsFor(s, currency) : undefined
  const biz = s?.byType.find((x) => x.expenseType === 'business' && x.currency === currency)?.totalCents ?? 0
  const pers = s?.byType.find((x) => x.expenseType === 'personal' && x.currency === currency)?.totalCents ?? 0
  const pct = (v: number) => (biz + pers > 0 ? Math.round((v / (biz + pers)) * 100) : 0)
  const name = profile?.full_name || 'there'
  const initials = (profile?.full_name ?? 'TS').split(/\s+/).map((p) => p[0]).join('').slice(0, 2).toUpperCase()
  const daysInMonth = Number(range.to.slice(8))
  const offset = (new Date(Date.UTC(cur.year, cur.month - 1, 1)).getUTCDay() + 6) % 7
  const byDay = new Map((s?.byDay ?? []).map((d) => [Number(d.date.slice(8)), d]))

  return (
    <Screen style={{ paddingHorizontal: 0, gap: 20 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 22 }}>
        <View style={{ width: 46, height: 46, borderRadius: 23, backgroundColor: colors.accentRamp[300], alignItems: 'center', justifyContent: 'center' }}>
          <H size={17} color={colors.accentRamp[900]}>{initials}</H>
        </View>
        <View style={{ flex: 1 }}>
          <Muted>{greeting(profile?.timezone ?? 'UTC')}</Muted>
          <T weight="bold" size={16}>{name}</T>
        </View>
      </View>
      <H size={34} style={{ paddingHorizontal: 22 }}>Every receipt,{'\n'}sorted.</H>
      {(!isOnline || pending.length > 0) && (
        <View style={{ paddingHorizontal: 18 }}>
          <Banner icon={CloudOff}>{isOnline ? `${pending.length} expense(s) waiting to sync…` : "You're offline — saves will sync when you reconnect."}</Banner>
        </View>
      )}

      <View style={{ marginHorizontal: 18, paddingTop: 16 }}>
        <View style={{ position: 'absolute', left: 22, right: 22, top: 0, height: 50, borderRadius: 28, backgroundColor: colors.accent2Ramp[400] }} />
        <View style={{ position: 'absolute', left: 11, right: 11, top: 8, height: 50, borderRadius: 30, backgroundColor: colors.accentRamp[300] }} />
        <View style={[{ borderRadius: 34, backgroundColor: colors.neutral[100], padding: 22, overflow: 'hidden', gap: 4 }, shadow.md]}>
          <View style={{ position: 'absolute', width: 190, height: 190, borderRadius: 95, right: -60, bottom: -70, backgroundColor: colors.accent2Ramp[200] }} />
          <View style={{ position: 'absolute', width: 56, height: 56, borderRadius: 28, right: 70, bottom: 60, backgroundColor: colors.accentRamp[300] }} />
          <T weight="bold" size={13} color={colors.neutral[700]}>{formatMonth(cur.year, cur.month, locale)}</T>
          <H size={44} style={{ marginTop: 6 }}>{t ? formatMoney(t.totalCents, currency, locale) : '—'}</H>
          <Muted size={14}>Total expenses{s && otherCurrencies(s, currency).length ? ` · + ${otherCurrencies(s, currency).map((o) => formatMoney(o.totalCents, o.currency, locale)).join(', ')}` : ''}</Muted>
          <View style={{ flexDirection: 'row', gap: 18, marginVertical: 12 }}>
            <View><T weight="bold" size={18}>{t?.count ?? 0}</T><Muted size={12}>Documents</Muted></View>
            <View><T weight="bold" size={18}>{formatMoney(t?.taxCents ?? 0, currency, locale)}</T><Muted size={12}>{taxLabel}</Muted></View>
            <View><T weight="bold" size={18}>{formatMoney(t?.averageCents ?? 0, currency, locale)}</T><Muted size={12}>Average</Muted></View>
          </View>
          <Button label="Scan receipt" variant="dark" icon={ScanLine} size="md" onPress={() => router.push('/scan')} style={{ alignSelf: 'flex-start' }} />
        </View>
      </View>

      <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 22 }}>
        <H size={20}>Overview</H><Muted>This month</Muted>
      </View>
      <View style={{ flexDirection: 'row', gap: 12, paddingHorizontal: 18 }}>
        {([['Business', biz, 'sage'], ['Personal', pers, 'terra']] as const).map(([label, v, tone]) => (
          <Card key={label} tone={tone} style={{ flex: 1, gap: 14 }}>
            <T weight="bold" color={tone === 'sage' ? colors.accent2Ramp[900] : colors.accentRamp[900]}>{label}</T>
            <H size={34} color={tone === 'sage' ? colors.accent2Ramp[900] : colors.accentRamp[900]}>{pct(v)}%</H>
            <T weight="semibold" size={12.5} color={tone === 'sage' ? colors.accent2Ramp[900] : colors.accentRamp[900]}>{formatMoney(v, currency, locale)}</T>
          </Card>
        ))}
      </View>

      <View style={{ paddingHorizontal: 22, gap: 10 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}><H size={20}>Receipt days</H></View>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
          {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((d, i) => <T key={`h${i}`} size={12} color={colors.neutral[700]} style={{ width: '12.4%', textAlign: 'center' }}>{d}</T>)}
          {Array.from({ length: offset }, (_, i) => <View key={`p${i}`} style={{ width: '12.4%' }} />)}
          {Array.from({ length: daysInMonth }, (_, i) => {
            const d = byDay.get(i + 1)
            const bg = d ? (d.business >= d.personal ? colors.accent2Ramp[400] : colors.accentRamp[400]) : colors.neutral[100]
            return (
              <View key={i} style={{ width: '12.4%', aspectRatio: 1, borderRadius: 999, alignItems: 'center', justifyContent: 'center', backgroundColor: bg, borderWidth: d ? 0 : 1, borderColor: colors.neutral[300] }}>
                <T weight="semibold" size={13}>{i + 1}</T>
              </View>
            )
          })}
        </View>
      </View>

      <View style={{ paddingHorizontal: 12, gap: 2 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 10 }}>
          <H size={20}>Recent</H>
          <Pressable accessibilityRole="button" onPress={() => router.push('/documents')} style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            <T weight="bold" color={colors.accentRamp[700]}>See all</T><ArrowRight size={14} color={colors.accentRamp[700]} strokeWidth={2.75} />
          </Pressable>
        </View>
        {(recent.data?.pages[0]?.rows ?? []).slice(0, 4).map((r) => (
          <DocumentRow key={r.id} row={r} category={r.category_id ? catMap.get(r.category_id) : undefined} locale={locale} today={today}
            onPress={() => router.push(`/review?id=${r.id}`)} />
        ))}
        {recent.data && recent.data.pages[0]?.rows.length === 0 && <Muted style={{ padding: 10 }}>No documents yet — tap Scan to add your first receipt.</Muted>}
      </View>
    </Screen>
  )
}
