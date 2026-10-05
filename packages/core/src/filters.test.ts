import { describe, expect, it } from 'vitest'
import {
  DocumentFilterSchema, ExportRequestSchema, applyCursor, applyDocumentFilter, escapeLike, filterToRpc, periodLabel,
  resolvePeriod, type FilterableQuery,
} from './filters.ts'

type Call = [string, ...unknown[]]
class RecordingQuery implements FilterableQuery<RecordingQuery> {
  calls: Call[] = []
  private rec(...c: Call) { this.calls.push(c); return this }
  gte(c: string, v: unknown) { return this.rec('gte', c, v) }
  lte(c: string, v: unknown) { return this.rec('lte', c, v) }
  lt(c: string, v: unknown) { return this.rec('lt', c, v) }
  eq(c: string, v: unknown) { return this.rec('eq', c, v) }
  in(c: string, v: unknown[]) { return this.rec('in', c, v) }
  ilike(c: string, v: string) { return this.rec('ilike', c, v) }
  or(f: string) { return this.rec('or', f) }
}
const rq = () => new RecordingQuery()
const nzFy = { fyStartMonth: 4, fyStartDay: 1 }

describe('applyDocumentFilter', () => {
  it('maps filter fields onto PostgREST calls in a stable order', () => {
    expect(applyDocumentFilter(rq(), { from: '2026-01-01', to: '2026-01-31', categoryIds: ['c1'], minAmount: 100 }).calls)
      .toEqual([['gte', 'transaction_date', '2026-01-01'], ['lte', 'transaction_date', '2026-01-31'], ['in', 'category_id', ['c1']], ['gte', 'amount', 100]])
  })
  it('searches merchant, title, invoice number and description with escaped input', () => {
    const s = '%50\\%\\_offx%'
    expect(applyDocumentFilter(rq(), { search: '50%_off,(x)' }).calls[0])
      .toEqual(['or', `merchant_name.ilike.${s},title.ilike.${s},invoice_number.ilike.${s},description.ilike.${s}`])
  })
  it('filters by merchant, type, status and tax range', () => {
    expect(applyDocumentFilter(rq(), { merchant: 'Mitre', expenseType: 'business', status: 'needs_review', minTax: 1, maxTax: 5 }).calls)
      .toEqual([['eq', 'expense_type', 'business'], ['eq', 'status', 'needs_review'], ['ilike', 'merchant_name', '%Mitre%'], ['gte', 'tax_amount', 1], ['lte', 'tax_amount', 5]])
  })
  it('ignores blank search text', () => {
    expect(applyDocumentFilter(rq(), { search: '   ' }).calls).toEqual([])
  })
})

describe('applyCursor', () => {
  it('pages by date then id', () => {
    const id = '33333333-3333-4333-8333-333333333333'
    expect(applyCursor(rq(), { date: '2026-10-01', id }).calls)
      .toEqual([['or', `transaction_date.lt.2026-10-01,and(transaction_date.eq.2026-10-01,id.lt.${id})`]])
    expect(applyCursor(rq(), null).calls).toEqual([])
  })
})

describe('periods', () => {
  it('resolves financial years with the profile start', () => {
    expect(resolvePeriod({ kind: 'fy', date: '2026-10-05' }, { fyStartMonth: 7, fyStartDay: 1 })).toEqual({ from: '2026-07-01', to: '2027-06-30' })
    expect(resolvePeriod({ kind: 'month', year: 2026, month: 1 }, nzFy)).toEqual({ from: '2026-01-01', to: '2026-01-31' })
    expect(resolvePeriod({ kind: 'all' }, nzFy)).toBeNull()
  })
  it('labels periods', () => {
    expect(periodLabel({ kind: 'month', year: 2026, month: 1 }, nzFy, 'en-NZ')).toBe('January 2026')
    expect(periodLabel({ kind: 'year', year: 2026 }, nzFy)).toBe('2026')
    expect(periodLabel({ kind: 'fy', date: '2026-10-05' }, nzFy)).toBe('FY 2026–27')
    expect(periodLabel({ kind: 'custom', from: '2026-10-05', to: '2026-11-01' }, nzFy, 'en-NZ')).toBe('5 Oct 2026 – 1 Nov 2026')
    expect(periodLabel({ kind: 'all' }, nzFy)).toBe('All time')
  })
})

describe('schemas and helpers', () => {
  it('escapes LIKE wildcards and strips PostgREST syntax characters', () => {
    expect(escapeLike('a_b%c\\d,(e)"*')).toBe('a\\_b\\%c\\\\de')
  })
  it('converts filters to RPC json without the date range', () => {
    expect(filterToRpc({ from: '2026-01-01', categoryIds: ['c'], minAmount: 5, expenseType: 'personal' }))
      .toEqual({ category_ids: ['c'], min_amount: 5, expense_type: 'personal' })
  })
  it('validates filters and export requests', () => {
    expect(DocumentFilterSchema.safeParse({ from: '2026-02-30' }).success).toBe(false)
    expect(DocumentFilterSchema.safeParse({ minAmount: -1 }).success).toBe(false)
    expect(ExportRequestSchema.safeParse({ format: 'docx', filter: {}, label: 'x' }).success).toBe(false)
    expect(ExportRequestSchema.safeParse({ format: 'pdf', filter: { from: '2026-01-01' }, label: 'January 2026' }).success).toBe(true)
  })
})
