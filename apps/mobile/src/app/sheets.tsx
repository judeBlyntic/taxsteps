import { useEffect, useState } from 'react'
import { Linking as RNLinking, View } from 'react-native'
import { useLocalSearchParams } from 'expo-router'
import * as Linking from 'expo-linking'
import * as WebBrowser from 'expo-web-browser'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Sheet } from 'lucide-react-native'
import { isISODate, toUserMessage, type DocumentFilter } from '@taxsteps/core'
import { qk, sheets, useClient, useSheetsStatus, type SheetsExportResult } from '@taxsteps/data'
import { BackHeader } from '@/components/BackHeader'
import { Banner, Button, Chip, Muted, Screen, T, TextField } from '@/components/ui'
import { useToast } from '@/components/Toast'

const NEW = '__new__'

export default function SheetsScreen() {
  const params = useLocalSearchParams<{ from?: string; to?: string; label?: string }>()
  const client = useClient()
  const qc = useQueryClient()
  const toast = useToast()
  const status = useSheetsStatus()
  const connected = Boolean(status.data?.connected)
  const filter: DocumentFilter = params.from && params.to && isISODate(params.from) && isISODate(params.to) ? { from: params.from, to: params.to } : {}
  const label = params.label || 'All time'
  const files = useQuery({ queryKey: ['sheets-files'], enabled: connected, queryFn: () => sheets<{ id: string; name: string }[]>(client, { action: 'list-spreadsheets' }) })
  const [fileId, setFileId] = useState('')
  const [newName, setNewName] = useState('Tax Steps Export')
  const [busy, setBusy] = useState(false)
  const [result, setResult] = useState<SheetsExportResult | null>(null)
  useEffect(() => { if (!fileId && files.data) setFileId(status.data?.defaultSpreadsheetId ?? files.data[0]?.id ?? NEW) }, [files.data, fileId, status.data])

  async function connect() {
    setBusy(true)
    try {
      const returnTo = Linking.createURL('sheets')
      const { url } = await sheets<{ url: string }>(client, { action: 'start', returnTo })
      const r = await WebBrowser.openAuthSessionAsync(url, returnTo)
      if (r.type === 'success') {
        const q = Linking.parse(r.url).queryParams ?? {}
        const code = typeof q.sheets_code === 'string' ? q.sheets_code : null
        const state = typeof q.sheets_state === 'string' ? q.sheets_state : null
        if (code && state) {
          await sheets(client, { action: 'complete', code, state }) // links only if this user started the flow
          toast.show('Google Sheets connected')
        } else {
          toast.show("Google Sheets wasn't connected. Please try again.", 'error')
        }
      }
      await qc.invalidateQueries({ queryKey: qk.sheetsStatus })
    } catch (e) {
      toast.show(toUserMessage(e), 'error')
    } finally {
      setBusy(false)
    }
  }

  async function send() {
    setBusy(true)
    try {
      const spreadsheetId = fileId === NEW ? (await sheets<{ id: string }>(client, { action: 'create-spreadsheet', title: newName.trim() || 'Tax Steps Export' })).id : fileId
      const sheet = fileId === NEW ? 'Expenses' : status.data?.defaultSheet && fileId === status.data.defaultSpreadsheetId ? status.data.defaultSheet : 'Expenses'
      if (fileId !== NEW) {
        const tabs = await sheets<string[]>(client, { action: 'list-worksheets', spreadsheetId })
        if (!tabs.includes(sheet)) await sheets(client, { action: 'create-worksheet', spreadsheetId, title: sheet })
      }
      const res = await sheets<SheetsExportResult>(client, { action: 'export', spreadsheetId, sheet, filter })
      setResult(res)
      toast.show(`Exported ${res.documents} documents`)
      void files.refetch()
      void qc.invalidateQueries({ queryKey: qk.sheetsStatus })
    } catch (e) {
      toast.show(toUserMessage(e), 'error')
    } finally {
      setBusy(false)
    }
  }

  return (
    <Screen style={{ gap: 16 }}>
      <BackHeader title="Google Sheets" />
      {status.isLoading ? <T>Checking…</T> : status.data?.configured === false ? (
        <Banner>Google Sheets export is not set up on this server yet.</Banner>
      ) : !connected ? (
        <>
          <T>Connect your Google account to send expenses to a spreadsheet. Tax Steps can only see spreadsheets it creates.</T>
          <Button label={busy ? 'Opening Google…' : 'Connect Google Sheets'} icon={Sheet} loading={busy} onPress={() => void connect()} />
        </>
      ) : (
        <>
          <Muted>Connected{status.data?.email ? ` · ${status.data.email}` : ''}</Muted>
          <T weight="semibold">Export: {label}</T>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {(files.data ?? []).map((f) => <Chip key={f.id} label={f.name} selected={fileId === f.id} onPress={() => setFileId(f.id)} />)}
            <Chip label="+ New spreadsheet" selected={fileId === NEW} onPress={() => setFileId(NEW)} />
          </View>
          {fileId === NEW && <TextField label="Spreadsheet name" value={newName} onChangeText={setNewName} maxLength={100} />}
          <Button label="Send to Google Sheets" icon={Sheet} loading={busy} disabled={!fileId} onPress={() => void send()} />
          {result && <Button label={`Open sheet (${result.updatedRows} rows added)`} variant="secondary" onPress={() => void RNLinking.openURL(result.spreadsheetUrl)} />}
          <Button label="Disconnect" variant="ghost" onPress={async () => {
            try { await sheets(client, { action: 'disconnect' }); await qc.invalidateQueries({ queryKey: qk.sheetsStatus }) } catch (e) { toast.show(toUserMessage(e), 'error') }
          }} />
        </>
      )}
    </Screen>
  )
}
