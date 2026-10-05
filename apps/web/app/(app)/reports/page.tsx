'use client'
import { useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import {
  COPY, financialYearRange, formatMoney, formatMonth, periodLabel, resolvePeriod, type DocumentFilter, type PeriodSpec,
} from '@taxsteps/core'
import { useCategories, useSummary } from '@taxsteps/data'
import { PageHeader } from '@/components/shell/PageHeader'
import { ExportTiles } from '@/components/reports/ExportTiles'
import { TextField } from '@/components/ui/Field'
import { ICON } from '@/components/ui/icons'
import { useToday } from '@/lib/use-today'

type Kind = 'month' | 'year' | 'fy' | 'custom'

export default function ReportsPage() {
  const { today, locale, currency, taxLabel, fy, profile } = useToday()
  const { data: categories } = useCategories()
  const [kind, setKind] = useState<Kind>('month')
  const [anchor, setAnchor] = useState<{ year: number; month: number } | null>(null)
  const [custom, setCustom] = useState({ from: '', to: '' })
  const [excluded, setExcluded] = useState<Set<string>>(new Set())
  const [type, setType] = useState<'all' | 'business' | 'personal'>('all')

  const a = anchor ?? { year: Number(today.slice(0, 4)), month: Number(today.slice(5, 7)) }
  const fyNow = financialYearRange(`${a.year}-${String(a.month).padStart(2, '0')}-01`, fy.fyStartMonth, fy.fyStartDay)
  const spec: PeriodSpec =
    kind === 'month' ? { kind: 'month', year: a.year, month: a.month }
      : kind === 'year' ? { kind: 'year', year: a.year }
        : kind === 'fy' ? { kind: 'fy', date: fyNow.from }
          : custom.from && custom.to ? { kind: 'custom', from: custom.from, to: custom.to } : { kind: 'month', year: a.year, month: a.month }
  const range = resolvePeriod(spec, fy)
  const label = periodLabel(spec, fy, locale)

  const activeCats = (categories ?? []).filter((c) => !c.archived)
  const filter: DocumentFilter = {
    ...(range ?? {}),
    ...(excluded.size ? { categoryIds: activeCats.filter((c) => !excluded.has(c.id)).map((c) => c.id) } : {}),
    ...(type !== 'all' ? { expenseType: type } : {}),
  }
  const summary = useSummary(range, { ...filter, from: undefined, to: undefined })
  const s = summary.data

  function step(dir: -1 | 1) {
    const span = kind === 'month' ? 1 : 12
    const idx = a.year * 12 + (a.month - 1) + dir * span
    setAnchor({ year: Math.floor(idx / 12), month: (idx % 12) + 1 })
  }

  const multiCurrency = (s?.currencies.length ?? 0) > 1
  const sheetsQs = new URLSearchParams({ format: 'sheets', ...(range ? { from: range.from, to: range.to } : {}) }).toString()

  return (
    <>
      <PageHeader title="Reports" subtitle="Build a summary, then export it for your accountant." />
      <div className="page-body reports-grid">
        <aside className="tile stack" style={{ gap: 20 }} aria-label="Report options">
          <div className="stack" style={{ gap: 8 }}>
            <span style={{ fontWeight: 700, fontSize: 14 }}>Period</span>
            <div className="segmented" role="group" aria-label="Period">
              {([['month', 'Month'], ['year', 'Year'], ['fy', 'FY'], ['custom', 'Custom']] as const).map(([k, l]) => (
                <button key={k} type="button" aria-pressed={kind === k} onClick={() => setKind(k)}>{l}</button>
              ))}
            </div>
            {kind === 'custom' ? (
              <div className="field-grid">
                <TextField label="From" type="date" value={custom.from} onChange={(e) => setCustom((c) => ({ ...c, from: e.target.value }))} />
                <TextField label="To" type="date" value={custom.to} onChange={(e) => setCustom((c) => ({ ...c, to: e.target.value }))} />
              </div>
            ) : (
              <div className="row" style={{ justifyContent: 'space-between' }}>
                <button type="button" className="btn btn-secondary btn-icon round" aria-label="Previous period" onClick={() => step(-1)}><ChevronLeft {...ICON} /></button>
                <b>{kind === 'month' ? formatMonth(a.year, a.month, locale) : label}</b>
                <button type="button" className="btn btn-secondary btn-icon round" aria-label="Next period" onClick={() => step(1)}><ChevronRight {...ICON} /></button>
              </div>
            )}
          </div>
          <div className="stack" style={{ gap: 8 }}>
            <span style={{ fontWeight: 700, fontSize: 14 }}>Categories</span>
            <div className="chips">
              {activeCats.map((c) => (
                <button key={c.id} type="button" className="chip chip-sm chip-sage" aria-pressed={!excluded.has(c.id)}
                  onClick={() => setExcluded((x) => { const n = new Set(x); if (n.has(c.id)) n.delete(c.id); else n.add(c.id); return n })}>{c.name}</button>
              ))}
            </div>
          </div>
          <div className="stack" style={{ gap: 8 }}>
            <span style={{ fontWeight: 700, fontSize: 14 }}>Type</span>
            <div className="segmented" role="group" aria-label="Type">
              {(['all', 'business', 'personal'] as const).map((t) => (
                <button key={t} type="button" aria-pressed={type === t} onClick={() => setType(t)}>{t[0]!.toUpperCase() + t.slice(1)}</button>
              ))}
            </div>
          </div>
        </aside>

        <div className="stack">
          <section className="tile stack" style={{ gap: 20, padding: 30 }} aria-busy={summary.isLoading}>
            <div className="row" style={{ justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap' }}>
              <div>
                <div className="kicker">Expense summary</div>
                <h3 style={{ margin: '6px 0 2px' }}>{profile?.business_name || profile?.full_name || 'Your expenses'}</h3>
                <div className="muted" style={{ fontSize: 14 }}>{label}{range && ` · ${range.from} to ${range.to}`}</div>
              </div>
              {s && <span className="tag tag-accent-2" style={{ fontWeight: 700 }}>{s.currencies.reduce((n, c) => n + c.count, 0)} documents</span>}
            </div>
            {summary.isError && <div className="banner banner-warn" role="alert">We couldn&apos;t load this report.</div>}
            {(s?.currencies.length ? s.currencies : [{ currency, totalCents: 0, taxCents: 0, count: 0, averageCents: 0 }]).map((c) => (
              <div key={c.currency} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 12 }}>
                <div className="tile tile-sage" style={{ padding: 18, borderRadius: 26 }}>
                  <div style={{ fontSize: 13, fontWeight: 700 }}>Total expenses{multiCurrency ? ` · ${c.currency}` : ''}</div>
                  <div className="big num" style={{ fontSize: 30, marginTop: 6 }}>{formatMoney(c.totalCents, c.currency, locale)}</div>
                </div>
                <div className="tile tile-terra" style={{ padding: 18, borderRadius: 26 }}>
                  <div style={{ fontSize: 13, fontWeight: 700 }}>{taxLabel}</div>
                  <div className="big num" style={{ fontSize: 30, marginTop: 6 }}>{formatMoney(c.taxCents, c.currency, locale)}</div>
                </div>
                <div className="tile tile-surface" style={{ padding: 18, borderRadius: 26 }}>
                  <div style={{ fontSize: 13, fontWeight: 700 }}>Documents</div>
                  <div className="big num" style={{ fontSize: 30, marginTop: 6 }}>{c.count}</div>
                </div>
              </div>
            ))}
            <table className="table">
              <thead><tr><th>Category</th>{multiCurrency && <th>Currency</th>}<th>Documents</th><th style={{ textAlign: 'right' }}>{taxLabel}</th><th style={{ textAlign: 'right' }}>Total</th></tr></thead>
              <tbody>
                {(s?.byCategory ?? []).map((c) => (
                  <tr key={`${c.categoryId}-${c.currency}`}>
                    <td style={{ fontWeight: 600 }}>{c.name}</td>{multiCurrency && <td>{c.currency}</td>}<td>{c.count}</td>
                    <td className="num" style={{ textAlign: 'right' }}>{formatMoney(c.taxCents, c.currency, locale)}</td>
                    <td className="num" style={{ textAlign: 'right', fontWeight: 700 }}>{formatMoney(c.totalCents, c.currency, locale)}</td>
                  </tr>
                ))}
                {s && s.byCategory.length === 0 && <tr><td colSpan={5} className="muted">No documents in this period.</td></tr>}
              </tbody>
            </table>
            {(kind === 'year' || kind === 'fy') && s && s.byMonth.length > 0 && (
              <table className="table">
                <thead><tr><th>Month</th>{multiCurrency && <th>Currency</th>}<th style={{ textAlign: 'right' }}>Total</th></tr></thead>
                <tbody>
                  {s.byMonth.map((m) => (
                    <tr key={`${m.month}-${m.currency}`}>
                      <td>{formatMonth(Number(m.month.slice(0, 4)), Number(m.month.slice(5, 7)), locale)}</td>
                      {multiCurrency && <td>{m.currency}</td>}
                      <td className="num" style={{ textAlign: 'right' }}>{formatMoney(m.totalCents, m.currency, locale)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
            <p className="muted" style={{ margin: 0, fontSize: 12.5 }}>{COPY.disclaimer}</p>
          </section>
          <ExportTiles filter={filter} label={label} sheetsHref={`/export?${sheetsQs}`} />
        </div>
      </div>
    </>
  )
}
