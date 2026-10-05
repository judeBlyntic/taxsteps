'use client'
import { Suspense, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { Download } from 'lucide-react'
import { COPY, isISODate, periodLabel, resolvePeriod, type DocumentFilter, type ExportFormat, type PeriodSpec } from '@taxsteps/core'
import { useCategories } from '@taxsteps/data'
import { PageHeader } from '@/components/shell/PageHeader'
import { quickPeriods } from '@/components/documents/FilterPanel'
import { TextField } from '@/components/ui/Field'
import { ICON } from '@/components/ui/icons'
import { useFileExport } from '@/lib/download'
import { useToday } from '@/lib/use-today'
import { SheetsExport } from '@/components/export/SheetsExport'

type Format = ExportFormat | 'sheets'
const UUID = /^[0-9a-f-]{36}$/i

function ExportView() {
  const params = useSearchParams()
  const { today, locale, fy } = useToday()
  const { data: categories } = useCategories()
  const { run, busy } = useFileExport()
  const ids = (params.get('ids') ?? '').split(',').filter((s) => UUID.test(s)).slice(0, 1000)
  const initialFrom = params.get('from'); const initialTo = params.get('to')
  const presets = quickPeriods(today, fy)

  const [format, setFormat] = useState<Format>(params.get('format') === 'sheets' ? 'sheets' : 'xlsx')
  const [range, setRange] = useState<string>(ids.length ? 'selected' : params.get('range') === 'all' ? 'all'
    : initialFrom && initialTo && isISODate(initialFrom) && isISODate(initialTo) ? 'custom' : 'this-fy')
  const [custom, setCustom] = useState({ from: initialFrom ?? '', to: initialTo ?? '' })
  const [excluded, setExcluded] = useState<Set<string>>(new Set())

  const active = (categories ?? []).filter((c) => !c.archived)
  const preset = presets.find((p) => p.id === range)
  const spec: PeriodSpec = range === 'custom' ? { kind: 'custom', from: custom.from, to: custom.to } : preset?.spec ?? { kind: 'all' }
  const dates = range === 'custom' && !(isISODate(custom.from) && isISODate(custom.to)) ? null : resolvePeriod(spec, fy)
  const label = range === 'selected' ? `${ids.length} selected documents` : periodLabel(spec, fy, locale)
  const filter: DocumentFilter = range === 'selected' ? { ids } : {
    ...(dates ?? {}),
    ...(excluded.size ? { categoryIds: active.filter((c) => !excluded.has(c.id)).map((c) => c.id) } : {}),
  }
  const invalid = range === 'custom' && !dates

  return (
    <>
      <PageHeader title="Export" subtitle="Download your records or send them to Google Sheets." actions={<span />} />
      <div className="page-body stack" style={{ maxWidth: 820 }}>
        <section className="tile stack" style={{ gap: 18 }}>
          <div className="stack" style={{ gap: 8 }}>
            <span style={{ fontWeight: 700 }}>Format</span>
            <div className="segmented" role="radiogroup" aria-label="Format">
              {([['csv', 'CSV'], ['xlsx', 'Excel'], ['pdf', 'PDF'], ['sheets', 'Google Sheets']] as const).map(([f, l]) => (
                <button key={f} type="button" role="radio" aria-checked={format === f} aria-pressed={format === f} onClick={() => setFormat(f)}>{l}</button>
              ))}
            </div>
          </div>
          <div className="stack" style={{ gap: 8 }}>
            <span style={{ fontWeight: 700 }}>Records</span>
            <div className="chips">
              {ids.length > 0 && <button type="button" className="chip" aria-pressed={range === 'selected'} onClick={() => setRange('selected')}>Selected ({ids.length})</button>}
              {presets.map((p) => <button key={p.id} type="button" className="chip" aria-pressed={range === p.id} onClick={() => setRange(p.id)}>{p.label}</button>)}
              <button type="button" className="chip" aria-pressed={range === 'custom'} onClick={() => setRange('custom')}>Custom range</button>
              <button type="button" className="chip" aria-pressed={range === 'all'} onClick={() => setRange('all')}>All time</button>
            </div>
            {range === 'custom' && (
              <div className="field-grid" style={{ maxWidth: 420 }}>
                <TextField label="From" type="date" value={custom.from} onChange={(e) => setCustom((c) => ({ ...c, from: e.target.value }))} />
                <TextField label="To" type="date" value={custom.to} onChange={(e) => setCustom((c) => ({ ...c, to: e.target.value }))} />
              </div>
            )}
            {dates && <span className="muted" style={{ fontSize: 13 }}>{dates.from} to {dates.to}</span>}
          </div>
          {range !== 'selected' && (
            <div className="stack" style={{ gap: 8 }}>
              <span style={{ fontWeight: 700 }}>Categories</span>
              <div className="chips">
                {active.map((c) => (
                  <button key={c.id} type="button" className="chip chip-sm chip-sage" aria-pressed={!excluded.has(c.id)}
                    onClick={() => setExcluded((x) => { const n = new Set(x); if (n.has(c.id)) n.delete(c.id); else n.add(c.id); return n })}>{c.name}</button>
                ))}
              </div>
            </div>
          )}
          {format === 'sheets' ? (
            <SheetsExport filter={filter} label={label} disabled={invalid} />
          ) : (
            <button type="button" className="btn btn-primary btn-xl" disabled={invalid || busy !== null} onClick={() => void run(format, filter, label)}>
              {busy ? <span className="spinner" /> : <Download {...ICON} />}Download {format === 'xlsx' ? 'Excel' : format.toUpperCase()}
            </button>
          )}
          <p className="muted" style={{ margin: 0, fontSize: 12.5 }}>
            Exports include date, merchant, title, category, description, total, tax, invoice number, payment method and status. {COPY.tagline}
          </p>
        </section>
      </div>
    </>
  )
}

export default function ExportPage() {
  return <Suspense><ExportView /></Suspense>
}
