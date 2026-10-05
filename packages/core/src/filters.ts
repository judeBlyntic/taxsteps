// Document filters: one shape used by list views (PostgREST), summaries (RPC) and exports.
import { z } from 'zod'
import { financialYearRange, fyLabel, isISODate, monthRange, yearRange, type DateRange, type ISODate } from './dates.ts'
import { DocumentStatusSchema, DocumentTypeCodeSchema, ExpenseTypeSchema } from './schemas.ts'

const IsoDateSchema = z.string().refine(isISODate, 'Invalid date')
const Amount = z.number().min(0)

export const DocumentFilterSchema = z.object({
  from: IsoDateSchema.optional(),
  to: IsoDateSchema.optional(),
  search: z.string().max(100).optional(),
  merchant: z.string().max(200).optional(),
  categoryIds: z.array(z.uuid()).max(100).optional(),
  documentType: DocumentTypeCodeSchema.optional(),
  expenseType: ExpenseTypeSchema.optional(),
  status: DocumentStatusSchema.optional(),
  minAmount: Amount.optional(),
  maxAmount: Amount.optional(),
  minTax: Amount.optional(),
  maxTax: Amount.optional(),
  ids: z.array(z.uuid()).max(10_000).optional(),
})
export type DocumentFilter = z.infer<typeof DocumentFilterSchema>

export const ExportRequestSchema = z.object({
  format: z.enum(['csv', 'xlsx', 'pdf']),
  filter: DocumentFilterSchema,
  label: z.string().trim().min(1).max(120),
})
export type ExportRequest = z.infer<typeof ExportRequestSchema>
export type ExportFormat = ExportRequest['format']

export type PeriodSpec =
  | { kind: 'month'; year: number; month: number }
  | { kind: 'year'; year: number }
  | { kind: 'fy'; date: ISODate }
  | { kind: 'custom'; from: ISODate; to: ISODate }
  | { kind: 'all' }

type FyStart = { fyStartMonth: number; fyStartDay: number }

export function resolvePeriod(p: PeriodSpec, fy: FyStart): DateRange | null {
  switch (p.kind) {
    case 'month': return monthRange(p.year, p.month)
    case 'year': return yearRange(p.year)
    case 'fy': return financialYearRange(p.date, fy.fyStartMonth, fy.fyStartDay)
    case 'custom': return { from: p.from, to: p.to }
    case 'all': return null
  }
}

const utc = (d: ISODate) => new Date(`${d}T00:00:00Z`)

export function periodLabel(p: PeriodSpec, fy: FyStart, locale: string = 'en-US'): string {
  switch (p.kind) {
    case 'month':
      return new Intl.DateTimeFormat(locale, { month: 'long', year: 'numeric', timeZone: 'UTC' }).format(new Date(Date.UTC(p.year, p.month - 1, 1)))
    case 'year': return String(p.year)
    case 'fy': return fyLabel(financialYearRange(p.date, fy.fyStartMonth, fy.fyStartDay))
    case 'custom': {
      const fmt = new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' })
      return `${fmt.format(utc(p.from))} – ${fmt.format(utc(p.to))}`
    }
    case 'all': return 'All time'
  }
}

/** The subset of the PostgREST filter builder we rely on (each method returns the builder). */
export interface FilterableQuery<Q> {
  gte(column: string, value: unknown): Q
  lte(column: string, value: unknown): Q
  lt(column: string, value: unknown): Q
  eq(column: string, value: unknown): Q
  in(column: string, values: unknown[]): Q
  ilike(column: string, pattern: string): Q
  or(filters: string): Q
}

/** Escapes LIKE wildcards and drops characters that would break PostgREST filter syntax. */
export function escapeLike(s: string): string {
  return s.replace(/[,()"*]/g, '').replace(/[\\%_]/g, (c) => `\\${c}`)
}

export function applyDocumentFilter<Q extends FilterableQuery<Q>>(q: Q, f: DocumentFilter): Q {
  let r = q
  if (f.from) r = r.gte('transaction_date', f.from)
  if (f.to) r = r.lte('transaction_date', f.to)
  if (f.ids) r = r.in('id', f.ids)
  if (f.categoryIds?.length) r = r.in('category_id', f.categoryIds)
  if (f.documentType) r = r.eq('document_type', f.documentType)
  if (f.expenseType) r = r.eq('expense_type', f.expenseType)
  if (f.status) r = r.eq('status', f.status)
  const merchant = f.merchant ? escapeLike(f.merchant.trim()) : ''
  if (merchant) r = r.ilike('merchant_name', `%${merchant}%`)
  if (f.minAmount !== undefined) r = r.gte('amount', f.minAmount)
  if (f.maxAmount !== undefined) r = r.lte('amount', f.maxAmount)
  if (f.minTax !== undefined) r = r.gte('tax_amount', f.minTax)
  if (f.maxTax !== undefined) r = r.lte('tax_amount', f.maxTax)
  const search = f.search ? escapeLike(f.search.trim()) : ''
  if (search) {
    const p = `%${search}%`
    r = r.or(['merchant_name', 'title', 'invoice_number', 'description'].map((c) => `${c}.ilike.${p}`).join(','))
  }
  return r
}

export type Cursor = { date: ISODate; id: string }

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export function applyCursor<Q extends FilterableQuery<Q>>(q: Q, c: Cursor | null): Q {
  if (!c) return q
  if (!isISODate(c.date) || !UUID.test(c.id)) throw new Error('Invalid cursor')
  return q.or(`transaction_date.lt.${c.date},and(transaction_date.eq.${c.date},id.lt.${c.id})`)
}

/** Snake-case filter for the document_summary RPC (date range is passed separately). */
export function filterToRpc(f: DocumentFilter): Record<string, unknown> {
  const out: Record<string, unknown> = {
    category_ids: f.categoryIds?.length ? f.categoryIds : undefined,
    document_type: f.documentType,
    expense_type: f.expenseType,
    status: f.status,
    merchant: f.merchant?.trim() || undefined,
    search: f.search?.trim() || undefined,
    min_amount: f.minAmount,
    max_amount: f.maxAmount,
    min_tax: f.minTax,
    max_tax: f.maxTax,
    ids: f.ids,
  }
  return Object.fromEntries(Object.entries(out).filter(([, v]) => v !== undefined))
}
