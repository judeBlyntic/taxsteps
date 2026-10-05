// Per-currency and per-category totals for report sheets/pages (integer cents; never mixes currencies).
import { toCents, type ExportDoc } from '../_shared/core.ts'

export type CurrencyRow = { currency: string; count: number; totalCents: number; taxCents: number }
export type CategoryRow = CurrencyRow & { category: string }

export function aggregate(docs: ExportDoc[]): { currencies: CurrencyRow[]; categories: CategoryRow[] } {
  const cur = new Map<string, CurrencyRow>()
  const cat = new Map<string, CategoryRow>()
  for (const d of docs) {
    const total = toCents(d.amount)
    const tax = d.tax_amount === null ? 0 : toCents(d.tax_amount)
    const c = cur.get(d.currency) ?? { currency: d.currency, count: 0, totalCents: 0, taxCents: 0 }
    c.count++; c.totalCents += total; c.taxCents += tax
    cur.set(d.currency, c)
    const name = d.category_name ?? 'Uncategorised'
    const key = `${name}\u0000${d.currency}`
    const k = cat.get(key) ?? { category: name, currency: d.currency, count: 0, totalCents: 0, taxCents: 0 }
    k.count++; k.totalCents += total; k.taxCents += tax
    cat.set(key, k)
  }
  const byTotal = (a: CurrencyRow, b: CurrencyRow) => b.totalCents - a.totalCents
  return { currencies: [...cur.values()].sort(byTotal), categories: [...cat.values()].sort(byTotal) }
}
