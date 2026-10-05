'use client'
import { DOCUMENT_TYPES, financialYearRange, formatMonth, lastNMonths, monthRange, yearRange, type Category, type DocumentFilter, type PeriodSpec } from '@taxsteps/core'
import { SelectField, TextField } from '@/components/ui/Field'

type Fy = { fyStartMonth: number; fyStartDay: number }

export type QuickPeriod = { id: string; label: string; from: string; to: string; spec: PeriodSpec }

export function quickPeriods(today: string, fy: Fy): QuickPeriod[] {
  const [cur, prev] = [lastNMonths(today, 2)[1]!, lastNMonths(today, 2)[0]!]
  const thisFy = financialYearRange(today, fy.fyStartMonth, fy.fyStartDay)
  const lastFyDate = `${Number(thisFy.from.slice(0, 4)) - 1}${thisFy.from.slice(4)}`
  const lastFy = financialYearRange(lastFyDate, fy.fyStartMonth, fy.fyStartDay)
  const year = Number(today.slice(0, 4))
  return [
    { id: 'this-month', label: 'This month', ...monthRange(cur.year, cur.month), spec: { kind: 'month', ...cur } },
    { id: 'last-month', label: 'Last month', ...monthRange(prev.year, prev.month), spec: { kind: 'month', ...prev } },
    { id: 'this-fy', label: 'This financial year', ...thisFy, spec: { kind: 'fy', date: thisFy.from } },
    { id: 'last-fy', label: 'Last financial year', ...lastFy, spec: { kind: 'fy', date: lastFy.from } },
    { id: 'this-year', label: String(year), ...yearRange(year), spec: { kind: 'year', year } },
  ]
}

const num = (v: string) => (v.trim() === '' || !Number.isFinite(Number(v)) ? undefined : Number(v))

export function FilterPanel({ filter, onChange, categories, today, locale }: {
  filter: DocumentFilter; onChange: (f: DocumentFilter) => void; categories: Category[]; today: string; locale: string
}) {
  const set = (patch: Partial<DocumentFilter>) => {
    const next = { ...filter, ...patch }
    for (const k of Object.keys(next) as (keyof DocumentFilter)[]) if (next[k] === undefined || next[k] === '') delete next[k]
    onChange(next)
  }
  const months = lastNMonths(today, 36).reverse()
  const monthValue = filter.from && filter.to && filter.from.endsWith('-01') && monthRange(Number(filter.from.slice(0, 4)), Number(filter.from.slice(5, 7))).to === filter.to
    ? filter.from.slice(0, 7) : ''
  const years = Array.from({ length: 8 }, (_, i) => Number(today.slice(0, 4)) - i)

  return (
    <div className="tile stack" style={{ gap: 14 }}>
      <div className="field-grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(170px, 1fr))' }}>
        <TextField label="From" type="date" value={filter.from ?? ''} onChange={(e) => set({ from: e.target.value || undefined })} />
        <TextField label="To" type="date" value={filter.to ?? ''} onChange={(e) => set({ to: e.target.value || undefined })} />
        <SelectField label="Month" value={monthValue} onChange={(e) => {
          if (!e.target.value) return set({ from: undefined, to: undefined })
          const [y, m] = e.target.value.split('-').map(Number)
          set(monthRange(y!, m!))
        }}>
          <option value="">Any month</option>
          {months.map((m) => <option key={`${m.year}-${m.month}`} value={`${m.year}-${String(m.month).padStart(2, '0')}`}>{formatMonth(m.year, m.month, locale)}</option>)}
        </SelectField>
        <SelectField label="Year" value={filter.from && filter.to && filter.from.endsWith('-01-01') && filter.to === `${filter.from.slice(0, 4)}-12-31` ? filter.from.slice(0, 4) : ''}
          onChange={(e) => (e.target.value ? set(yearRange(Number(e.target.value))) : set({ from: undefined, to: undefined }))}>
          <option value="">Any year</option>
          {years.map((y) => <option key={y} value={y}>{y}</option>)}
        </SelectField>
        <TextField label="Merchant" defaultValue={filter.merchant ?? ''} onBlur={(e) => set({ merchant: e.target.value.trim() || undefined })}
          onKeyDown={(e) => { if (e.key === 'Enter') e.currentTarget.blur() }} />
        <SelectField label="Category" value={filter.categoryIds?.[0] ?? ''} onChange={(e) => set({ categoryIds: e.target.value ? [e.target.value] : undefined })}>
          <option value="">All categories</option>
          {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </SelectField>
        <SelectField label="Document type" value={filter.documentType ?? ''} onChange={(e) => set({ documentType: (e.target.value || undefined) as DocumentFilter['documentType'] })}>
          <option value="">All types</option>
          {DOCUMENT_TYPES.map((t) => <option key={t.code} value={t.code}>{t.label}</option>)}
        </SelectField>
        <SelectField label="Business / personal" value={filter.expenseType ?? ''} onChange={(e) => set({ expenseType: (e.target.value || undefined) as DocumentFilter['expenseType'] })}>
          <option value="">Both</option><option value="business">Business</option><option value="personal">Personal</option>
        </SelectField>
        <SelectField label="Status" value={filter.status ?? ''} onChange={(e) => set({ status: (e.target.value || undefined) as DocumentFilter['status'] })}>
          <option value="">Any status</option><option value="complete">Complete</option><option value="needs_review">Needs review</option>
        </SelectField>
        <TextField label="Total over" inputMode="decimal" defaultValue={filter.minAmount ?? ''} onBlur={(e) => set({ minAmount: num(e.target.value) })} />
        <TextField label="Total under" inputMode="decimal" defaultValue={filter.maxAmount ?? ''} onBlur={(e) => set({ maxAmount: num(e.target.value) })} />
        <TextField label="Tax over" inputMode="decimal" defaultValue={filter.minTax ?? ''} onBlur={(e) => set({ minTax: num(e.target.value) })} />
        <TextField label="Tax under" inputMode="decimal" defaultValue={filter.maxTax ?? ''} onBlur={(e) => set({ maxTax: num(e.target.value) })} />
      </div>
    </div>
  )
}
