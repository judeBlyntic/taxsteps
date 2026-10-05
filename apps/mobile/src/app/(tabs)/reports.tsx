import { useState } from 'react'
import { Pressable, View } from 'react-native'
import { ChevronLeft, ChevronRight } from 'lucide-react-native'
import { COPY, financialYearRange, formatMoney, periodLabel, resolvePeriod, type PeriodSpec } from '@taxsteps/core'
import { useSummary } from '@taxsteps/data'
import { ExportTiles } from '@/components/ExportTiles'
import { Banner, H, Muted, Screen, Segmented, T } from '@/components/ui'
import { colors } from '@/lib/theme'
import { useToday } from '@/lib/use-today'

type Kind = 'month' | 'year' | 'fy'
const BAR = [colors.accent2Ramp[500], colors.accentRamp[500], colors.accent2Ramp[400], colors.accentRamp[400], colors.neutral[500]]

export default function ReportsScreen() {
  const { today, locale, currency, taxLabel, fy } = useToday()
  const [kind, setKind] = useState<Kind>('month')
  const [offset, setOffset] = useState(0)
  const base = Number(today.slice(0, 4)) * 12 + Number(today.slice(5, 7)) - 1 + offset * (kind === 'month' ? 1 : 12)
  const y = Math.floor(base / 12)
  const m = (base % 12) + 1
  const spec: PeriodSpec = kind === 'month' ? { kind: 'month', year: y, month: m } : kind === 'year' ? { kind: 'year', year: y }
    : { kind: 'fy', date: financialYearRange(`${y}-${String(m).padStart(2, '0')}-01`, fy.fyStartMonth, fy.fyStartDay).from }
  const range = resolvePeriod(spec, fy)
  const label = periodLabel(spec, fy, locale)
  const summary = useSummary(range)
  const s = summary.data
  const primary = s?.currencies.find((c) => c.currency === currency) ?? s?.currencies[0]
  const cur = primary?.currency ?? currency
  const cats = (s?.byCategory ?? []).filter((c) => c.currency === cur).slice(0, 6)
  const max = Math.max(1, ...cats.map((c) => c.totalCents))

  return (
    <Screen style={{ gap: 16 }}>
      <H>Reports</H>
      <Segmented value={kind} onChange={(k) => { setKind(k); setOffset(0) }}
        options={[{ value: 'month', label: 'Month' }, { value: 'year', label: 'Year' }, { value: 'fy', label: 'Fin. year' }]} />
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <Pressable accessibilityRole="button" accessibilityLabel="Previous period" onPress={() => setOffset((o) => o - 1)} style={{ padding: 10 }}>
          <ChevronLeft size={22} color={colors.text} strokeWidth={2.75} />
        </Pressable>
        <T weight="bold">{label}</T>
        <Pressable accessibilityRole="button" accessibilityLabel="Next period" onPress={() => setOffset((o) => o + 1)} style={{ padding: 10 }}>
          <ChevronRight size={22} color={colors.text} strokeWidth={2.75} />
        </Pressable>
      </View>
      {summary.isError && <Banner>We couldn&apos;t load this report.</Banner>}
      <View style={{ borderRadius: 34, backgroundColor: colors.accent2Ramp[300], padding: 22, overflow: 'hidden' }}>
        <View style={{ position: 'absolute', width: 150, height: 150, borderRadius: 75, right: -40, top: -50, backgroundColor: colors.accent2Ramp[400] }} />
        <T weight="bold" size={13} color={colors.accent2Ramp[900]}>{range ? `${range.from} – ${range.to}` : label}</T>
        <H size={40} color={colors.accent2Ramp[900]} style={{ marginVertical: 8 }}>{formatMoney(primary?.totalCents ?? 0, cur, locale)}</H>
        <View style={{ flexDirection: 'row', gap: 22 }}>
          <View><T weight="bold" size={17} color={colors.accent2Ramp[900]}>{primary?.count ?? 0}</T><T size={13} color={colors.accent2Ramp[900]}>Documents</T></View>
          <View><T weight="bold" size={17} color={colors.accent2Ramp[900]}>{formatMoney(primary?.taxCents ?? 0, cur, locale)}</T><T size={13} color={colors.accent2Ramp[900]}>{taxLabel}</T></View>
        </View>
        {(s?.currencies.length ?? 0) > 1 && (
          <T size={12.5} color={colors.accent2Ramp[900]} style={{ marginTop: 8 }}>
            Also: {s!.currencies.filter((c) => c.currency !== cur).map((c) => formatMoney(c.totalCents, c.currency, locale)).join(' · ')}
          </T>
        )}
      </View>
      <H size={20}>By category</H>
      {cats.length === 0 && <Muted>No expenses in this period.</Muted>}
      {cats.map((c, k) => (
        <View key={`${c.categoryId}`} style={{ gap: 6 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <T weight="semibold">{c.name}</T><T>{formatMoney(c.totalCents, cur, locale)}</T>
          </View>
          <View style={{ height: 14, borderRadius: 999, backgroundColor: colors.neutral[200], overflow: 'hidden' }}>
            <View style={{ height: '100%', width: `${Math.round((c.totalCents / max) * 100)}%`, borderRadius: 999, backgroundColor: BAR[k % BAR.length] }} />
          </View>
        </View>
      ))}
      <H size={20} style={{ marginTop: 8 }}>Export</H>
      <ExportTiles filter={range ?? {}} label={label} />
      <Muted size={12}>{COPY.disclaimer}</Muted>
    </Screen>
  )
}
