'use client'
import { useEffect, useMemo, useRef, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { AlertTriangle, RefreshCw, ShieldCheck, X } from 'lucide-react'
import {
  ERROR_MESSAGES, draftFromRow, draftToInput, emptyDraft, regionFor, toUserMessage, type Draft, type DraftContext,
  type DocumentRow, type DocumentStatus, type FieldKey,
} from '@taxsteps/core'
import { useCategories, useDeleteDocument, useSaveDocument } from '@taxsteps/data'
import { Dialog } from '@/components/ui/Dialog'
import { useToast } from '@/components/ui/Toast'
import { ICON } from '@/components/ui/icons'
import { useToday } from '@/lib/use-today'
import { DocumentForm } from './DocumentForm'

type State = { kind: 'new'; draft?: Draft } | { kind: 'edit'; row: DocumentRow }

export function DocumentDrawer({ state, onClose }: { state: State; onClose: () => void }) {
  const { today, profile, locale } = useToday()
  const { data: categories } = useCategories()
  if (!profile || !categories) {
    return (
      <>
        <div className="overlay" onClick={onClose} />
        <aside className="drawer" aria-busy="true"><div className="drawer-body" style={{ placeItems: 'center' }}><span className="spinner" /></div></aside>
      </>
    )
  }
  const ctx: DraftContext = { profile, categories, today, newId: () => crypto.randomUUID() }
  return <DrawerBody state={state} ctx={ctx} locale={locale} onClose={onClose} />
}

function DrawerBody({ state, ctx, locale, onClose }: { state: State; ctx: DraftContext; locale: string; onClose: () => void }) {
  const router = useRouter()
  const pathname = usePathname()
  const toast = useToast()
  const save = useSaveDocument()
  const remove = useDeleteDocument()
  const [draft, setDraft] = useState<Draft>(() =>
    state.kind === 'edit' ? draftFromRow(state.row, ctx) : state.draft ?? emptyDraft(ctx))
  const [errors, setErrors] = useState<Partial<Record<FieldKey, string>>>({})
  const [saveError, setSaveError] = useState<string | null>(null)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const region = useMemo(() => regionFor(ctx.profile.country), [ctx.profile.country])
  const isNew = state.kind === 'new'
  const fromScan = isNew && draft.source !== 'manual'
  const headingRef = useRef<HTMLHeadingElement>(null)

  useEffect(() => {
    headingRef.current?.focus()
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape' && !confirmDelete) onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose, confirmDelete])

  function change(key: FieldKey, value: string) {
    setDraft((d) => ({ ...d, values: { ...d.values, [key]: value }, flags: d.flags.filter((f) => f !== key), warnings: d.warnings.filter((w) => w.field !== key) }))
    setErrors((e) => ({ ...e, [key]: undefined }))
  }

  async function onSave() {
    setSaveError(null)
    const result = draftToInput(draft, ctx)
    if (!result.ok) {
      setErrors(result.errors)
      return
    }
    try {
      await save.mutateAsync(result.input)
      toast.show(isNew ? (fromScan ? 'Expense saved · photo discarded' : 'Expense saved') : 'Changes saved · synced to all devices')
      onClose()
      if (isNew && pathname === '/scan') router.push('/')
    } catch (e) {
      setSaveError(toUserMessage(e) === ERROR_MESSAGES.INTERNAL ? ERROR_MESSAGES.SAVE_FAILED : toUserMessage(e))
    }
  }

  async function onDelete() {
    if (state.kind !== 'edit') return
    try {
      await remove.mutateAsync(state.row.id)
      toast.show('Document deleted everywhere')
      onClose()
    } catch (e) {
      toast.show(toUserMessage(e), 'error')
    }
  }

  const title = isNew ? (fromScan ? 'Review your information' : 'New expense') : draft.values.merchant_name || 'Document'
  const statusValue: DocumentStatus | 'auto' = draft.statusOverride ?? 'auto'

  return (
    <>
      <div className="overlay" onClick={onClose} />
      <aside className="drawer" role="dialog" aria-modal="true" aria-labelledby="drawer-title">
        <div className="drawer-head">
          <span className="tag tag-accent-2 row" style={{ gap: 5, fontWeight: 700 }}>
            {isNew ? <ShieldCheck {...ICON} width={13} height={13} /> : <RefreshCw {...ICON} width={13} height={13} />}
            {isNew ? (fromScan ? 'Photo discarded after extraction' : 'Manual entry') : 'Synced across devices'}
          </span>
          <button type="button" className="btn btn-secondary btn-icon round" onClick={onClose} aria-label="Close"><X {...ICON} /></button>
        </div>
        <div className="drawer-body">
          <h3 id="drawer-title" tabIndex={-1} ref={headingRef} style={{ margin: 0, outline: 'none' }}>{title}</h3>
          {draft.flags.length > 0 && (
            <div className="banner banner-warn"><AlertTriangle {...ICON} />We found most of the information. Please check the highlighted fields.</div>
          )}
          <DocumentForm draft={draft} errors={errors} categories={ctx.categories} region={region} locale={locale} onChange={change} />
          <div className="segmented" role="group" aria-label="Expense type">
            {(['business', 'personal'] as const).map((t) => (
              <button key={t} type="button" aria-pressed={draft.expense_type === t} onClick={() => setDraft((d) => ({ ...d, expense_type: t }))}>
                {t === 'business' ? 'Business' : 'Personal'}
              </button>
            ))}
          </div>
          <div className="field">
            <label id="status-label">Status</label>
            <div className="segmented" role="group" aria-labelledby="status-label">
              {([['auto', 'Auto'], ['complete', 'Complete'], ['needs_review', 'Needs review']] as const).map(([v, l]) => (
                <button key={v} type="button" aria-pressed={statusValue === v}
                  onClick={() => setDraft((d) => ({ ...d, statusOverride: v === 'auto' ? null : v }))}>{l}</button>
              ))}
            </div>
          </div>
          {saveError && <div className="banner banner-warn" role="alert"><AlertTriangle {...ICON} />{saveError}</div>}
        </div>
        <div className="drawer-foot">
          {isNew
            ? <button type="button" className="btn btn-secondary btn-lg" onClick={onClose}>Cancel</button>
            : <button type="button" className="btn btn-secondary btn-lg btn-danger" onClick={() => setConfirmDelete(true)}>Delete</button>}
          <button type="button" className="btn btn-primary btn-lg grow" onClick={onSave} disabled={save.isPending}>
            {save.isPending ? 'Saving…' : isNew ? 'Save expense' : 'Save changes'}
          </button>
        </div>
      </aside>
      {confirmDelete && (
        <Dialog title="Delete this document?" onClose={() => setConfirmDelete(false)}
          footer={<>
            <button type="button" className="btn btn-secondary btn-lg" onClick={() => setConfirmDelete(false)}>Keep it</button>
            <button type="button" className="btn btn-primary btn-lg" onClick={onDelete} disabled={remove.isPending}>Delete</button>
          </>}>
          <p style={{ margin: 0 }}>It will be removed from every device. This can&apos;t be undone.</p>
        </Dialog>
      )}
    </>
  )
}
