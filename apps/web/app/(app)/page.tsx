'use client'
import { useMemo, useState } from 'react'
import Link from 'next/link'
import { ArrowRight, ScanLine } from 'lucide-react'
import {
  COPY, formatMoney, formatMonth, lastNMonths, monthRange, otherCurrencies, percentChange, totalsFor,
} from '@taxsteps/core'
import { useCategories, useDocuments, useSummary } from '@taxsteps/data'
import { PageHeader } from '@/components/shell/PageHeader'
import { CategoryBars, MonthBars, ReceiptDays, RecentList, StatCard, TypeSplit } from '@/components/dashboard/widgets'
import { useDocumentDrawer } from '@/components/documents/DrawerContext'
import { ICON } from '@/components/ui/icons'
import { useToday } from '@/lib/use-today'

const ym = (d: string) => ({ year: Number(d.slice(0, 4)), month: Number(d.slice(5, 7)) })
const key = (y: number, m: number) => `${y}-${String(m).padStart(2, '0')}`

export default function DashboardPage() {
  const { today, profile, locale, currency, taxLabel } = useToday()
  const drawer = useDocumentDrawer()
  const [picked, setPicked] = useState<string | null>(null)
  const sel = ym(picked ?? today)
  const range = monthRange(sel.year, sel.month)
  const months = lastNMonths(`${key(sel.year, sel.month)}-01`, 6)
  const historyRange = { from: monthRange(months[0]!.year, months[0]!.month).from, to: range.to }
  const pickerMonths = lastNMonths(today, 24).reverse()

  const summary = useSummary(range)
  const history = useSummary(historyRange)
  const recent = useDocuments({})
  const { data: categories } = useCategories()
  const catMap = useMemo(() => new Map((categories ?? []).map((c) => [c.id, c])), [categories])

  const s = summary.data
  const totals = s ? totalsFor(s, currency) : undefined
  const monthTotals = new Map((history.data?.byMonth ?? []).filter((m) => m.currency === currency).map((m) => [m.month, m.totalCents]))
  const prev = months[months.length - 2]!
  const delta = totals ? percentChange(totals.totalCents, monthTotals.get(key(prev.year, prev.month)) ?? 0) : null
  const business = s?.byType.find((t) => t.expenseType === 'business' && t.currency === currency)?.totalCents ?? 0
  const personal = s?.byType.find((t) => t.expenseType === 'personal' && t.currency === currency)?.totalCents ?? 0
  const others = s ? otherCurrencies(s, currency) : []
  const greetingName = profile?.full_name?.split(' ')[0]
  const recentRows = recent.data?.pages[0]?.rows.slice(0, 5) ?? []
  const loading = summary.isLoading || !profile

  return (
    <>
      <PageHeader
        title={greetingName ? `Hi, ${greetingName}` : 'Dashboard'}
        subtitle={`Here’s where ${formatMonth(sel.year, sel.month, locale)}’s money went.`}
      />
      <div className="page-body stack" style={{ gap: 20 }} aria-busy={loading}>
        {summary.isError && <div className="banner banner-warn" role="alert">We couldn&apos;t load your summary. Please check your connection and refresh.</div>}

        <div className="dash-top">
          <div className="hero">
            <div className="hero-tab1" /><div className="hero-tab2" />
            <div className="hero-card">
              <div className="blob" style={{ width: 260, height: 260, right: -70, bottom: -100, background: 'var(--color-accent-2-200)' }} />
              <div className="blob" style={{ width: 74, height: 74, right: 110, bottom: 70, background: 'var(--color-accent-300)' }} />
              <label className="row" style={{ position: 'relative', gap: 4, fontSize: 14, fontWeight: 700, color: 'var(--color-neutral-700)' }}>
                <span className="sr-only">Month</span>
                <select value={key(sel.year, sel.month)} onChange={(e) => setPicked(`${e.target.value}-01`)}
                  style={{ all: 'unset', cursor: 'pointer', fontWeight: 700 }} aria-label="Choose month">
                  {pickerMonths.map((m) => <option key={key(m.year, m.month)} value={key(m.year, m.month)}>{formatMonth(m.year, m.month, locale)}</option>)}
                </select>
                <span aria-hidden>⌄</span>
              </label>
              <div className="big num" style={{ position: 'relative', fontSize: 'clamp(40px, 6vw, 64px)', marginTop: 12 }}>
                {totals ? formatMoney(totals.totalCents, currency, locale) : '—'}
              </div>
              <div className="muted" style={{ position: 'relative', fontSize: 15 }}>
                Total expenses{delta !== null && ` · ${delta >= 0 ? 'up' : 'down'} ${Math.abs(delta)}% on ${formatMonth(prev.year, prev.month, locale, 'short')}`}
              </div>
              {others.length > 0 && (
                <div className="muted num" style={{ position: 'relative', fontSize: 13, marginTop: 6 }}>
                  Also: {others.map((o) => formatMoney(o.totalCents, o.currency, locale)).join(' · ')}
                </div>
              )}
              <div className="grow" style={{ minHeight: 20 }} />
              <div className="row" style={{ position: 'relative', flexWrap: 'wrap' }}>
                <Link href="/scan" className="btn btn-dark btn-lg"><ScanLine {...ICON} />Scan receipt<ArrowRight {...ICON} /></Link>
                <Link href="/reports" className="btn btn-secondary btn-paper btn-lg">Monthly report</Link>
              </div>
            </div>
          </div>
          <StatCard tone="sage" title={`${taxLabel} total`} value={totals ? formatMoney(totals.taxCents, currency, locale) : '—'}
            sub={`From ${totals?.count ?? 0} documents`} />
          <StatCard tone="terra" title="Documents" value={String(totals?.count ?? 0)}
            sub={`Average ${formatMoney(totals?.averageCents ?? 0, currency, locale)}`} />
          <TypeSplit label="Business" tone="sage" partCents={business} totalCents={business + personal} currency={currency} locale={locale} />
          <TypeSplit label="Personal" tone="terra" partCents={personal} totalCents={business + personal} currency={currency} locale={locale} />
        </div>

        <div className="dash-2">
          <section className="tile stack" style={{ gap: 18 }} aria-labelledby="by-month">
            <div className="row" style={{ justifyContent: 'space-between', alignItems: 'baseline' }}>
              <h4 id="by-month">Expenses by month</h4><span className="muted" style={{ fontSize: 13 }}>Last 6 months · {currency}</span>
            </div>
            <MonthBars currency={currency} locale={locale} items={months.map((m) => ({
              label: formatMonth(m.year, m.month, locale, 'short'),
              cents: monthTotals.get(key(m.year, m.month)) ?? 0,
              current: m.year === sel.year && m.month === sel.month,
            }))} />
          </section>
          <section className="tile stack" style={{ gap: 14 }} aria-labelledby="by-cat">
            <h4 id="by-cat">By category</h4>
            <CategoryBars currency={currency} locale={locale}
              items={(s?.byCategory ?? []).filter((c) => c.currency === currency).slice(0, 5).map((c) => ({ name: c.name, cents: c.totalCents }))} />
          </section>
        </div>

        <div className="dash-2">
          <section className="tile" style={{ padding: '24px 16px 12px' }} aria-labelledby="recent">
            <div className="row" style={{ justifyContent: 'space-between', alignItems: 'baseline', padding: '0 8px 8px' }}>
              <h4 id="recent">Recent documents</h4>
              <Link href="/documents" className="btn btn-ghost" style={{ fontSize: 14 }}>See all</Link>
            </div>
            {recent.isError
              ? <div className="banner banner-warn" role="alert">We couldn&apos;t load your documents.</div>
              : <RecentList rows={recentRows} categories={catMap} locale={locale} today={today} onOpen={drawer.openExisting} />}
          </section>
          <section className="tile stack" style={{ gap: 12 }} aria-labelledby="days">
            <div className="row" style={{ justifyContent: 'space-between', alignItems: 'baseline', flexWrap: 'wrap' }}>
              <h4 id="days">Receipt days</h4>
              <div className="legend"><span><i style={{ background: 'var(--color-accent-2-400)' }} />Business</span><span><i style={{ background: 'var(--color-accent-400)' }} />Personal</span></div>
            </div>
            <ReceiptDays year={sel.year} month={sel.month} days={s?.byDay ?? []} locale={locale} />
          </section>
        </div>

        <p className="muted" style={{ margin: 0, fontSize: 12.5 }}>{COPY.tagline}</p>
      </div>
    </>
  )
}
