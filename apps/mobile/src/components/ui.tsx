// Organic design-system primitives for React Native.
import { forwardRef, type ReactNode } from 'react'
import {
  ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View, type StyleProp, type TextInputProps,
  type TextProps, type TextStyle, type ViewStyle,
} from 'react-native'
import { SafeAreaView, type Edge } from 'react-native-safe-area-context'
import type { LucideIcon } from 'lucide-react-native'
import { colors, fonts, radius, shadow } from '@/lib/theme'

export function T({ style, weight = 'body', size = 15, color = colors.text, ...props }: TextProps & {
  weight?: 'body' | 'semibold' | 'bold'; size?: number; color?: string
}) {
  return <Text {...props} style={[{ fontFamily: fonts[weight], fontSize: size, color, lineHeight: Math.round(size * 1.4) }, style]} />
}

export function H({ style, size = 34, color = colors.text, ...props }: TextProps & { size?: number; color?: string }) {
  return <Text accessibilityRole="header" {...props} style={[{ fontFamily: fonts.heading, fontSize: size, color, lineHeight: Math.round(size * 1.08) }, style]} />
}

export const Muted = (p: TextProps & { size?: number }) => <T color={colors.neutral[700]} size={p.size ?? 13} {...p} />

export function Screen({ children, scroll = true, edges = ['top'], style, background = colors.bg }: {
  children: ReactNode; scroll?: boolean; edges?: Edge[]; style?: StyleProp<ViewStyle>; background?: string
}) {
  return (
    <SafeAreaView edges={edges} style={{ flex: 1, backgroundColor: background }}>
      {scroll
        ? <ScrollView contentContainerStyle={[{ padding: 18, paddingBottom: 120, gap: 16 }, style]} keyboardShouldPersistTaps="handled">{children}</ScrollView>
        : <View style={[{ flex: 1 }, style]}>{children}</View>}
    </SafeAreaView>
  )
}

type ButtonProps = {
  label: string
  onPress?: () => void
  variant?: 'primary' | 'dark' | 'secondary' | 'ghost' | 'danger'
  size?: 'md' | 'lg'
  icon?: LucideIcon
  disabled?: boolean
  loading?: boolean
  style?: StyleProp<ViewStyle>
  accessibilityLabel?: string
}

// Theme colours are read at render time (they change when the user switches theme), so no module-level copies.
const btnColors = (): Record<NonNullable<ButtonProps['variant']>, { bg: string; fg: string; border?: string }> => ({
  primary: { bg: colors.accent, fg: colors.bg },
  dark: { bg: colors.text, fg: colors.bg },
  secondary: { bg: 'transparent', fg: colors.text, border: colors.divider },
  ghost: { bg: 'transparent', fg: colors.accentRamp[700] },
  danger: { bg: 'transparent', fg: colors.accentRamp[700], border: colors.divider },
})

export function Button({ label, onPress, variant = 'primary', size = 'lg', icon: Icon, disabled, loading, style, accessibilityLabel }: ButtonProps) {
  const v = btnColors()[variant]
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={accessibilityLabel ?? label} accessibilityState={{ disabled: disabled || loading }}
      disabled={disabled || loading} onPress={onPress}
      style={({ pressed }) => [styles.btn, {
        height: size === 'lg' ? 54 : 44, backgroundColor: pressed && variant === 'primary' ? colors.accentRamp[600] : v.bg,
        borderColor: v.border ?? 'transparent', opacity: disabled ? 0.45 : pressed ? 0.85 : 1,
      }, style]}>
      {loading ? <ActivityIndicator color={v.fg} /> : Icon ? <Icon size={18} color={v.fg} strokeWidth={2.75} /> : null}
      <T weight="bold" size={size === 'lg' ? 16 : 14} color={v.fg}>{label}</T>
    </Pressable>
  )
}

export const TextField = forwardRef<TextInput, TextInputProps & { label: string; error?: string | null; flagged?: boolean; note?: string }>(
  function TextField({ label, error, flagged, note, style, ...input }, ref) {
    return (
      <View style={{ gap: 6 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
          <T weight="semibold" size={13}>{label}</T>
          {flagged ? <T weight="bold" size={12} color={colors.accentRamp[700]}>Review</T> : note ? <Muted size={12}>{note}</Muted> : null}
        </View>
        <TextInput ref={ref} placeholderTextColor={colors.neutral[500]} accessibilityLabel={label} {...input}
          style={[styles.input, { borderColor: colors.divider, backgroundColor: colors.surface, fontFamily: fonts.semibold, color: colors.text },
            flagged && { backgroundColor: colors.accentRamp[100], borderColor: colors.accentRamp[400] }, error ? { borderColor: colors.accentRamp[600] } : null, style as StyleProp<TextStyle>]} />
        {error ? <T size={12} weight="semibold" color={colors.accentRamp[700]}>{error}</T> : null}
      </View>
    )
  })

export function Card({ children, style, tone = 'paper' }: { children: ReactNode; style?: StyleProp<ViewStyle>; tone?: 'paper' | 'sage' | 'terra' | 'surface' | 'light' }) {
  const bg = { paper: colors.bg, sage: colors.accent2Ramp[300], terra: colors.accentRamp[200], surface: colors.surface, light: colors.neutral[100] }[tone]
  return <View style={[{ backgroundColor: bg, borderRadius: 30, padding: 18, overflow: 'hidden' }, style]}>{children}</View>
}

export function Chip({ label, selected, onPress }: { label: string; selected?: boolean; onPress?: () => void }) {
  return (
    <Pressable accessibilityRole="button" accessibilityState={{ selected }} onPress={onPress}
      style={[styles.chip, { borderColor: colors.divider }, selected ? { backgroundColor: colors.selected, borderColor: colors.selected } : null]}>
      <T weight="bold" size={13} color={selected ? colors.bg : colors.text}>{label}</T>
    </Pressable>
  )
}

export function Segmented<V extends string>({ options, value, onChange }: { options: { value: V; label: string }[]; value: V; onChange: (v: V) => void }) {
  return (
    <View style={[styles.seg, { backgroundColor: colors.surface }]} accessibilityRole="tablist">
      {options.map((o) => {
        const on = o.value === value
        return (
          <Pressable key={o.value} accessibilityRole="tab" accessibilityState={{ selected: on }} onPress={() => onChange(o.value)}
            style={[styles.segOpt, on ? [{ backgroundColor: colors.bg }, shadow.sm] : null]}>
            <T weight="bold" size={14} color={on ? colors.text : colors.neutral[700]}>{o.label}</T>
          </Pressable>
        )
      })}
    </View>
  )
}

export function Banner({ children, tone = 'warn', icon: Icon }: { children: ReactNode; tone?: 'warn' | 'ok'; icon?: LucideIcon }) {
  const c = tone === 'warn' ? { bg: colors.accentRamp[100], fg: colors.accentRamp[800] } : { bg: colors.accent2Ramp[100], fg: colors.accent2Ramp[800] }
  return (
    <View style={{ flexDirection: 'row', gap: 10, padding: 14, borderRadius: 22, backgroundColor: c.bg }} accessibilityRole="alert">
      {Icon ? <Icon size={18} color={c.fg} strokeWidth={2.75} /> : null}
      <T size={13.5} color={c.fg} style={{ flex: 1 }}>{children}</T>
    </View>
  )
}

const styles = StyleSheet.create({
  btn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingHorizontal: 22, borderRadius: radius.pill, borderWidth: 1 },
  input: { minHeight: 48, paddingHorizontal: 16, borderRadius: radius.pill, borderWidth: 1, fontSize: 15 },
  chip: { height: 38, paddingHorizontal: 16, borderRadius: radius.pill, borderWidth: 1, justifyContent: 'center' },
  seg: { flexDirection: 'row', padding: 4, borderRadius: radius.pill },
  segOpt: { flex: 1, height: 40, borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center' },
})
