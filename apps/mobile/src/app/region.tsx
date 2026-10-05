import { useState } from 'react'
import { Pressable, View } from 'react-native'
import { CURRENCIES, FALLBACK_REGION, ProfileUpdateSchema, TAX_REGIONS, regionFor, toUserMessage, type Profile } from '@taxsteps/core'
import { useProfile, useUpdateProfile } from '@taxsteps/data'
import { BackHeader } from '@/components/BackHeader'
import { PickerModal, type PickerOption } from '@/components/PickerModal'
import { useToast } from '@/components/Toast'
import { Button, Muted, Screen, T, TextField } from '@/components/ui'
import { colors } from '@/lib/theme'


const MONTHS = Array.from({ length: 12 }, (_, i) => ({ value: String(i + 1), label: new Intl.DateTimeFormat('en', { month: 'long', timeZone: 'UTC' }).format(new Date(Date.UTC(2026, i, 1))) }))
const COUNTRIES: PickerOption[] = [...Object.values(TAX_REGIONS).sort((a, b) => a.name.localeCompare(b.name)).map((r) => ({ value: r.country, label: r.name })), { value: FALLBACK_REGION.country, label: 'Other' }]

export default function RegionScreen() {
  const { data: profile } = useProfile()
  if (!profile) return <Screen><T>Loading…</T></Screen>
  return <RegionForm key={profile.updated_at} profile={profile} />
}

function SelectRow({ label, value, onPress }: { label: string; value: string; onPress: () => void }) {
  return (
    <View style={{ gap: 6 }}>
      <T weight="semibold" size={13}>{label}</T>
      <Pressable accessibilityRole="button" accessibilityLabel={`${label}: ${value}`} onPress={onPress}
        style={{ minHeight: 48, borderRadius: 999, borderWidth: 1, borderColor: colors.divider, backgroundColor: colors.surface, paddingHorizontal: 16, justifyContent: 'center' }}>
        <T weight="semibold">{value}</T>
      </Pressable>
    </View>
  )
}

function RegionForm({ profile }: { profile: Profile }) {
  const update = useUpdateProfile()
  const toast = useToast()
  const [form, setForm] = useState({
    country: profile.country ?? FALLBACK_REGION.country, currency: profile.currency, timezone: profile.timezone, locale: profile.locale,
    fy_start_month: profile.fy_start_month, fy_start_day: profile.fy_start_day,
  })
  const [picker, setPicker] = useState<'country' | 'currency' | 'month' | null>(null)
  const region = regionFor(form.country)

  const localeError = ProfileUpdateSchema.shape.locale.safeParse(form.locale).success ? null : 'Use a locale like en-NZ, en-US or de-DE'

  async function save() {
    if (localeError) return
    try {
      await update.mutateAsync({ ...form, country: form.country === FALLBACK_REGION.country ? null : form.country, fy_start_day: Math.min(31, Math.max(1, form.fy_start_day)) })
      toast.show('Region settings saved')
    } catch (e) {
      toast.show(toUserMessage(e), 'error')
    }
  }

  return (
    <Screen style={{ gap: 16 }}>
      <BackHeader title="Region & tax year" />
      <SelectRow label="Country" value={COUNTRIES.find((c) => c.value === form.country)?.label ?? form.country} onPress={() => setPicker('country')} />
      <SelectRow label="Currency" value={form.currency} onPress={() => setPicker('currency')} />
      <SelectRow label="Financial year starts" value={`${form.fy_start_day} ${MONTHS[form.fy_start_month - 1]!.label}`} onPress={() => setPicker('month')} />
      <TextField label="Start day" keyboardType="number-pad" value={String(form.fy_start_day)} onChangeText={(v) => setForm({ ...form, fy_start_day: Number(v.replace(/\D/g, '')) || 1 })} />
      <TextField label="Timezone" value={form.timezone} onChangeText={(v) => setForm({ ...form, timezone: v.trim() })} autoCapitalize="none"
        note={`This device: ${Intl.DateTimeFormat().resolvedOptions().timeZone}`} />
      <Button label="Use this device's timezone" variant="ghost" size="md" onPress={() => setForm({ ...form, timezone: Intl.DateTimeFormat().resolvedOptions().timeZone })} />
      <TextField label="Number & date format" value={form.locale} onChangeText={(v) => setForm({ ...form, locale: v.trim() })} autoCapitalize="none" note="e.g. en-NZ, en-US" error={localeError} />
      <Muted>Tax is labelled “{region.taxLabel}” for this country.</Muted>
      <Button label={update.isPending ? 'Saving…' : 'Save'} loading={update.isPending} onPress={() => void save()} />
      {picker === 'country' && (
        <PickerModal title="Country" options={COUNTRIES} value={form.country} onClose={() => setPicker(null)}
          onPick={(code) => {
            const r = regionFor(code)
            setForm((f) => code === FALLBACK_REGION.country ? { ...f, country: code } : { ...f, country: code, currency: r.currency, fy_start_month: r.fyStartMonth, fy_start_day: r.fyStartDay })
          }} />
      )}
      {picker === 'currency' && (
        <PickerModal title="Currency" options={[...new Set([form.currency, ...CURRENCIES])].map((c) => ({ value: c, label: c }))} value={form.currency}
          onClose={() => setPicker(null)} onPick={(c) => setForm((f) => ({ ...f, currency: c }))} />
      )}
      {picker === 'month' && (
        <PickerModal title="Financial year starts in" options={MONTHS} value={String(form.fy_start_month)}
          onClose={() => setPicker(null)} onPick={(m) => setForm((f) => ({ ...f, fy_start_month: Number(m) }))} />
      )}
    </Screen>
  )
}
