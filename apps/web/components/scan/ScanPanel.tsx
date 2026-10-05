'use client'
import { useRef, useState, type DragEvent } from 'react'
import { Camera, Check, PencilLine, ShieldCheck, Upload } from 'lucide-react'
import { COPY, draftFromExtraction, toUserMessage, type DraftContext } from '@taxsteps/core'
import { extractDocument, useCategories, useClient } from '@taxsteps/data'
import { useDocumentDrawer } from '@/components/documents/DrawerContext'
import { ICON } from '@/components/ui/icons'
import { prepareFile } from '@/lib/image'
import { useToday } from '@/lib/use-today'

const STEPS = ['Uploading securely', 'Extracting details', 'Discarding your photo']

type Phase = { kind: 'idle' } | { kind: 'working'; step: number } | { kind: 'error'; message: string }

export function ScanPanel() {
  const client = useClient()
  const drawer = useDocumentDrawer()
  const { today, profile } = useToday()
  const { data: categories } = useCategories()
  const [phase, setPhase] = useState<Phase>({ kind: 'idle' })
  const [over, setOver] = useState(false)
  const fileInput = useRef<HTMLInputElement>(null)
  const cameraInput = useRef<HTMLInputElement>(null)
  const ready = Boolean(profile && categories)

  async function handle(file: File | undefined, source: 'scan' | 'upload') {
    if (!file || !profile || !categories) return
    setPhase({ kind: 'working', step: 0 })
    try {
      let prepared: { base64: string; mimeType: string; filename: string } | null = await prepareFile(file)
      setPhase({ kind: 'working', step: 1 })
      const res = await extractDocument(client, {
        file: prepared.base64, mimeType: prepared.mimeType, filename: prepared.filename,
        hints: { categories: categories.filter((c) => !c.archived).map((c) => c.name), country: profile.country, currency: profile.currency },
      })
      prepared = null // drop our only reference to the image data
      setPhase({ kind: 'working', step: 2 })
      await new Promise((r) => setTimeout(r, 400))
      const ctx: DraftContext = { profile, categories, today, newId: () => crypto.randomUUID() }
      setPhase({ kind: 'idle' })
      drawer.openNew(draftFromExtraction(res, ctx, source))
    } catch (e) {
      setPhase({ kind: 'error', message: toUserMessage(e) })
    } finally {
      if (fileInput.current) fileInput.current.value = ''
      if (cameraInput.current) cameraInput.current.value = ''
    }
  }

  function onDrop(e: DragEvent) {
    e.preventDefault()
    setOver(false)
    void handle(e.dataTransfer.files[0], 'upload')
  }

  return (
    <div className="tile stack" style={{ maxWidth: 620, gap: 18, padding: 28 }}>
      {phase.kind === 'working' ? (
        <div className="stack" style={{ gap: 14 }} aria-live="polite">
          <h3 style={{ margin: 0 }}>Reading your receipt…</h3>
          {STEPS.map((label, i) => {
            const state = phase.step > i ? 'done' : phase.step === i ? 'active' : 'todo'
            return (
              <div key={label} className="step" data-state={state}>
                <span className="step-mark">{state === 'done' ? <Check {...ICON} /> : state === 'active' ? <span className="spinner" /> : null}</span>
                {label}
              </div>
            )
          })}
        </div>
      ) : (
        <>
          <button type="button" className="dropzone" data-over={over} disabled={!ready}
            onClick={() => fileInput.current?.click()}
            onDragOver={(e) => { e.preventDefault(); setOver(true) }} onDragLeave={() => setOver(false)} onDrop={onDrop}>
            <span className="disc"><Upload {...ICON} /></span>
            <span className="big" style={{ fontSize: 20 }}>Drop a receipt or invoice</span>
            <span className="muted" style={{ fontSize: 14 }}>or click to browse · JPG, PNG, WebP or PDF up to 10 MB</span>
          </button>
          <div className="row" style={{ flexWrap: 'wrap' }}>
            <button type="button" className="btn btn-dark btn-lg show-mobile" disabled={!ready} onClick={() => cameraInput.current?.click()}>
              <Camera {...ICON} />Take photo
            </button>
            <button type="button" className="btn btn-secondary btn-lg btn-paper" disabled={!ready} onClick={() => drawer.openNew()}>
              <PencilLine {...ICON} />Enter manually
            </button>
          </div>
          {phase.kind === 'error' && (
            <div className="banner banner-warn" role="alert" style={{ flexDirection: 'column', gap: 10 }}>
              <span>{phase.message}</span>
              <div className="row">
                <button type="button" className="btn btn-secondary btn-paper" onClick={() => fileInput.current?.click()}>Try again</button>
                <button type="button" className="btn btn-primary" onClick={() => { setPhase({ kind: 'idle' }); drawer.openNew() }}>Enter manually</button>
              </div>
            </div>
          )}
        </>
      )}
      <div className="banner banner-ok"><ShieldCheck {...ICON} />{COPY.photoPrivacy}</div>
      <input ref={fileInput} type="file" hidden accept="image/jpeg,image/png,image/webp,image/heic,application/pdf"
        onChange={(e) => void handle(e.target.files?.[0], 'upload')} />
      <input ref={cameraInput} type="file" hidden accept="image/*" capture="environment"
        onChange={(e) => void handle(e.target.files?.[0], 'scan')} />
    </div>
  )
}
