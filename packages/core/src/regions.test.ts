import { describe, expect, it } from 'vitest'
import { CURRENCIES, FALLBACK_REGION, TAX_REGIONS, checkTaxRate, regionFor } from './regions.ts'

describe('regionFor', () => {
  it('finds presets case-insensitively and falls back for unknown countries', () => {
    expect(regionFor('nz').taxLabel).toBe('GST')
    expect(regionFor('XX')).toBe(FALLBACK_REGION)
    expect(regionFor(null)).toBe(FALLBACK_REGION)
  })
  it('carries each country FY start', () => {
    expect(regionFor('GB')).toMatchObject({ fyStartMonth: 4, fyStartDay: 6, taxLabel: 'VAT' })
    expect(regionFor('AU')).toMatchObject({ fyStartMonth: 7, fyStartDay: 1, currency: 'AUD' })
  })
  it('covers every spec country', () => {
    expect(Object.keys(TAX_REGIONS).sort()).toEqual(
      ['AE', 'AU', 'CA', 'DE', 'ES', 'FR', 'GB', 'IE', 'IN', 'IT', 'JP', 'NL', 'NZ', 'SG', 'US', 'ZA'])
  })
})

describe('checkTaxRate', () => {
  it('accepts a tax-inclusive amount at a known rate', () => {
    expect(checkTaxRate(8745, 1141, regionFor('NZ'))).toBe('ok')
    expect(checkTaxRate(12000, 2000, regionFor('GB'))).toBe('ok')
    expect(checkTaxRate(10500, 500, regionFor('GB'))).toBe('ok')
  })
  it('flags rates that match nothing', () => {
    expect(checkTaxRate(10000, 3000, regionFor('NZ'))).toBe('mismatch')
  })
  it('skips regions without rates and zero tax', () => {
    expect(checkTaxRate(10000, 500, regionFor('US'))).toBe('unchecked')
    expect(checkTaxRate(10000, 0, regionFor('NZ'))).toBe('unchecked')
  })
  it('lists currencies sorted and unique', () => {
    expect(CURRENCIES).toContain('NZD')
    expect([...CURRENCIES].sort()).toEqual(CURRENCIES)
    expect(new Set(CURRENCIES).size).toBe(CURRENCIES.length)
  })
})
