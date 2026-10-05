'use client'
import { formatMoney, formatShortDate, monthRange, type Category, type DayCount, type DocumentRow } from '@taxsteps/core'
import { CategoryDot, StatusTag } from '@/components/documents/DocumentRowBits'

const pct = (part: number, whole: number) => (whole > 0 ? Math.round((part / whole) * 100) : 0)

export function StatCard({ tone, title, value, sub }: { tone: 'sage' | 'terra'; title: string; value: string; sub: string }) {
  const sage = tone === 'sage'
  return (
    <div className={`tile stat ${sage ? 'tile-sage' : 'tile-terra'}`}>
      <div className="blob" style={{ width: 100, height: 100, right: -30, top: -30, background: sage ? 'var(--color-accent-2-400)' : 'var(--color-accent-300)' }} />
      <span style={{ fontWeight: 700 }}>{title}</span>
      <div>
        <div className="big num" style={{ fontSize: 34 }}>{value}</div>
        <div style={{ fontSize: 13, marginTop: 4 }}>{sub}</div>
      </div>
    </div>
  )
}

export function TypeSplit({ label, partCents, totalCents, currency, locale, tone }: {
  label: string; partCents: number; totalCents: number; currency: string; locale: string; tone: 'sage' | 'terra'
}) {
  const p = pct(partCents, totalCents)
  const ink = tone === 'sage' ? 'var(--color-accent-2-600)' : 'var(--color-accent-500)'
  const track = tone === 'sage' ? 'var(--color-accent-2-200)' : 'var(--color-accent-200)'
  return (
    <div className="tile row" style={{ gap: 16, padding: 20, borderRadius: 30 }}>
      <div className="donut" role="img" aria-label={`${label} ${p}%`} style={{ background: `conic-gradient(${ink} 0 ${p}%, ${track} 0)` }} />
      <div>
        <div style={{ fontWeight: 700 }}>{label}</div>
        <div className="big" style={{ fontSize: 26, lineHeight: 1.1 }}>{p}%</div>
        <div className="muted num" style={{ fontSize: 13 }}>{formatMoney(partCents, currency, locale)}</div>
      </div>
    </div>
  )
}

export function MonthBars({ items, currency, locale }: { items: { label: string; cents: number; current: boolean }[]; currency: string; locale: string }) {
  const max = Math.max(1, ...items.map((i) => i.cents))
  return (
    <div className="bars" role="img" aria-label={items.map((i) => `${i.label} ${formatMoney(i.cents, currency, locale)}`).join(', ')}>
      {items.map((i) => (
        <div key={i.label} className="bar-col">
          <span className="muted num" style={{ fontSize: 12, fontWeight: 700 }}>
            {new Intl.NumberFormat(locale, { style: 'currency', currency, notation: 'compact', maximumFractionDigits: 1 }).format(i.cents / 100)}
          </span>
          <div className={`bar ${i.current ? 'current' : ''}`} style={{ height: `${Math.round((i.cents / max) * 130)}px` }} />
          <span style={{ fontSize: 13, fontWeight: 600 }}>{i.label}</span>
        </div>
      ))}
    </div>
  )
}

const BAR_COLORS = ['var(--color-accent-2-500)', 'var(--color-accent-500)', 'var(--color-accent-2-400)', 'var(--color-accent-400)', 'var(--color-neutral-500)']

export function CategoryBars({ items, currency, locale }: { items: { name: string; cents: number }[]; currency: string; locale: string }) {
  const max = Math.max(1, ...items.map((i) => i.cents))
  if (!items.length) return <p className="muted" style={{ margin: 0 }}>No expenses in this period yet.</p>
  return (
    <div className="stack" style={{ gap: 14 }}>
      {items.map((c, k) => (
        <div key={c.name} className="row" style={{ gap: 12 }}>
          <span style={{ width: 130, fontSize: 14, fontWeight: 600 }}>{c.name}</span>
          <div className="hbar"><span style={{ width: `${Math.round((c.cents / max) * 100)}%`, background: BAR_COLORS[k % BAR_COLORS.length] }} /></div>
          <span className="num" style={{ width: 96, textAlign: 'right', fontSize: 14 }}>{formatMoney(c.cents, currency, locale)}</span>
        </div>
      ))}
    </div>
  )
}

export function RecentList({ rows, categories, locale, today, onOpen }: {
  rows: DocumentRow[]; categories: Map<string, Category>; locale: string; today: string; onOpen: (row: DocumentRow) => void
}) {
  if (!rows.length) return <div className="empty">No documents yet — scan your first receipt.</div>
  return (
    <div className="stack" style={{ gap: 2 }}>
      {rows.map((r) => {
        const cat = r.category_id ? categories.get(r.category_id) : undefined
        return (
          <button key={r.id} type="button" className="list-row" onClick={() => onOpen(r)}>
            <CategoryDot category={cat} />
            <span className="grow">
              <span className="title" style={{ display: 'block' }}>{r.merchant_name}</span>
              <span className="sub">{[r.title, cat?.name ?? 'Uncategorised'].filter(Boolean).join(' · ')}</span>
            </span>
            <span className="sub hide-mobile" style={{ width: 70 }}>{formatShortDate(r.transaction_date, locale, today)}</span>
            <span className="hide-mobile"><StatusTag status={r.status} /></span>
            <span style={{ textAlign: 'right' }}>
              <span className="amt" style={{ display: 'block' }}>{formatMoney(Math.round(r.amount * 100), r.currency, locale)}</span>
              {r.tax_amount !== null && <span className="sub num">{r.tax_label ?? 'Tax'} {formatMoney(Math.round(r.tax_amount * 100), r.currency, locale)}</span>}
            </span>
          </button>
        )
      })}
    </div>
  )
}

export function ReceiptDays({ year, month, days, locale }: { year: number; month: number; days: DayCount[]; locale: string }) {
  const { to } = monthRange(year, month)
  const count = Number(to.slice(8))
  const offset = (new Date(Date.UTC(year, month - 1, 1)).getUTCDay() + 6) % 7 // Monday-first
  const byDay = new Map(days.map((d) => [Number(d.date.slice(8)), d]))
  const weekdays = Array.from({ length: 7 }, (_, i) =>
    new Intl.DateTimeFormat(locale, { weekday: 'short', timeZone: 'UTC' }).format(new Date(Date.UTC(2026, 9, 5 + i))))
  return (
    <div className="cal">
      {weekdays.map((w) => <span key={w} className="muted" style={{ fontSize: 12 }}>{w}</span>)}
      {Array.from({ length: offset }, (_, i) => <span key={`pad${i}`} />)}
      {Array.from({ length: count }, (_, i) => {
        const d = byDay.get(i + 1)
        const kind = d ? (d.business >= d.personal ? 'business' : 'personal') : undefined
        return (
          <span key={i} className="cal-day" data-kind={kind} title={d ? `${d.business + d.personal} documents` : undefined}>{i + 1}</span>
        )
      })}
    </div>
  )
}
