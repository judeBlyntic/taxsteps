import { useMemo, useState } from 'react'
import { ActivityIndicator, FlatList, Pressable, ScrollView, TextInput, View } from 'react-native'
import { useRouter } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { CloudOff, Plus, Search } from 'lucide-react-native'
import { financialYearRange, formatMoney, lastNMonths, monthRange, toCents, type DocumentFilter } from '@taxsteps/core'
import { useCategories, useDocuments } from '@taxsteps/data'
import { DocumentRow } from '@/components/DocumentRow'
import { Banner, Button, Chip, H, Muted, T } from '@/components/ui'
import { colors, fonts } from '@/lib/theme'
import { useOfflineQueue } from '@/lib/use-offline-queue'
import { useToday } from '@/lib/use-today'

type Quick = 'all' | 'business' | 'personal' | 'review' | 'month' | 'fy'

export default function DocumentsScreen() {
  const router = useRouter()
  const insets = useSafeAreaInsets()
  const { today, locale, fy } = useToday()
  const { data: categories } = useCategories()
  const { pending, isOnline, retry, discard } = useOfflineQueue()
  const [quick, setQuick] = useState<Quick>('all')
  const [search, setSearch] = useState('')
  const [submitted, setSubmitted] = useState('')
  const [categoryId, setCategoryId] = useState<string | null>(null)

  const filter = useMemo<DocumentFilter>(() => {
    const cur = lastNMonths(today, 1)[0]!
    const f: DocumentFilter = {
      ...(quick === 'business' || quick === 'personal' ? { expenseType: quick } : {}),
      ...(quick === 'review' ? { status: 'needs_review' as const } : {}),
      ...(quick === 'month' ? monthRange(cur.year, cur.month) : {}),
      ...(quick === 'fy' ? financialYearRange(today, fy.fyStartMonth, fy.fyStartDay) : {}),
      ...(submitted ? { search: submitted } : {}),
      ...(categoryId ? { categoryIds: [categoryId] } : {}),
    }
    return f
  }, [quick, submitted, categoryId, today, fy.fyStartMonth, fy.fyStartDay])

  const docs = useDocuments(filter)
  const rows = docs.data?.pages.flatMap((p) => p.rows) ?? []
  const catMap = useMemo(() => new Map((categories ?? []).map((c) => [c.id, c])), [categories])
  const sums = new Map<string, number>()
  for (const r of rows) sums.set(r.currency, (sums.get(r.currency) ?? 0) + toCents(r.amount))

  const header = (
    <View style={{ gap: 14, paddingBottom: 6 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 4 }}>
        <H>Documents</H>
        <Pressable accessibilityRole="button" accessibilityLabel="Add manually" onPress={() => router.push('/review')}
          style={{ width: 46, height: 46, borderRadius: 23, borderWidth: 1, borderColor: colors.divider, alignItems: 'center', justifyContent: 'center' }}>
          <Plus size={20} color={colors.text} strokeWidth={2.75} />
        </Pressable>
      </View>
      {!isOnline && <Banner icon={CloudOff}>You&apos;re offline. New expenses are saved on this phone and sync when you reconnect.</Banner>}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, height: 50, paddingHorizontal: 18, borderRadius: 999, backgroundColor: colors.surface }}>
        <Search size={18} color={colors.neutral[700]} strokeWidth={2.75} />
        <TextInput value={search} onChangeText={setSearch} onSubmitEditing={() => setSubmitted(search.trim())} returnKeyType="search"
          placeholder="Merchant, title, invoice #" placeholderTextColor={colors.neutral[500]} accessibilityLabel="Search documents"
          style={{ flex: 1, fontFamily: fonts.body, fontSize: 15, color: colors.text }} />
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
        {([['all', 'All'], ['business', 'Business'], ['personal', 'Personal'], ['review', 'Needs review'], ['month', 'This month'], ['fy', 'This FY']] as const).map(([k, l]) => (
          <Chip key={k} label={l} selected={quick === k} onPress={() => setQuick(k)} />
        ))}
      </ScrollView>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
        <Chip label="All categories" selected={categoryId === null} onPress={() => setCategoryId(null)} />
        {(categories ?? []).filter((c) => !c.archived).map((c) => (
          <Chip key={c.id} label={c.name} selected={categoryId === c.id} onPress={() => setCategoryId(c.id)} />
        ))}
      </ScrollView>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 4 }}>
        <Muted>{rows.length}{docs.hasNextPage ? '+' : ''} documents</Muted>
        <Muted>{[...sums].map(([c, v]) => formatMoney(v, c, locale)).join(' · ')}</Muted>
      </View>
      {pending.map((p) => (
        <View key={p.input.id} style={{ gap: 6 }}>
          <DocumentRow row={{ ...p.input, user_id: '', created_at: p.queuedAt, updated_at: p.queuedAt }} category={p.input.category_id ? catMap.get(p.input.category_id) : undefined}
            locale={locale} today={today} badge={p.lastError ? "Couldn't sync" : 'Pending sync'} onPress={() => void retry()} />
          {p.lastError && (
            <View style={{ flexDirection: 'row', gap: 8, paddingHorizontal: 10 }}>
              <Button label="Retry" size="md" variant="secondary" onPress={() => void retry()} />
              <Button label="Discard" size="md" variant="danger" onPress={() => void discard(p.input.id)} />
            </View>
          )}
        </View>
      ))}
      {docs.isError && <Banner>We couldn&apos;t load your documents. Pull to refresh.</Banner>}
    </View>
  )

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg, paddingTop: insets.top }}>
      <FlatList
        data={rows}
        keyExtractor={(r) => r.id}
        ListHeaderComponent={header}
        contentContainerStyle={{ padding: 14, paddingBottom: 40 }}
        renderItem={({ item }) => (
          <DocumentRow row={item} category={item.category_id ? catMap.get(item.category_id) : undefined} locale={locale} today={today}
            onPress={() => router.push(`/review?id=${item.id}`)} />
        )}
        ListEmptyComponent={docs.isLoading ? <ActivityIndicator color={colors.accent} /> : (
          <T style={{ textAlign: 'center', padding: 30 }} color={colors.neutral[700]}>
            {Object.keys(filter).length ? 'No documents match. Try another search.' : 'No documents yet — tap Scan to add your first receipt.'}
          </T>
        )}
        onEndReached={() => { if (docs.hasNextPage && !docs.isFetchingNextPage) void docs.fetchNextPage() }}
        onEndReachedThreshold={0.4}
        refreshing={docs.isRefetching}
        onRefresh={() => { void docs.refetch(); void retry() }}
        ListFooterComponent={docs.isFetchingNextPage ? <ActivityIndicator color={colors.accent} /> : null}
      />
    </View>
  )
}
