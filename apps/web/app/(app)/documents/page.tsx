'use client'
import { Suspense, useMemo, useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { Download, Plus, SlidersHorizontal, X } from 'lucide-react'
import { formatMoney, toCents, type DocumentFilter } from '@taxsteps/core'
import { useCategories, useDocuments } from '@taxsteps/data'
import { PageHeader } from '@/components/shell/PageHeader'
import { DocumentTable } from '@/components/documents/DocumentTable'
import { FilterPanel, quickPeriods } from '@/components/documents/FilterPanel'
import { useDocumentDrawer } from '@/components/documents/DrawerContext'
import { ICON } from '@/components/ui/icons'
import { filterFromSearchParams, filterToSearchParams } from '@/lib/filter-url'
import { useToday } from '@/lib/use-today'

function DocumentsView() {
  const router = useRouter()
  const pathname = usePathname()
  const params = useSearchParams()
  const filter = useMemo(() => filterFromSearchParams(params), [params])
  const { today, locale, fy } = useToday()
  const drawer = useDocumentDrawer()
  const { data: categories } = useCategories()
  const catMap = useMemo(() => new Map((categories ?? []).map((c) => [c.id, c])), [categories])
  const docs = useDocuments(filter)
  const [showFilters, setShowFilters] = useState(false)
  const [selected, setSelected] = useState<Set<string>>(new Set())

  const setFilter = (f: DocumentFilter) => {
    setSelected(new Set())
    const qs = filterToSearchParams(f).toString()
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false })
  }
  const rows = docs.data?.pages.flatMap((p) => p.rows) ?? []
  const sums = new Map<string, number>()
  for (const r of rows) sums.set(r.currency, (sums.get(r.currency) ?? 0) + toCents(r.amount))
  const periods = quickPeriods(today, fy)
  const activePeriod = periods.find((p) => p.from === filter.from && p.to === filter.to)?.id
  const activeCount = Object.keys(filter).length

  const toggle = (id: string) => setSelected((s) => { const n = new Set(s); if (n.has(id)) n.delete(id); else n.add(id); return n })

  return (
    <>
      <PageHeader title="Documents" subtitle="Every receipt and invoice across your devices." actions={
        <button type="button" className="btn btn-primary btn-lg" onClick={() => drawer.openNew()}><Plus {...ICON} /><span className="hide-mobile">Add manually</span></button>
      } />
      <div className="page-body stack">
        <div className="row" style={{ flexWrap: 'wrap', gap: 8 }}>
          <div className="chips" style={{ flexWrap: 'nowrap', overflowX: 'auto', maxWidth: '100%' }}>
            <button type="button" className="chip" aria-pressed={!filter.from && !filter.to} onClick={() => setFilter({ ...filter, from: undefined, to: undefined })}>All time</button>
            {periods.map((p) => (
              <button key={p.id} type="button" className="chip" aria-pressed={activePeriod === p.id} onClick={() => setFilter({ ...filter, from: p.from, to: p.to })}>{p.label}</button>
            ))}
          </div>
          <button type="button" className="chip" aria-expanded={showFilters} onClick={() => setShowFilters((v) => !v)}>
            <SlidersHorizontal {...ICON} width={16} height={16} />Filters{activeCount ? ` (${activeCount})` : ''}
          </button>
          {activeCount > 0 && <button type="button" className="btn btn-ghost" onClick={() => setFilter({})}><X {...ICON} />Clear</button>}
        </div>

        {showFilters && categories && <FilterPanel key={activeCount === 0 ? 'empty' : 'set'} filter={filter} onChange={setFilter} categories={categories} today={today} locale={locale} />}

        <div className="row" style={{ flexWrap: 'wrap', justifyContent: 'space-between' }}>
          <span className="muted num" style={{ fontSize: 14 }}>
            {rows.length}{docs.hasNextPage ? '+' : ''} documents · {[...sums].map(([c, v]) => formatMoney(v, c, locale)).join(' · ') || formatMoney(0, 'USD', locale)}
          </span>
          {selected.size > 0 && (
            <Link className="btn btn-dark" href={`/export?ids=${[...selected].join(',')}`}><Download {...ICON} />Export selected ({selected.size})</Link>
          )}
        </div>

        <div className="tile" style={{ padding: '10px 14px' }}>
          {docs.isError && <div className="banner banner-warn" role="alert">We couldn&apos;t load your documents. Please check your connection.</div>}
          {docs.isLoading && <div className="empty"><span className="spinner" style={{ display: 'inline-block' }} /></div>}
          {!docs.isLoading && rows.length === 0 && !docs.isError && (
            <div className="empty">{activeCount ? 'No documents match these filters.' : 'No documents yet — scan your first receipt.'}</div>
          )}
          {rows.length > 0 && (
            <DocumentTable rows={rows} categories={catMap} locale={locale} today={today} selected={selected} onToggle={toggle} onOpen={drawer.openExisting} />
          )}
          {docs.hasNextPage && (
            <div className="row" style={{ justifyContent: 'center', padding: 12 }}>
              <button type="button" className="btn btn-secondary btn-lg" onClick={() => void docs.fetchNextPage()} disabled={docs.isFetchingNextPage}>
                {docs.isFetchingNextPage ? 'Loading…' : 'Load more'}
              </button>
            </div>
          )}
        </div>
      </div>
    </>
  )
}

export default function DocumentsPage() {
  return <Suspense><DocumentsView /></Suspense>
}
