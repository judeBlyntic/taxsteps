import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { totalsFor } from '@taxsteps/core'
import { getSummary, listCategories, saveDocument } from '@taxsteps/data/api'
import { createTestUser, deleteTestUser, input, type TestUser } from './helpers.ts'

let A: TestUser
let office: string
let travel: string

beforeAll(async () => {
  A = await createTestUser({ country: 'NZ', currency: 'NZD' })
  const cats = await listCategories(A.client)
  office = cats.find((c) => c.name === 'Office')!.id
  travel = cats.find((c) => c.name === 'Travel')!.id
  await saveDocument(A.client, input({ amount: 100, tax_amount: 13.04, transaction_date: '2026-10-02', category_id: office }))
  await saveDocument(A.client, input({ amount: 50, tax_amount: 6.52, transaction_date: '2026-10-03', category_id: office, expense_type: 'personal' }))
  await saveDocument(A.client, input({ amount: 40, tax_amount: 3.64, currency: 'AUD', transaction_date: '2026-10-04', category_id: travel }))
  await saveDocument(A.client, input({ amount: 10, tax_amount: null, transaction_date: '2026-09-15' }))
})
afterAll(async () => { await deleteTestUser(A.userId) })

describe('document_summary', () => {
  it('totals per currency without mixing currencies', async () => {
    const s = await getSummary(A.client, { from: '2026-10-01', to: '2026-10-31' }, {})
    expect(totalsFor(s, 'NZD')).toMatchObject({ totalCents: 15000, taxCents: 1956, count: 2, averageCents: 7500 })
    expect(totalsFor(s, 'AUD')).toMatchObject({ totalCents: 4000, count: 1 })
  })
  it('groups by category, month, type and day', async () => {
    const s = await getSummary(A.client, null, {})
    expect(s.byCategory.find((c) => c.name === 'Office' && c.currency === 'NZD')).toMatchObject({ totalCents: 15000, count: 2 })
    expect(s.byCategory.find((c) => c.name === 'Uncategorised')).toMatchObject({ totalCents: 1000 })
    expect(s.byMonth).toEqual(expect.arrayContaining([{ month: '2026-09', currency: 'NZD', totalCents: 1000 }]))
    expect(s.byType).toEqual(expect.arrayContaining([{ expenseType: 'personal', currency: 'NZD', totalCents: 5000 }]))
    expect(s.byDay.find((d) => d.date === '2026-10-03')).toEqual({ date: '2026-10-03', business: 0, personal: 1 })
  })
  it('applies filters', async () => {
    const s = await getSummary(A.client, { from: '2026-10-01', to: '2026-10-31' }, { categoryIds: [office] })
    expect(s.currencies.map((c) => c.currency)).toEqual(['NZD'])
    expect((await getSummary(A.client, null, { minAmount: 45 })).currencies.map((c) => c.count)).toEqual([2])
    expect((await getSummary(A.client, null, { expenseType: 'personal' })).currencies[0]?.totalCents).toBe(5000)
  })
})
