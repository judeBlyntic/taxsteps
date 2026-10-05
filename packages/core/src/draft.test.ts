import { describe, expect, it } from 'vitest'
import { draftFromExtraction, draftFromRow, draftToInput, emptyDraft, type DraftContext } from './draft.ts'
import { CATEGORIES, CATEGORY_IDS, DOC_ID, SAVED_ROW, extractionResponse } from './fixtures.ts'

const ctx: DraftContext = {
  profile: { currency: 'NZD', country: 'NZ', locale: 'en-NZ' },
  categories: CATEGORIES,
  today: '2026-10-05',
  newId: () => DOC_ID,
}

describe('draft from extraction', () => {
  const d = draftFromExtraction(extractionResponse(), ctx, 'scan')
  it('maps the category name to the user category id and formats the date for the locale', () => {
    expect(d.values.category_id).toBe(CATEGORY_IDS.groceries)
    expect(d.values.transaction_date).toBe('05/10/2026')
    expect(d.values.amount).toBe('87.45')
  })
  it('flags low-confidence fields', () => {
    expect(d.flags).toContain('tax_amount')
    expect(d.flags).not.toContain('merchant_name')
  })
  it('produces a valid document input', () => {
    const res = draftToInput(d, ctx)
    expect(res.ok && res.input).toMatchObject({
      id: DOC_ID, amount: 87.45, tax_amount: 11.41, transaction_date: '2026-10-05', status: 'complete', source: 'scan',
      category_id: CATEGORY_IDS.groceries, metadata: { subtotal: 76.04 },
    })
  })
  it('rejects amounts in the wrong locale format instead of guessing', () => {
    expect(draftToInput({ ...d, values: { ...d.values, amount: '1.234,56' } }, ctx))
      .toMatchObject({ ok: false, errors: { amount: expect.any(String) } })
  })
  it('marks documents without tax as needing review', () => {
    expect(draftToInput({ ...d, values: { ...d.values, tax_amount: '' } }, ctx))
      .toMatchObject({ ok: true, input: { status: 'needs_review', tax_amount: null } })
  })
  it('lets the user override the status', () => {
    expect(draftToInput({ ...d, values: { ...d.values, tax_amount: '' }, statusOverride: 'complete' }, ctx))
      .toMatchObject({ ok: true, input: { status: 'complete' } })
  })
  it('requires a merchant, total and date', () => {
    const res = draftToInput({ ...d, values: { ...d.values, merchant_name: '  ', amount: '', transaction_date: '' } }, ctx)
    expect(res).toMatchObject({ ok: false, errors: { merchant_name: expect.any(String), amount: expect.any(String), transaction_date: expect.any(String) } })
  })
  it('rejects tax greater than the total', () => {
    expect(draftToInput({ ...d, values: { ...d.values, tax_amount: '100' } }, ctx))
      .toMatchObject({ ok: false, errors: { tax_amount: expect.any(String) } })
  })
  it('does not rate-check documents in a foreign currency', () => {
    expect(draftToInput({ ...d, values: { ...d.values, currency: 'AUD', tax_amount: '30' } }, ctx))
      .toMatchObject({ ok: true, input: { status: 'complete' } })
  })
  it('leaves the date empty when extraction could not read it', () => {
    const nodate = draftFromExtraction(extractionResponse({ transaction_date: null }), ctx, 'scan')
    expect(nodate.values.transaction_date).toBe('')
    expect(nodate.flags).toContain('transaction_date')
  })
})

describe('empty and saved drafts', () => {
  it('starts manual drafts with today, profile currency and the region tax label', () => {
    expect(emptyDraft(ctx)).toMatchObject({
      id: DOC_ID, source: 'manual', expense_type: 'business',
      values: { transaction_date: '05/10/2026', currency: 'NZD', tax_label: 'GST', document_type: 'receipt' },
    })
  })
  it('round-trips a saved row', () => {
    const res = draftToInput(draftFromRow(SAVED_ROW, ctx), ctx)
    expect(res).toMatchObject({ ok: true, input: { id: SAVED_ROW.id, amount: 115, tax_amount: 15, metadata: { subtotal: 100 }, source: 'scan' } })
  })
  it('keeps a previous manual status override when editing', () => {
    const overridden = { ...SAVED_ROW, tax_amount: null, status: 'complete' as const }
    expect(draftFromRow(overridden, ctx).statusOverride).toBe('complete')
  })
})
