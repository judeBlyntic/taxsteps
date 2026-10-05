import { useEffect, useMemo, useState } from 'react'
import { Alert, Platform, Pressable, View } from 'react-native'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { randomUUID } from 'expo-crypto'
import { AlertTriangle, ChevronLeft, RefreshCw, ShieldCheck } from 'lucide-react-native'
import {
  ERROR_MESSAGES, draftFromRow, draftToInput, emptyDraft, formatDate, regionFor, toUserMessage, type Draft, type DraftContext,
  type FieldKey,
} from '@taxsteps/core'
import { getDocument, useCategories, useClient, useDeleteDocument } from '@taxsteps/data'
import { DocumentForm } from '@/components/DocumentForm'
import { useToast } from '@/components/Toast'
import { Banner, Button, H, Screen, Segmented, T } from '@/components/ui'
import { takePendingDraft } from '@/lib/draft-store'
import { colors } from '@/lib/theme'
import { useOfflineQueue } from '@/lib/use-offline-queue'
import { useToday } from '@/lib/use-today'

export default function ReviewScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>()
  const router = useRouter()
  const client = useClient()
  const toast = useToast()
  const { saveOrQueue } = useOfflineQueue()
  const remove = useDeleteDocument()
  const { today, profile, locale } = useToday()
  const { data: categories } = useCategories()
  const [draft, setDraft] = useState<Draft | null>(null)
  const [errors, setErrors] = useState<Partial<Record<FieldKey, string>>>({})
  const [saveError, setSaveError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [loadError, setLoadError] = useState(false)

  const ctx = useMemo<DraftContext | null>(() => profile && categories
    ? { profile, categories, today, newId: () => randomUUID() } : null, [profile, categories, today])
  const isEdit = Boolean(id)

  useEffect(() => {
    if (!ctx || draft) return
    if (id) {
      void getDocument(client, id).then((row) => (row ? setDraft(draftFromRow(row, ctx)) : setLoadError(true))).catch(() => setLoadError(true))
    } else {
      setDraft(takePendingDraft() ?? emptyDraft(ctx)) // the draft id is created once → saving twice is idempotent
    }
  }, [ctx, id, client, draft])

  if (loadError) return <Screen><Banner>We couldn&apos;t load this document.</Banner><Button label="Back" variant="secondary" onPress={() => router.back()} /></Screen>
  if (!ctx || !draft) return <Screen><T>Loading…</T></Screen>

  const region = regionFor(ctx.profile.country)
  const fromScan = !isEdit && draft.source !== 'manual'

  function change(key: FieldKey, value: string) {
    setDraft((d) => d && ({ ...d, values: { ...d.values, [key]: value }, flags: d.flags.filter((f) => f !== key), warnings: d.warnings.filter((w) => w.field !== key) }))
    setErrors((e) => ({ ...e, [key]: undefined }))
  }

  async function save() {
    if (!draft || !ctx) return
    setSaveError(null)
    const result = draftToInput(draft, ctx)
    if (!result.ok) return setErrors(result.errors)
    setSaving(true)
    try {
      const outcome = await saveOrQueue(result.input)
      toast.show(outcome === 'queued' ? 'Saved on this phone · will sync when online'
        : isEdit ? 'Changes synced to all devices' : fromScan ? 'Expense saved · photo discarded' : 'Expense saved')
      if (isEdit) router.back()
      else router.replace('/')
    } catch (e) {
      const msg = toUserMessage(e)
      setSaveError(msg === ERROR_MESSAGES.INTERNAL ? ERROR_MESSAGES.SAVE_FAILED : msg)
    } finally {
      setSaving(false)
    }
  }

  function confirmDelete() {
    const doDelete = async () => {
      try {
        await remove.mutateAsync(id!)
        toast.show('Document deleted everywhere')
        router.back()
      } catch (e) {
        toast.show(toUserMessage(e), 'error')
      }
    }
    if (Platform.OS === 'web') { void doDelete(); return }
    Alert.alert('Delete this document?', "It will be removed from every device. This can't be undone.", [
      { text: 'Keep it', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => void doDelete() },
    ])
  }

  return (
    <Screen style={{ gap: 14 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <Pressable accessibilityRole="button" accessibilityLabel="Back" onPress={() => router.back()}
          style={{ width: 44, height: 44, borderRadius: 22, borderWidth: 1, borderColor: colors.divider, alignItems: 'center', justifyContent: 'center' }}>
          <ChevronLeft size={20} color={colors.text} strokeWidth={2.75} />
        </Pressable>
        <View style={{ flexDirection: 'row', gap: 5, alignItems: 'center', paddingVertical: 4, paddingHorizontal: 10, borderRadius: 12, backgroundColor: colors.accent2Ramp[100] }}>
          {isEdit ? <RefreshCw size={13} color={colors.accent2Ramp[800]} strokeWidth={2.75} /> : <ShieldCheck size={13} color={colors.accent2Ramp[800]} strokeWidth={2.75} />}
          <T weight="bold" size={11} color={colors.accent2Ramp[800]}>{isEdit ? 'Synced' : fromScan ? 'Photo discarded' : 'Manual entry'}</T>
        </View>
      </View>
      <H size={32}>{isEdit ? draft.values.merchant_name || 'Document' : fromScan ? 'Review your information' : 'New expense'}</H>
      {draft.flags.length > 0 && <Banner icon={AlertTriangle}>We found most of the receipt. Please check the highlighted fields.</Banner>}
      <DocumentForm draft={draft} errors={errors} categories={ctx.categories} region={region} onChange={change} datePlaceholder={formatDate(today, locale)} />
      <Segmented value={draft.expense_type} onChange={(v) => setDraft({ ...draft, expense_type: v })}
        options={[{ value: 'business', label: 'Business' }, { value: 'personal', label: 'Personal' }]} />
      <View style={{ gap: 6 }}>
        <T weight="semibold" size={13}>Status</T>
        <Segmented value={draft.statusOverride ?? 'auto'} onChange={(v) => setDraft({ ...draft, statusOverride: v === 'auto' ? null : v })}
          options={[{ value: 'auto', label: 'Auto' }, { value: 'complete', label: 'Complete' }, { value: 'needs_review', label: 'Review' }]} />
      </View>
      {saveError && <Banner icon={AlertTriangle}>{saveError}</Banner>}
      <Button label={saving ? 'Saving…' : isEdit ? 'Save changes' : 'Save expense'} onPress={() => void save()} loading={saving} />
      {isEdit
        ? <Button label="Delete document" variant="danger" onPress={confirmDelete} loading={remove.isPending} />
        : <Button label={fromScan ? 'Scan again' : 'Cancel'} variant="secondary" onPress={() => (fromScan ? router.replace('/scan') : router.back())} />}
    </Screen>
  )
}
