import { Pressable, View } from 'react-native'
import {
  Briefcase, Building, Car, Coffee, Fuel, Handshake, Home, Megaphone, Monitor, Plane, Receipt, ShieldCheck, ShoppingCart, Smartphone,
  Tag, Truck, Utensils, Wifi, Wrench, type LucideIcon,
} from 'lucide-react-native'
import { formatMoney, formatShortDate, toCents, type Category, type DocumentRow as Row } from '@taxsteps/core'
import { categoryColors, colors } from '@/lib/theme'
import { Muted, T } from './ui'

const ICONS: Record<string, LucideIcon> = {
  megaphone: Megaphone, car: Car, fuel: Fuel, plane: Plane, briefcase: Briefcase, wrench: Wrench, monitor: Monitor, smartphone: Smartphone,
  wifi: Wifi, handshake: Handshake, 'shield-check': ShieldCheck, building: Building, utensils: Utensils, tag: Tag, cart: ShoppingCart,
  receipt: Receipt, home: Home, coffee: Coffee, truck: Truck,
}

export function CategoryDot({ category, size = 46 }: { category?: Category; size?: number }) {
  const c = categoryColors(category?.color)
  const Icon = ICONS[category?.icon ?? 'receipt'] ?? Tag
  return (
    <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: c.bg, alignItems: 'center', justifyContent: 'center' }}>
      <Icon size={20} color={c.fg} strokeWidth={2.75} />
    </View>
  )
}

export function DocumentRow({ row, category, locale, today, onPress, badge }: {
  row: Row; category?: Category; locale: string; today: string; onPress: () => void; badge?: string
}) {
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={`${row.merchant_name}, ${formatMoney(toCents(row.amount), row.currency, locale)}`} onPress={onPress}
      style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 10, borderRadius: 24, backgroundColor: pressed ? colors.surface : 'transparent' })}>
      <CategoryDot category={category} />
      <View style={{ flex: 1, minWidth: 0 }}>
        <T weight="bold" numberOfLines={1}>{row.merchant_name}</T>
        <Muted numberOfLines={1}>{category?.name ?? 'Uncategorised'} · {formatShortDate(row.transaction_date, locale, today)}</Muted>
      </View>
      <View style={{ alignItems: 'flex-end' }}>
        <T weight="bold" style={{ fontVariant: ['tabular-nums'] }}>{formatMoney(toCents(row.amount), row.currency, locale)}</T>
        <Muted size={11.5}>{badge ?? (row.status === 'needs_review' ? 'Needs review' : row.expense_type === 'business' ? 'Business' : 'Personal')}</Muted>
      </View>
    </Pressable>
  )
}
