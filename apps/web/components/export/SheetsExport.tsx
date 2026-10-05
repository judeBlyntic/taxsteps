'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useQuery } from '@tanstack/react-query'
import { ExternalLink, Sheet } from 'lucide-react'
import { toUserMessage, type DocumentFilter } from '@taxsteps/core'
import { sheets, useClient, useSheetsStatus, type SheetsExportResult } from '@taxsteps/data'
import { SelectField, TextField } from '@/components/ui/Field'
import { useToast } from '@/components/ui/Toast'
import { ICON } from '@/components/ui/icons'

const NEW = '__new__'

export function SheetsExport({ filter, label, disabled }: { filter: DocumentFilter; label: string; disabled: boolean }) {
  const client = useClient()
  const toast = useToast()
  const status = useSheetsStatus()
  const connected = Boolean(status.data?.connected)
  const files = useQuery({
    queryKey: ['sheets-files'], enabled: connected,
    queryFn: () => sheets<{ id: string; name: string }[]>(client, { action: 'list-spreadsheets' }),
  })
  const [fileId, setFileId] = useState<string>('')
  const [newFile, setNewFile] = useState('Tax Steps Export')
  const [tab, setTab] = useState<string>('')
  const [newTab, setNewTab] = useState(label)
  const [busy, setBusy] = useState(false)
  const [result, setResult] = useState<SheetsExportResult | null>(null)

  useEffect(() => {
    if (!fileId && files.data) setFileId(status.data?.defaultSpreadsheetId && files.data.some((f) => f.id === status.data?.defaultSpreadsheetId)
      ? status.data.defaultSpreadsheetId : files.data[0]?.id ?? NEW)
  }, [files.data, fileId, status.data?.defaultSpreadsheetId])
  useEffect(() => setNewTab(label), [label])

  const tabs = useQuery({
    queryKey: ['sheets-tabs', fileId], enabled: connected && Boolean(fileId) && fileId !== NEW,
    queryFn: () => sheets<string[]>(client, { action: 'list-worksheets', spreadsheetId: fileId }),
  })
  useEffect(() => { if (tabs.data) setTab(tabs.data.includes(status.data?.defaultSheet ?? '') ? status.data!.defaultSheet! : tabs.data[0] ?? NEW) }, [tabs.data, status.data])

  if (status.isLoading) return <div className="muted">Checking Google Sheets…</div>
  if (!connected) {
    return (
      <div className="banner banner-warn">
        {status.data?.configured === false ? 'Google Sheets export is not set up on this server yet.' : <>Connect Google Sheets in <Link className="link" href="/settings">Settings</Link> first.</>}
      </div>
    )
  }

  async function send() {
    setBusy(true)
    setResult(null)
    try {
      let spreadsheetId = fileId
      if (fileId === NEW) spreadsheetId = (await sheets<{ id: string }>(client, { action: 'create-spreadsheet', title: newFile.trim() || 'Tax Steps Export' })).id
      let sheet = tab
      if (fileId === NEW) sheet = 'Expenses'
      else if (tab === NEW) {
        sheet = newTab.trim() || label
        await sheets(client, { action: 'create-worksheet', spreadsheetId, title: sheet })
      }
      const res = await sheets<SheetsExportResult>(client, { action: 'export', spreadsheetId, sheet, filter })
      setResult(res)
      toast.show(`Exported ${res.documents} documents to Google Sheets`)
      void files.refetch()
      if (fileId === NEW) setFileId(spreadsheetId)
    } catch (e) {
      toast.show(toUserMessage(e), 'error')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="stack" style={{ gap: 12 }}>
      <div className="field-grid">
        <SelectField label="Spreadsheet" value={fileId} onChange={(e) => setFileId(e.target.value)}>
          {(files.data ?? []).map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
          <option value={NEW}>+ New spreadsheet</option>
        </SelectField>
        {fileId === NEW
          ? <TextField label="New spreadsheet name" value={newFile} maxLength={100} onChange={(e) => setNewFile(e.target.value)} />
          : (
            <SelectField label="Worksheet" value={tab} onChange={(e) => setTab(e.target.value)}>
              {(tabs.data ?? []).map((t) => <option key={t} value={t}>{t}</option>)}
              <option value={NEW}>+ New worksheet</option>
            </SelectField>
          )}
        {fileId !== NEW && tab === NEW && <TextField label="New worksheet name" className="full" value={newTab} maxLength={100} onChange={(e) => setNewTab(e.target.value)} />}
      </div>
      <button type="button" className="btn btn-primary btn-xl" disabled={disabled || busy || !fileId} onClick={() => void send()}>
        {busy ? <span className="spinner" /> : <Sheet {...ICON} />}Send to Google Sheets
      </button>
      {result && (
        <a className="btn btn-secondary" href={result.spreadsheetUrl} target="_blank" rel="noopener noreferrer"><ExternalLink {...ICON} />Open sheet ({result.updatedRows} rows added)</a>
      )}
      <p className="muted" style={{ margin: 0, fontSize: 12.5 }}>Tax Steps can only see spreadsheets it created. New rows are appended; the header is added once.</p>
    </div>
  )
}
