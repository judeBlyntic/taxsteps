import { describe, expect, it } from 'vitest'
import { formatMoney, fromCents, parseAmount, toCents } from './money.ts'

describe('cents conversion', () => {
  it('converts decimals to integer cents without float drift', () => {
    expect(toCents(87.45)).toBe(8745)
    expect(toCents(0.1 + 0.2)).toBe(30)
    expect(toCents(1.005)).toBe(101)
    expect(fromCents(8745)).toBe(87.45)
  })
})

describe('parseAmount', () => {
  it('strips currency symbols', () => {
    expect(parseAmount('$87.45')).toBe(8745)
    expect(parseAmount('NZ$ 87.45')).toBe(8745)
  })
  it('respects the locale decimal separator', () => {
    expect(parseAmount('1,234.56', 'en-NZ')).toBe(123456)
    expect(parseAmount('1.234,56', 'de-DE')).toBe(123456)
    expect(parseAmount('12,5', 'de-DE')).toBe(1250)
  })
  it('accepts whole numbers', () => {
    expect(parseAmount('12')).toBe(1200)
  })
  it('rejects empty, non-numeric, negative and over-precise input', () => {
    expect(parseAmount('')).toBeNull()
    expect(parseAmount('abc')).toBeNull()
    expect(parseAmount('-5')).toBeNull()
    expect(parseAmount('1.234')).toBeNull()
    expect(parseAmount('1.2.3')).toBeNull()
  })
  it('rejects a German-formatted amount when the locale is English', () => {
    expect(parseAmount('1.234,56', 'en-NZ')).toBeNull()
  })
})

describe('formatMoney', () => {
  it('formats with the currency and locale', () => {
    expect(formatMoney(428570, 'NZD', 'en-NZ')).toBe('$4,285.70')
    expect(formatMoney(1000, 'EUR', 'de-DE')).toMatch(/10,00\s€/)
  })
})

describe('formatAmountInput', () => {
  it('formats cents for an editable field without grouping, in the locale', async () => {
    const { formatAmountInput } = await import('./money.ts')
    expect(formatAmountInput(123456, 'en-NZ')).toBe('1234.56')
    expect(formatAmountInput(123456, 'de-DE')).toBe('1234,56')
    expect(formatAmountInput(1200, 'en-NZ')).toBe('12.00')
  })
})

describe('parseAmount strictness (review: never a silently wrong value)', () => {
  it('rejects letters or symbols inside the number', () => {
    expect(parseAmount('8O.45')).toBeNull()
    expect(parseAmount('1a2')).toBeNull()
    expect(parseAmount('1e5')).toBeNull()
  })
  it('rejects negative notations', () => {
    expect(parseAmount('(5.00)')).toBeNull()
    expect(parseAmount('−5')).toBeNull()
  })
  it('still accepts currency text around the number and grouping spaces/apostrophes', () => {
    expect(parseAmount('NZ$ 87.45')).toBe(8745)
    expect(parseAmount('87.45 NZD')).toBe(8745)
    expect(parseAmount('€12,50', 'de-DE')).toBe(1250)
    expect(parseAmount('1 234,56', 'fr-FR')).toBe(123456)
    expect(parseAmount("1'234.50", 'de-CH')).toBe(123450)
  })
})

describe('parseAmount keeps every digit', () => {
  it('never silently removes a letter inside the number', () => {
    expect(parseAmount('5s')).toBe(500) // trailing text is treated as a currency suffix
    expect(parseAmount('1s5')).toBeNull()
    expect(parseAmount('12 345.67')).toBe(1234567) // grouping space
  })
})
