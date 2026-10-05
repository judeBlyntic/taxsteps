import { useState } from 'react'
import { Pressable, View } from 'react-native'
import { useRouter, type Href } from 'expo-router'
import { useQueryClient } from '@tanstack/react-query'
import { Building, ChevronRight, Globe2, LogOut, Sheet, ShieldCheck, Tag, type LucideIcon } from 'lucide-react-native'
import { COPY, THEME_OPTIONS, regionFor, toUserMessage, type ThemeName } from '@taxsteps/core'
import { deleteAccount, deleteAllDocuments, exportDocuments, invalidateDocuments, useClient, useProfile, useUpdateProfile } from '@taxsteps/data'
import { ConfirmDelete } from '@/components/ConfirmDelete'
import { useToast } from '@/components/Toast'
import { Button, H, Muted, Screen, T } from '@/components/ui'
import { useSession } from '@/lib/session'
import { shareExport } from '@/lib/share'
import { colors } from '@/lib/theme'
import { useOfflineQueue } from '@/lib/use-offline-queue'

function Row({ icon: Icon, label, value, href, tint }: { icon: LucideIcon; label: string; value?: string; href: Href; tint: [string, string] }) {
  const router = useRouter()
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={() => router.push(href)}
      style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, borderRadius: 22, backgroundColor: pressed ? colors.surface : 'transparent' })}>
      <View style={{ width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center', backgroundColor: tint[0] }}>
        <Icon size={17} color={tint[1]} strokeWidth={2.75} />
      </View>
      <T weight="semibold" style={{ flex: 1 }}>{label}</T>
      {value ? <Muted>{value}</Muted> : null}
      <ChevronRight size={16} color={colors.neutral[500]} strokeWidth={2.75} />
    </Pressable>
  )
}

function Appearance({ current }: { current: ThemeName | undefined }) {
  const update = useUpdateProfile()
  const toast = useToast()
  const shown = update.isPending ? update.variables.theme : current

  async function choose(theme: ThemeName) {
    if (theme === current) return
    try {
      await update.mutateAsync({ theme }) // the root layout applies the saved theme here and on the user's other devices
    } catch (e) {
      toast.show(toUserMessage(e), 'error')
    }
  }

  return (
    <View style={{ gap: 10, padding: 14, borderRadius: 30, backgroundColor: colors.neutral[100] }}>
      <T weight="bold">Appearance</T>
      <View style={{ flexDirection: 'row', gap: 10 }}>
        {THEME_OPTIONS.map((t) => {
          const on = shown === t.value
          return (
            <Pressable key={t.value} accessibilityRole="button" accessibilityLabel={`${t.label} theme`} accessibilityState={{ selected: on }}
              onPress={() => void choose(t.value)}
              style={{ flex: 1, gap: 8, padding: 14, borderRadius: 22, borderWidth: 2, borderColor: on ? colors.selected : colors.divider }}>
              <View style={{ flexDirection: 'row', gap: 4 }}>
                {t.swatch.map((c) => <View key={c} style={{ width: 18, height: 18, borderRadius: 9, backgroundColor: c, borderWidth: 1, borderColor: colors.divider }} />)}
              </View>
              <T weight="semibold">{t.label}</T>
              <Muted size={12}>{t.note}</Muted>
            </Pressable>
          )
        })}
      </View>
    </View>
  )
}

export default function SettingsScreen() {
  const client = useClient()
  const qc = useQueryClient()
  const toast = useToast()
  const { session } = useSession()
  const { data: profile } = useProfile()
  const { clear } = useOfflineQueue()
  const [confirm, setConfirm] = useState<'documents' | 'account' | null>(null)
  const [busy, setBusy] = useState(false)
  const region = regionFor(profile?.country)

  async function exportAll() {
    try {
      await shareExport(await exportDocuments(client, { format: 'xlsx', filter: {}, label: 'All data' }))
    } catch (e) {
      toast.show(toUserMessage(e), 'error')
    }
  }

  async function doDelete() {
    setBusy(true)
    try {
      if (confirm === 'documents') {
        const n = await deleteAllDocuments(client)
        invalidateDocuments(qc)
        toast.show(`${n} documents deleted`)
      } else {
        await deleteAccount(client)
        await clear()
        qc.clear()
        await client.auth.signOut()
      }
      setConfirm(null)
    } catch (e) {
      toast.show(toUserMessage(e), 'error')
    } finally {
      setBusy(false)
    }
  }

  return (
    <Screen style={{ gap: 16 }}>
      <H>Settings</H>
      <Pressable accessibilityRole="button" onPress={() => undefined}
        style={{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderRadius: 30, backgroundColor: colors.neutral[100] }}>
        <View style={{ width: 52, height: 52, borderRadius: 26, backgroundColor: colors.accentRamp[300], alignItems: 'center', justifyContent: 'center' }}>
          <H size={19} color={colors.accentRamp[900]}>{(profile?.full_name ?? 'TS').split(/\s+/).map((p) => p[0]).join('').slice(0, 2).toUpperCase()}</H>
        </View>
        <View style={{ flex: 1 }}>
          <T weight="bold">{profile?.full_name || 'Your account'}</T>
          <Muted>{session?.user.email}</Muted>
        </View>
      </Pressable>
      <View style={{ padding: 6, borderRadius: 30, backgroundColor: colors.neutral[100] }}>
        <Row icon={Building} label="Profile & business" value={profile?.business_name ?? undefined} href="/profile" tint={[colors.accent2Ramp[200], colors.accent2Ramp[800]]} />
        <Row icon={Globe2} label="Region & tax year" value={`${profile?.currency ?? ''} · ${region.taxLabel}`} href="/region" tint={[colors.neutral[200], colors.text]} />
        <Row icon={Tag} label="Categories" href="/categories" tint={[colors.accentRamp[200], colors.accentRamp[800]]} />
        <Row icon={Sheet} label="Google Sheets" href="/sheets" tint={[colors.accent2Ramp[200], colors.accent2Ramp[800]]} />
      </View>
      <Appearance current={profile?.theme} />
      <View style={{ gap: 10, padding: 18, borderRadius: 30, backgroundColor: colors.accent2Ramp[100] }}>
        <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
          <ShieldCheck size={18} color={colors.accent2Ramp[900]} strokeWidth={2.75} /><T weight="bold" color={colors.accent2Ramp[900]}>Privacy</T>
        </View>
        <T size={13.5} color={colors.accent2Ramp[900]}>{COPY.privacyPanel}</T>
        <T size={12.5} color={colors.accent2Ramp[900]}>{COPY.providerNote}</T>
        <Button label="Export all my data" variant="secondary" size="md" onPress={() => void exportAll()} />
        <Button label="Delete all documents" variant="danger" size="md" onPress={() => setConfirm('documents')} />
        <Button label="Delete account" variant="ghost" size="md" onPress={() => setConfirm('account')} />
      </View>
      <Muted size={12}>{COPY.disclaimer}</Muted>
      <Button label="Sign out" variant="secondary" icon={LogOut} onPress={() => { qc.clear(); void client.auth.signOut() }} />
      {confirm && (
        <ConfirmDelete busy={busy} onCancel={() => setConfirm(null)} onConfirm={() => void doDelete()}
          title={confirm === 'account' ? 'Delete your account?' : 'Delete all documents?'}
          body={confirm === 'account'
            ? 'Your account, profile, categories, documents and Google connection will be permanently deleted from every device.'
            : 'Every document will be permanently deleted from every device. Your account and categories stay.'} />
      )}
    </Screen>
  )
}
