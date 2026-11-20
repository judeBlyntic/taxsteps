import { describe, expect, it } from 'vitest'
import type { DocumentFilter } from '@taxsteps/core'
import { filterFromSearchParams, filterToSearchParams, patchFilterQuery } from './filter-url'

const CAT_A = '11111111-1111-4111-8111-111111111111'
const CAT_B = '22222222-2222-4222-8222-222222222222'

describe('filter <-> URL', () => {
  it('round-trips a full filter', () => {
    const f: DocumentFilter = {
      from: '2025-07-01', to: '2026-06-30', search: 'mitre', merchant: 'Bunnings', categoryIds: [CAT_A, CAT_B],
      documentType: 'invoice', expenseType: 'business', status: 'needs_review', minAmount: 100, maxAmount: 500.5, minTax: 1, maxTax: 99,
    }
    expect(filterFromSearchParams(filterToSearchParams(f))).toEqual(f)
  })
  it('ignores malformed values instead of failing', () => {
    expect(filterFromSearchParams(new URLSearchParams('minAmount=abc&from=2026-02-30&status=bogus&category=not-a-uuid'))).toEqual({})
  })
  it('reads repeated category params', () => {
    expect(filterFromSearchParams(new URLSearchParams(`category=${CAT_A}&category=${CAT_B}`)).categoryIds).toEqual([CAT_A, CAT_B])
  })
  it('omits empty values', () => {
    expect(filterToSearchParams({ search: '', categoryIds: [] }).toString()).toBe('')
  })
  it('truncates over-long text instead of dropping it (dropped would mean every document)', () => {
    expect(filterFromSearchParams(new URLSearchParams({ search: 'a'.repeat(150) })).search).toBe('a'.repeat(100))
    expect(filterFromSearchParams(new URLSearchParams({ merchant: 'm'.repeat(250) })).merchant).toBe('m'.repeat(200))
  })
})

describe('patchFilterQuery', () => {
  it('builds each change on the query string as it is now', () => {
    const afterFrom = patchFilterQuery('', { from: '2026-11-01' })
    expect(patchFilterQuery(`?${afterFrom}`, { to: '2026-11-28' })).toBe('from=2026-11-01&to=2026-11-28')
    expect(patchFilterQuery('from=2026-10-01&to=2026-10-31', { status: 'complete' })).toBe('from=2026-10-01&to=2026-10-31&status=complete')
  })
  it('removes keys patched to empty', () => {
    expect(patchFilterQuery('from=2026-10-01&merchant=Mitre&status=complete', { from: undefined, merchant: '' })).toBe('status=complete')
  })
})
