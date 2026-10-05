import {
  Briefcase, Building, Car, Coffee, Fuel, GraduationCap, Handshake, HeartPulse, Home, Lightbulb, Megaphone, Monitor, Package,
  Plane, Receipt, ShieldCheck, ShoppingCart, Smartphone, Tag, Truck, Utensils, Wifi, Wrench, type LucideIcon, type LucideProps,
} from 'lucide-react'

/** Icons a category can use (names match DEFAULT_CATEGORIES in @taxsteps/core). */
export const CATEGORY_ICONS: Record<string, LucideIcon> = {
  megaphone: Megaphone, car: Car, fuel: Fuel, plane: Plane, briefcase: Briefcase, wrench: Wrench, monitor: Monitor,
  smartphone: Smartphone, wifi: Wifi, handshake: Handshake, 'shield-check': ShieldCheck, building: Building,
  utensils: Utensils, tag: Tag, cart: ShoppingCart, receipt: Receipt, home: Home, coffee: Coffee, truck: Truck,
  package: Package, lightbulb: Lightbulb, 'graduation-cap': GraduationCap, 'heart-pulse': HeartPulse,
}

export const CATEGORY_COLORS = [
  'accent-2-300', 'accent-300', 'neutral-300', 'accent-200', 'accent-2-200', 'neutral-200', 'accent-100', 'accent-2-400', 'accent-400',
]

/** Background/foreground pair for a category colour token (e.g. "accent-2-300"). */
export function categoryColors(color: string | null | undefined): { background: string; color: string } {
  const token = color && CATEGORY_COLORS.includes(color) ? color : 'neutral-200'
  const ramp = token.replace(/-\d00$/, '')
  return { background: `var(--color-${token})`, color: `var(--color-${ramp}-900)` }
}

export function CategoryIcon({ icon, ...props }: { icon: string | null | undefined } & LucideProps) {
  const Icon = (icon && CATEGORY_ICONS[icon]) || Tag
  return <Icon strokeWidth={2.75} aria-hidden {...props} />
}

/** Default stroke for every Lucide icon in the app (design system: 2.75). */
export const ICON = { strokeWidth: 2.75, 'aria-hidden': true } as const
