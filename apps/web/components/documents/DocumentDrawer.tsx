'use client'
import { useEffect, useEffectEvent, useMemo, useRef, useState } from 'react'
import { flushSync } from 'react-dom'
import { usePathname, useRouter } from 'next/navigation'
import { AlertTriangle, RefreshCw, ShieldCheck, X } from 'lucide-react'
import {
  ERROR_MESSAGES, draftChanged, draftFromRow, draftToInput, emptyDraft, regionFor, toUserMessage, type Draft, type DraftContext,
  type DocumentRow, type DocumentStatus, type FieldKey,
} from '@taxsteps/core'
import { SaveConflictError, useCategories, useDeleteDocument, useDocument, useSaveDocument } from '@taxsteps/data'
import { Dialog, inertOutside } from '@/components/ui/Dialog'
import { useToast } from '@/components/ui/Toast'
import { ICON } from '@/components/ui/icons'
import { useToday } from '@/lib/use-today'
import { DocumentForm } from './DocumentForm'

type State = { kind: 'new'; draft?: Draft } | { kind: 'edit'; row: DocumentRow }

export function DocumentDrawer({ state, onClose }: { state: State; onClose: () => void }) {
  const { today, profile, locale } = useToday()
  const { data: categories } = useCategories()
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => inertOutside(ref.current!), []) // the page behind can't be reached while the drawer is open
  const ctx: DraftContext | null = profile && categories ? { profile, categories, today, newId: () => crypto.randomUUID() } : null
  return (
    <div ref={ref} style={{ display: 'contents' }}>
      {ctx ? <DrawerBody state={state} ctx={ctx} locale={locale} onClose={onClose} /> : (
        <>
          <div className="overlay" onClick={onClose} />
          <aside className="drawer" aria-busy="true"><div className="drawer-body" style={{ placeItems: 'center' }}><span className="spinner" /></div></aside>
        </>
      )}
    </div>
  )
}

function DrawerBody({ state, ctx, locale, onClose }: { state: State; ctx: DraftContext; locale: string; onClose: () => void }) {
  const router = useRouter()
  const pathname = usePathname()
  const toast = useToast()
  const save = useSaveDocument()
  const remove = useDeleteDocument()
  // What the form started from: the baseline for unsaved changes and, for an edit, the version it applies to.
  const [base, setBase] = useState(() => ({
    draft: state.kind === 'edit' ? draftFromRow(state.row, ctx) : state.draft ?? emptyDraft(ctx),
    updatedAt: state.kind === 'edit' ? state.row.updated_at : undefined,
  }))
  const [draft, setDraft] = useState<Draft>(base.draft)
  const [errors, setErrors] = useState<Partial<Record<FieldKey, string>>>({})
  const [saveError, setSaveError] = useState<string | null>(null)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [confirmDiscard, setConfirmDiscard] = useState(false)
  const region = useMemo(() => regionFor(ctx.profile.country), [ctx.profile.country])
  const isNew = state.kind === 'new'
  const fromScan = isNew && draft.source !== 'manual'
  const dirty = fromScan || draftChanged(base.draft, draft) // an unsaved scan always counts: scanning again costs an AI call
  const live = useDocument(state.kind === 'edit' ? state.row.id : null)
  const deletedElsewhere = live.data === null && !remove.isPending && !remove.isSuccess
  const headingRef = useRef<HTMLHeadingElement>(null)
  const drawerRef = useRef<HTMLDivElement>(null)

  function requestClose() {
    if (dirty) setConfirmDiscard(true)
    else onClose()
  }

  const onEscape = useEffectEvent(() => { if (!confirmDelete && !confirmDiscard) requestClose() })
  useEffect(() => {
    headingRef.current?.focus()
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onEscape() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  useEffect(() => {
    if (!dirty) return
    const warn = (e: BeforeUnloadEvent) => e.preventDefault()
    window.addEventListener('beforeunload', warn)
    return () => window.removeEventListener('beforeunload', warn)
  }, [dirty])

  useEffect(() => {
    if (!deletedElsewhere) return
    toast.show(ERROR_MESSAGES.DOCUMENT_DELETED, 'error')
    onClose()
  }, [deletedElsewhere, toast, onClose])

  function change(key: FieldKey, value: string) {
    setDraft((d) => ({ ...d, values: { ...d.values, [key]: value }, flags: d.flags.filter((f) => f !== key), warnings: d.warnings.filter((w) => w.field !== key) }))
    setErrors((e) => ({ ...e, [key]: undefined }))
  }

  async function onSave() {
    setSaveError(null)
    const result = draftToInput(draft, ctx)
    if (!result.ok) {
      flushSync(() => setErrors(result.errors))
      drawerRef.current?.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus() // so screen readers hear what to fix
      return
    }
    try {
      await save.mutateAsync({ input: result.input, expectedUpdatedAt: base.updatedAt })
      toast.show(isNew ? (fromScan ? 'Expense saved · photo discarded' : 'Expense saved') : 'Changes saved · synced to all devices')
      onClose()
      if (isNew && pathname === '/scan') router.push('/')
    } catch (e) {
      if (e instanceof SaveConflictError) {
        if (!e.latest) {
          toast.show(e.message, 'error')
          onClose()
          return
        }
        const latest = draftFromRow(e.latest, ctx)
        setBase({ draft: latest, updatedAt: e.latest.updated_at })
        setDraft(latest)
        setErrors({})
      }
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
      <div className="overlay" onClick={requestClose} />
      <div className="drawer" role="dialog" aria-modal="true" aria-labelledby="drawer-title" ref={drawerRef}>
        <div className="drawer-head">
          <span className="tag tag-accent-2 row" style={{ gap: 5, fontWeight: 700 }}>
            {isNew ? <ShieldCheck {...ICON} width={13} height={13} /> : <RefreshCw {...ICON} width={13} height={13} />}
            {isNew ? (fromScan ? 'Photo discarded after extraction' : 'Manual entry') : 'Synced across devices'}
          </span>
          <button type="button" className="btn btn-secondary btn-icon round" onClick={requestClose} aria-label="Close"><X {...ICON} /></button>
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
            ? <button type="button" className="btn btn-secondary btn-lg" onClick={requestClose}>Cancel</button>
            : <button type="button" className="btn btn-secondary btn-lg btn-danger" onClick={() => setConfirmDelete(true)}>Delete</button>}
          <button type="button" className="btn btn-primary btn-lg grow" onClick={onSave} disabled={save.isPending}>
            {save.isPending ? 'Saving…' : isNew ? 'Save expense' : 'Save changes'}
          </button>
        </div>
      </div>
      {confirmDelete && (
        <Dialog title="Delete this document?" onClose={() => setConfirmDelete(false)}
          footer={<>
            <button type="button" className="btn btn-secondary btn-lg" onClick={() => setConfirmDelete(false)}>Keep it</button>
            <button type="button" className="btn btn-primary btn-lg" onClick={onDelete} disabled={remove.isPending}>Delete</button>
          </>}>
          <p style={{ margin: 0 }}>It will be removed from every device. This can&apos;t be undone.</p>
        </Dialog>
      )}
      {confirmDiscard && (
        <Dialog title="Discard changes?" onClose={() => setConfirmDiscard(false)}
          footer={<>
            <button type="button" className="btn btn-secondary btn-lg" onClick={() => setConfirmDiscard(false)}>Keep editing</button>
            <button type="button" className="btn btn-primary btn-lg" onClick={onClose}>Discard</button>
          </>}>
          <p style={{ margin: 0 }}>
            {fromScan ? "This scan hasn't been saved. To get it back you'd need to scan the receipt again." : "Your changes haven't been saved."}
          </p>
        </Dialog>
      )}
    </>
  )
}
