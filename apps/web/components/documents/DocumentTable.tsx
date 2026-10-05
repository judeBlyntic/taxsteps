'use client'
import { formatMoney, formatShortDate, toCents, type Category, type DocumentRow } from '@taxsteps/core'
import { CategoryDot, StatusTag, TypeTag } from './DocumentRowBits'

type Props = {
  rows: DocumentRow[]
  categories: Map<string, Category>
  locale: string
  today: string
  selected: Set<string>
  onToggle: (id: string) => void
  onOpen: (row: DocumentRow) => void
}

const money = (v: number | null, currency: string, locale: string) => (v === null ? '—' : formatMoney(toCents(v), currency, locale))

export function DocumentTable({ rows, categories, locale, today, selected, onToggle, onOpen }: Props) {
  return (
    <>
      <table className="doc-table hide-mobile">
        <thead>
          <tr>
            <th style={{ width: 36 }}><span className="sr-only">Select</span></th>
            <th style={{ width: 52 }} />
            <th>Merchant</th><th>Category</th><th>Date</th><th>Type</th><th>Status</th>
            <th className="right">Tax</th><th className="right">Total</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => {
            const cat = r.category_id ? categories.get(r.category_id) : undefined
            return (
              <tr key={r.id} onClick={() => onOpen(r)}>
                <td onClick={(e) => e.stopPropagation()}>
                  <input type="checkbox" aria-label={`Select ${r.merchant_name}`} checked={selected.has(r.id)} onChange={() => onToggle(r.id)} />
                </td>
                <td><CategoryDot category={cat} /></td>
                <td>
                  <button type="button" className="list-row" style={{ padding: 0 }} onClick={(e) => { e.stopPropagation(); onOpen(r) }}>
                    <span><span className="title" style={{ display: 'block' }}>{r.merchant_name}</span>
                      <span className="sub">{[r.title, r.invoice_number && `#${r.invoice_number}`].filter(Boolean).join(' · ')}</span></span>
                  </button>
                </td>
                <td>{cat?.name ?? <span className="muted">Uncategorised</span>}</td>
                <td className="muted">{formatShortDate(r.transaction_date, locale, today)}</td>
                <td><TypeTag type={r.expense_type} /></td>
                <td><StatusTag status={r.status} /></td>
                <td className="right num">{money(r.tax_amount, r.currency, locale)}</td>
                <td className="right num" style={{ fontWeight: 700 }}>{money(r.amount, r.currency, locale)}</td>
              </tr>
            )
          })}
        </tbody>
      </table>

      <div className="stack show-mobile" style={{ gap: 2 }}>
        {rows.map((r) => {
          const cat = r.category_id ? categories.get(r.category_id) : undefined
          return (
            <button key={r.id} type="button" className="list-row" onClick={() => onOpen(r)}>
              <CategoryDot category={cat} size={46} />
              <span className="grow">
                <span className="title" style={{ display: 'block' }}>{r.merchant_name}</span>
                <span className="sub">{cat?.name ?? 'Uncategorised'} · {formatShortDate(r.transaction_date, locale, today)}</span>
              </span>
              <span style={{ textAlign: 'right' }}>
                <span className="amt" style={{ display: 'block' }}>{money(r.amount, r.currency, locale)}</span>
                <span className="sub">{r.status === 'needs_review' ? 'Needs review' : r.expense_type === 'business' ? 'Business' : 'Personal'}</span>
              </span>
            </button>
          )
        })}
      </div>
    </>
  )
}
