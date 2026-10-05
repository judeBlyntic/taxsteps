import { useState } from 'react'
import { regionFor, toUserMessage } from '@taxsteps/core'
import { useProfile, useUpdateProfile } from '@taxsteps/data'
import { BackHeader } from '@/components/BackHeader'
import { useToast } from '@/components/Toast'
import { Button, Screen, T, TextField } from '@/components/ui'

export default function ProfileScreen() {
  const { data: profile } = useProfile()
  if (!profile) return <Screen><T>Loading…</T></Screen>
  return <ProfileForm key={profile.updated_at} profile={profile} />
}

function ProfileForm({ profile }: { profile: NonNullable<ReturnType<typeof useProfile>['data']> }) {
  const update = useUpdateProfile()
  const toast = useToast()
  const [form, setForm] = useState({ full_name: profile.full_name ?? '', business_name: profile.business_name ?? '', tax_number: profile.tax_number ?? '' })
  const save = async () => {
    try {
      await update.mutateAsync({ full_name: form.full_name.trim() || null, business_name: form.business_name.trim() || null, tax_number: form.tax_number.trim() || null })
      toast.show('Profile saved')
    } catch (e) {
      toast.show(toUserMessage(e), 'error')
    }
  }
  return (
    <Screen style={{ gap: 16 }}>
      <BackHeader title="Profile & business" />
      <TextField label="Name" value={form.full_name} onChangeText={(v) => setForm({ ...form, full_name: v })} maxLength={120} />
      <TextField label="Business name" value={form.business_name} onChangeText={(v) => setForm({ ...form, business_name: v })} maxLength={160} />
      <TextField label={`${regionFor(profile.country).taxLabel} number`} value={form.tax_number} onChangeText={(v) => setForm({ ...form, tax_number: v })} maxLength={40} />
      <Button label={update.isPending ? 'Saving…' : 'Save'} loading={update.isPending} onPress={() => void save()} />
    </Screen>
  )
}
