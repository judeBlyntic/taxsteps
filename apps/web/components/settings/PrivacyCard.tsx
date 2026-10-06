'use client'
import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useQueryClient } from '@tanstack/react-query'
import { ShieldCheck } from 'lucide-react'
import { COPY, toUserMessage } from '@taxsteps/core'
import { deleteAccount, deleteAllDocuments, invalidateDocuments, useClient } from '@taxsteps/data'
import { Dialog } from '@/components/ui/Dialog'
import { useToast } from '@/components/ui/Toast'
import { ICON } from '@/components/ui/icons'

type Pending = 'documents' | 'account' | null

export function PrivacyCard() {
  const client = useClient()
  const qc = useQueryClient()
  const router = useRouter()
  const toast = useToast()
  const [pending, setPending] = useState<Pending>(null)
  const [typed, setTyped] = useState('')
  const [busy, setBusy] = useState(false)

  async function confirm() {
    setBusy(true)
    try {
      if (pending === 'documents') {
        const n = await deleteAllDocuments(client)
        invalidateDocuments(qc)
        toast.show(`${n} documents deleted`)
      } else {
        await deleteAccount(client)
        await client.auth.signOut()
        qc.clear()
        router.replace('/sign-in?deleted=1')
      }
      setPending(null)
    } catch (e) {
      toast.show(toUserMessage(e), 'error')
    } finally {
      setBusy(false)
      setTyped('')
    }
  }

  return (
    <section className="tile stack" style={{ gap: 10, background: 'var(--color-accent-2-100)', color: 'var(--color-accent-2-900)' }}>
      <h4 className="row" style={{ gap: 8 }}><ShieldCheck {...ICON} />Privacy</h4>
      <p style={{ margin: 0, fontSize: 14, lineHeight: 1.5 }}>{COPY.privacyPanel}</p>
      <p style={{ margin: 0, fontSize: 13, lineHeight: 1.5 }}>{COPY.providerNote}</p>
      <p style={{ margin: 0, fontSize: 13, lineHeight: 1.5 }}>{COPY.disclaimer}</p>
      <p style={{ margin: 0, fontSize: 13 }}><Link className="link" href="/terms">Terms of Service</Link> · <Link className="link" href="/privacy">Privacy Policy</Link></p>
      <div className="row" style={{ flexWrap: 'wrap', marginTop: 6 }}>
        <Link className="btn btn-secondary btn-paper" href="/export?range=all">Export all data</Link>
        <button type="button" className="btn btn-secondary btn-paper btn-danger" onClick={() => setPending('documents')}>Delete all documents</button>
        <button type="button" className="btn btn-ghost btn-danger" onClick={() => setPending('account')}>Delete account</button>
      </div>
      {pending && (
        <Dialog title={pending === 'account' ? 'Delete your account?' : 'Delete all documents?'} onClose={() => { setPending(null); setTyped('') }}
          footer={<>
            <button type="button" className="btn btn-secondary btn-lg" onClick={() => { setPending(null); setTyped('') }}>Cancel</button>
            <button type="button" className="btn btn-primary btn-lg" disabled={typed !== 'DELETE' || busy} onClick={() => void confirm()}>
              {busy ? 'Deleting…' : 'Delete permanently'}
            </button>
          </>}>
          <p style={{ margin: 0 }}>
            {pending === 'account'
              ? 'Your account, profile, categories, documents and Google Sheets connection will be permanently deleted from every device.'
              : 'Every document will be permanently deleted from every device. Your account and categories stay.'}
            {' '}This can&apos;t be undone — consider exporting your data first.
          </p>
          <label className="field">
            <span style={{ fontSize: 13, fontWeight: 600 }}>Type DELETE to confirm</span>
            <input className="input" value={typed} onChange={(e) => setTyped(e.target.value)} autoComplete="off" />
          </label>
        </Dialog>
      )}
    </section>
  )
}
