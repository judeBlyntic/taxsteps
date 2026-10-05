import { describe, expect, it } from 'vitest'
import {
  financialYearRange, formatDate, fyLabel, isISODate, lastNMonths, monthRange, parseUserDate, todayIn, yearRange,
} from './dates.ts'

describe('todayIn', () => {
  it('uses the profile timezone for the calendar day', () => {
    const now = new Date('2026-09-30T12:30:00Z')
    expect(todayIn('Pacific/Auckland', now)).toBe('2026-10-01')
    expect(todayIn('America/New_York', now)).toBe('2026-09-30')
  })
})

describe('ranges', () => {
  it('builds month ranges including leap years', () => {
    expect(monthRange(2026, 2)).toEqual({ from: '2026-02-01', to: '2026-02-28' })
    expect(monthRange(2028, 2).to).toBe('2028-02-29')
    expect(monthRange(2026, 12)).toEqual({ from: '2026-12-01', to: '2026-12-31' })
  })
  it('builds calendar years', () => {
    expect(yearRange(2026)).toEqual({ from: '2026-01-01', to: '2026-12-31' })
  })
  it('builds financial years for any start month/day', () => {
    expect(financialYearRange('2026-10-05', 4, 1)).toEqual({ from: '2026-04-01', to: '2027-03-31' })
    expect(financialYearRange('2026-03-31', 4, 1)).toEqual({ from: '2025-04-01', to: '2026-03-31' })
    expect(financialYearRange('2026-04-05', 4, 6)).toEqual({ from: '2025-04-06', to: '2026-04-05' })
    expect(financialYearRange('2026-07-01', 7, 1)).toEqual({ from: '2026-07-01', to: '2027-06-30' })
    expect(financialYearRange('2026-10-05', 1, 1)).toEqual({ from: '2026-01-01', to: '2026-12-31' })
  })
  it('labels financial years', () => {
    expect(fyLabel({ from: '2025-07-01', to: '2026-06-30' })).toBe('FY 2025–26')
    expect(fyLabel(yearRange(2026))).toBe('FY 2026')
  })
  it('lists the last N months oldest first', () => {
    expect(lastNMonths('2026-10-05', 3)).toEqual([{ year: 2026, month: 8 }, { year: 2026, month: 9 }, { year: 2026, month: 10 }])
    expect(lastNMonths('2026-01-15', 2)).toEqual([{ year: 2025, month: 12 }, { year: 2026, month: 1 }])
  })
})

describe('parsing and formatting', () => {
  it('validates ISO dates', () => {
    expect(isISODate('2026-10-05')).toBe(true)
    expect(isISODate('2026-02-30')).toBe(false)
    expect(isISODate('05/10/2026')).toBe(false)
  })
  it('parses numeric dates in the locale order', () => {
    expect(parseUserDate('05/10/2026', 'en-NZ')).toBe('2026-10-05')
    expect(parseUserDate('05/10/2026', 'en-US')).toBe('2026-05-10')
    expect(parseUserDate('5.10.2026', 'de-DE')).toBe('2026-10-05')
    expect(parseUserDate('2026-10-05', 'en-US')).toBe('2026-10-05')
  })
  it('rejects impossible dates', () => {
    expect(parseUserDate('2026-02-30')).toBeNull()
    expect(parseUserDate('31/02/2026', 'en-NZ')).toBeNull()
    expect(parseUserDate('hello')).toBeNull()
  })
  it('formats dates back in the locale order (round trip)', () => {
    expect(formatDate('2026-10-05', 'en-NZ')).toBe('05/10/2026')
    expect(parseUserDate(formatDate('2026-10-05', 'en-US'), 'en-US')).toBe('2026-10-05')
  })
})
