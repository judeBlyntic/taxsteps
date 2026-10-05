import { useState } from 'react'
import { ActivityIndicator, Pressable, View } from 'react-native'
import { useRouter } from 'expo-router'
import { FileSpreadsheet, FileText, Sheet, Table, type LucideIcon } from 'lucide-react-native'
import { toUserMessage, type DocumentFilter, type ExportFormat } from '@taxsteps/core'
import { exportDocuments, useClient } from '@taxsteps/data'
import { shareExport } from '@/lib/share'
import { colors } from '@/lib/theme'
import { useToast } from './Toast'
import { T } from './ui'

// A function, not a constant: theme colours must be read at render time.
const tiles = (): { key: ExportFormat | 'sheets'; label: string; sub: string; icon: LucideIcon; bg: string; fg: string }[] => [
  { key: 'csv', label: 'CSV', sub: 'Spreadsheet-ready', icon: FileText, bg: colors.neutral[200], fg: colors.text },
  { key: 'xlsx', label: 'Excel', sub: '.xlsx · 3 sheets', icon: FileSpreadsheet, bg: colors.accent2Ramp[200], fg: colors.accent2Ramp[900] },
  { key: 'pdf', label: 'PDF', sub: 'Accountant report', icon: Table, bg: colors.accentRamp[200], fg: colors.accentRamp[900] },
  { key: 'sheets', label: 'Google Sheets', sub: 'Send to a sheet', icon: Sheet, bg: colors.accent2Ramp[300], fg: colors.accent2Ramp[900] },
]

export function ExportTiles({ filter, label }: { filter: DocumentFilter; label: string }) {
  const client = useClient()
  const toast = useToast()
  const router = useRouter()
  const [busy, setBusy] = useState<string | null>(null)

  async function run(format: ExportFormat) {
    setBusy(format)
    try {
      await shareExport(await exportDocuments(client, { format, filter, label }))
    } catch (e) {
      toast.show(toUserMessage(e), 'error')
    } finally {
      setBusy(null)
    }
  }

  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
      {tiles().map(({ key, label: l, sub, icon: Icon, bg, fg }) => (
        <Pressable key={key} accessibilityRole="button" accessibilityLabel={`Export ${l}`} disabled={busy !== null}
          onPress={() => (key === 'sheets'
            ? router.push({ pathname: '/sheets', params: { from: filter.from ?? '', to: filter.to ?? '', label } })
            : void run(key))}
          style={({ pressed }) => ({ width: '48%', flexGrow: 1, gap: 18, padding: 16, borderRadius: 26, backgroundColor: bg, opacity: pressed ? 0.9 : 1 })}>
          <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center' }}>
            {busy === key ? <ActivityIndicator color={fg} /> : <Icon size={18} color={fg} strokeWidth={2.75} />}
          </View>
          <View><T weight="bold" color={fg}>{l}</T><T size={12} color={fg}>{sub}</T></View>
        </Pressable>
      ))}
    </View>
  )
}
