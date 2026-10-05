import { describe, expect, it } from 'vitest'
import { normalizeExtraction } from './normalize.ts'
import { EMPTY_RAW, INVOICE_RAW, NOT_DOC_RAW, RECEIPT_RAW } from './fixtures.ts'
import type { ExtractionHints } from './schemas.ts'

const hints: ExtractionHints = { categories: ['Groceries', 'Office'], country: 'NZ', currency: 'NZD' }
const TODAY = '2026-10-05'
const codes = (r: ReturnType<typeof normalizeExtraction>) => r.warnings.map((w) => w.code)

describe('normalizeExtraction', () => {
  it('cleans a receipt into fields with no warnings', () => {
    const r = normalizeExtraction(RECEIPT_RAW, hints, TODAY)
    expect(r.fields).toMatchObject({
      merchant_name: 'Countdown', amount: 87.45, tax_amount: 11.41, currency: 'NZD', category: 'Groceries',
      document_type: 'receipt', transaction_date: '2026-10-05',
    })
    expect(r.warnings).toEqual([])
  })
  it('maps model confidence keys onto form field keys', () => {
    const r = normalizeExtraction(RECEIPT_RAW, hints, TODAY)
    expect(r.confidence.amount).toBe(0.95)
    expect(r.confidence.tax_amount).toBe(0.6)
    expect(r.confidence.category_id).toBe(0.95)
  })
  it('extracts invoices', () => {
    expect(normalizeExtraction(INVOICE_RAW, hints, TODAY).fields).toMatchObject({ document_type: 'invoice', invoice_number: 'INV-12345' })
  })
  it('rejects non-documents and unreadable images', () => {
    expect(() => normalizeExtraction(NOT_DOC_RAW, hints, TODAY)).toThrow(expect.objectContaining({ code: 'NOT_A_DOCUMENT' }))
    expect(() => normalizeExtraction(EMPTY_RAW, hints, TODAY)).toThrow(expect.objectContaining({ code: 'UNREADABLE' }))
  })
  it('warns about incorrect totals', () => {
    expect(codes(normalizeExtraction({ ...RECEIPT_RAW, tax_amount: 50 }, hints, TODAY))).toContain('TAX_RATE_MISMATCH')
    expect(codes(normalizeExtraction({ ...RECEIPT_RAW, tax_amount: 100 }, hints, TODAY))).toContain('TAX_EXCEEDS_TOTAL')
    expect(codes(normalizeExtraction({ ...RECEIPT_RAW, total: null }, hints, TODAY))).toContain('TOTAL_MISSING')
  })
  it('handles missing and future dates', () => {
    const bad = normalizeExtraction({ ...RECEIPT_RAW, transaction_date: '2026-13-40' }, hints, TODAY)
    expect(codes(bad)).toContain('DATE_MISSING')
    expect(bad.fields.transaction_date).toBeNull()
    expect(codes(normalizeExtraction({ ...RECEIPT_RAW, transaction_date: '2027-01-01' }, hints, TODAY))).toContain('FUTURE_DATE')
  })
  it('only returns categories the user has', () => {
    expect(normalizeExtraction({ ...RECEIPT_RAW, category: 'Spaceships' }, hints, TODAY).fields.category).toBeNull()
  })
  it('falls back to the hinted currency and rejects junk currency codes', () => {
    expect(normalizeExtraction({ ...RECEIPT_RAW, currency: null }, hints, TODAY).fields.currency).toBe('NZD')
    expect(normalizeExtraction({ ...RECEIPT_RAW, currency: 'dollars' }, hints, TODAY).fields.currency).toBe('NZD')
  })
  it('rounds amounts to cents and drops negatives', () => {
    const r = normalizeExtraction({ ...RECEIPT_RAW, total: 87.4499999, subtotal: -3 }, hints, TODAY)
    expect(r.fields.amount).toBe(87.45)
    expect(r.fields.subtotal).toBeNull()
  })
})
