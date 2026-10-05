import { describe, expect, it } from 'vitest'
import { otherCurrencies, parseSummary, percentChange, totalsFor } from './reports.ts'

const MIXED_FIXTURE = {
  currencies: [
    { currency: 'AUD', total: 50, tax: 4.55, count: 1, average: 50 },
    { currency: 'NZD', total: 100, tax: 13.04, count: 2, average: 50 },
  ],
  by_month: [{ month: '2026-10', currency: 'NZD', total: 100 }, { month: '2026-10', currency: 'AUD', total: 50 }],
  by_category: [{ category_id: null, name: 'Uncategorised', currency: 'NZD', total: 100, tax: null, count: 2 }],
  by_type: [{ expense_type: 'business', currency: 'NZD', total: 100 }],
  by_day: [{ date: '2026-10-05', business: 2, personal: 0 }],
}

describe('parseSummary', () => {
  it('keeps currencies separate and converts to cents, biggest first', () => {
    const s = parseSummary(MIXED_FIXTURE)
    expect(s.currencies.map((c) => [c.currency, c.totalCents])).toEqual([['NZD', 10000], ['AUD', 5000]])
    expect(s.byCategory[0]).toMatchObject({ categoryId: null, name: 'Uncategorised', taxCents: 0 })
    expect(s.byDay[0]).toEqual({ date: '2026-10-05', business: 2, personal: 0 })
  })
  it('handles an empty summary', () => {
    expect(parseSummary({ currencies: [], by_month: [], by_category: [], by_type: [], by_day: [] }).currencies).toEqual([])
  })
  it('rejects malformed payloads', () => {
    expect(() => parseSummary({ currencies: 'nope' })).toThrow()
  })
})

describe('totals helpers', () => {
  const s = parseSummary(MIXED_FIXTURE)
  it('finds the primary currency and lists the others', () => {
    expect(totalsFor(s, 'NZD').totalCents).toBe(10000)
    expect(otherCurrencies(s, 'NZD').map((c) => c.currency)).toEqual(['AUD'])
    expect(totalsFor(s, 'EUR')).toMatchObject({ totalCents: 0, count: 0 })
  })
  it('computes month-over-month change', () => {
    expect(percentChange(12600, 10000)).toBe(26)
    expect(percentChange(5000, 10000)).toBe(-50)
    expect(percentChange(5, 0)).toBeNull()
  })
})
