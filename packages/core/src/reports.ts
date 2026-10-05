// Shapes the document_summary RPC result. Totals stay grouped by currency (no FX).
import { z } from 'zod'
import { toCents } from './money.ts'
import { ExpenseTypeSchema, type ExpenseType } from './schemas.ts'

export type CurrencyTotal = { currency: string; totalCents: number; taxCents: number; count: number; averageCents: number }
export type MonthTotal = { month: string; currency: string; totalCents: number }
export type CategoryTotal = { categoryId: string | null; name: string; currency: string; totalCents: number; taxCents: number; count: number }
export type TypeTotal = { expenseType: ExpenseType; currency: string; totalCents: number }
export type DayCount = { date: string; business: number; personal: number }
export type Summary = {
  currencies: CurrencyTotal[]
  byMonth: MonthTotal[]
  byCategory: CategoryTotal[]
  byType: TypeTotal[]
  byDay: DayCount[]
}

const num = z.number().nullable().transform((v) => v ?? 0)
const cents = num.transform(toCents)

const SummarySchema = z.object({
  currencies: z.array(z.object({ currency: z.string(), total: cents, tax: cents, count: num, average: cents })),
  by_month: z.array(z.object({ month: z.string(), currency: z.string(), total: cents })),
  by_category: z.array(z.object({
    category_id: z.string().nullable(), name: z.string(), currency: z.string(), total: cents, tax: cents, count: num,
  })),
  by_type: z.array(z.object({ expense_type: ExpenseTypeSchema, currency: z.string(), total: cents })),
  by_day: z.array(z.object({ date: z.string(), business: num, personal: num })),
})

const byTotalDesc = <T extends { totalCents: number }>(a: T, b: T) => b.totalCents - a.totalCents

export function parseSummary(json: unknown): Summary {
  const s = SummarySchema.parse(json)
  return {
    currencies: s.currencies
      .map((c) => ({ currency: c.currency, totalCents: c.total, taxCents: c.tax, count: c.count, averageCents: c.average }))
      .sort(byTotalDesc),
    byMonth: s.by_month.map((m) => ({ month: m.month, currency: m.currency, totalCents: m.total })),
    byCategory: s.by_category
      .map((c) => ({ categoryId: c.category_id, name: c.name, currency: c.currency, totalCents: c.total, taxCents: c.tax, count: c.count }))
      .sort(byTotalDesc),
    byType: s.by_type.map((t) => ({ expenseType: t.expense_type, currency: t.currency, totalCents: t.total })),
    byDay: s.by_day,
  }
}

export function totalsFor(s: Summary, currency: string): CurrencyTotal {
  return s.currencies.find((c) => c.currency === currency) ?? { currency, totalCents: 0, taxCents: 0, count: 0, averageCents: 0 }
}

export function otherCurrencies(s: Summary, primary: string): CurrencyTotal[] {
  return s.currencies.filter((c) => c.currency !== primary)
}

export function percentChange(cur: number, prev: number): number | null {
  return prev === 0 ? null : Math.round(((cur - prev) / prev) * 100)
}
