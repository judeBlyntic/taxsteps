'use client'
import { Suspense, useEffect, useRef, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useQueryClient } from '@tanstack/react-query'
import { Sheet } from 'lucide-react'
import { toUserMessage } from '@taxsteps/core'
import { qk, sheets, useClient, useSheetsStatus } from '@taxsteps/data'
import { useToast } from '@/components/ui/Toast'
import { ICON } from '@/components/ui/icons'

/** Finishes the Google OAuth round trip: the signed-in user completes the link server-side. */
function ReturnHandler() {
  const params = useSearchParams()
  const router = useRouter()
  const toast = useToast()
  const qc = useQueryClient()
  const client = useClient()
  const code = params.get('sheets_code')
  const state = params.get('sheets_state')
  const failed = params.get('sheets') === 'error'
  const handled = useRef<string | null>(null) // the code is single-use: never submit it twice
  useEffect(() => {
    if (!failed && !(code && state)) return
    const key = code ?? 'error'
    if (handled.current === key) return
    handled.current = key
    router.replace('/settings', { scroll: false }) // drop the one-time code from the URL
    if (failed || !code || !state) {
      toast.show("Google Sheets wasn't connected. Please try again.", 'error')
      return
    }
    void sheets(client, { action: 'complete', code, state })
      .then(() => toast.show('Google Sheets connected'))
      .catch((e) => toast.show(toUserMessage(e), 'error'))
      .finally(() => void qc.invalidateQueries({ queryKey: qk.sheetsStatus }))
  }, [code, state, failed, toast, qc, router, client])
  return null
}

export function SheetsCard() {
  const client = useClient()
  const qc = useQueryClient()
  const toast = useToast()
  const status = useSheetsStatus()
  const [busy, setBusy] = useState(false)
  const s = status.data

  async function connect() {
    setBusy(true)
    try {
      const { url } = await sheets<{ url: string }>(client, { action: 'start', returnTo: `${window.location.origin}/settings` })
      window.location.assign(url)
    } catch (e) {
      toast.show(toUserMessage(e), 'error')
      setBusy(false)
    }
  }
  async function disconnect() {
    setBusy(true)
    try {
      await sheets(client, { action: 'disconnect' })
      await qc.invalidateQueries({ queryKey: qk.sheetsStatus })
      toast.show('Google Sheets disconnected')
    } catch (e) {
      toast.show(toUserMessage(e), 'error')
    } finally {
      setBusy(false)
    }
  }

  const sub = status.isLoading ? 'Checking…'
    : status.isError ? "Couldn't check the connection."
      : !s?.configured ? 'Not set up on this server yet.'
        : s.connected ? `Connected${s.email ? ` · ${s.email}` : ''}` : 'Send expenses to a spreadsheet you own.'

  return (
    <section className="tile stack" style={{ gap: 12 }}>
      <Suspense><ReturnHandler /></Suspense>
      <h4>Integrations</h4>
      <div className="row" style={{ gap: 14, flexWrap: 'wrap' }}>
        <span className="cat-dot" style={{ background: 'var(--color-accent-2-200)', color: 'var(--color-accent-2-800)' }}><Sheet {...ICON} /></span>
        <div className="grow"><b>Google Sheets</b><div className="muted" style={{ fontSize: 13 }}>{sub}</div></div>
        {s?.connected
          ? <button type="button" className="btn btn-secondary" disabled={busy} onClick={() => void disconnect()}>Disconnect</button>
          : <button type="button" className="btn btn-dark" disabled={busy || !s?.configured} onClick={() => void connect()}>{busy ? 'Opening Google…' : 'Connect'}</button>}
      </div>
      <p className="muted" style={{ margin: 0, fontSize: 12.5 }}>
        Tax Steps only asks for access to spreadsheets it creates — it can&apos;t see the rest of your Google Drive.
      </p>
    </section>
  )
}
