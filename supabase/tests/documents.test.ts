import { randomUUID } from 'node:crypto'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { deleteAllDocuments, deleteDocument, getDocument, listCategories, listDocuments, saveDocument } from '@taxsteps/data/api'
import { adminClient, createTestUser, deleteTestUser, input, type TestUser } from './helpers.ts'

let A: TestUser
beforeAll(async () => { A = await createTestUser({ country: 'NZ', currency: 'NZD' }) })
afterAll(async () => { await deleteTestUser(A.userId) })

describe('documents CRUD', () => {
  it('saves idempotently by id (double save leaves one row)', async () => {
    const id = randomUUID()
    await saveDocument(A.client, input({ id }))
    const second = await saveDocument(A.client, input({ id, merchant_name: 'Mitre 10 Mega' }))
    expect(second.merchant_name).toBe('Mitre 10 Mega')
    const { count } = await A.client.from('documents').select('id', { count: 'exact', head: true }).eq('id', id)
    expect(count).toBe(1)
  })

  it('rejects invalid data at the database too', async () => {
    const admin = adminClient()
    const base = { ...input(), user_id: A.userId }
    expect((await admin.from('documents').insert({ ...base, amount: -1 })).error).not.toBeNull()
    expect((await admin.from('documents').insert({ ...base, id: randomUUID(), amount: 10, tax_amount: 11 })).error).not.toBeNull()
    expect((await admin.from('documents').insert({ ...base, id: randomUUID(), transaction_date: '2099-01-01' })).error).not.toBeNull()
    expect((await admin.from('documents').insert({ ...base, id: randomUUID(), currency: 'nzd' })).error).not.toBeNull()
    expect((await admin.from('documents').insert({ ...base, id: randomUUID(), document_type: 'spaceship' })).error).not.toBeNull()
  })

  it('updates updated_at and deletes', async () => {
    const row = await saveDocument(A.client, input())
    await new Promise((r) => setTimeout(r, 50))
    const updated = await saveDocument(A.client, { ...input({ id: row.id }), title: 'New title' })
    expect(updated.updated_at > row.updated_at).toBe(true)
    expect(updated.created_at).toBe(row.created_at)
    await deleteDocument(A.client, row.id)
    expect(await getDocument(A.client, row.id)).toBeNull()
  })

  it('sets category to null when the category is deleted', async () => {
    const cat = (await listCategories(A.client))[2]!
    const row = await saveDocument(A.client, input({ category_id: cat.id }))
    await A.client.from('categories').delete().eq('id', cat.id)
    expect((await getDocument(A.client, row.id))?.category_id).toBeNull()
  })
})

describe('listing, filters and pagination', () => {
  beforeAll(async () => {
    await deleteAllDocuments(A.client)
    const rows = Array.from({ length: 120 }, (_, i) => ({
      ...input({ merchant_name: i % 10 === 0 ? 'Mitre 10' : `Shop ${i}`, amount: i + 1, tax_amount: null, status: 'needs_review' as const }),
      user_id: A.userId,
      transaction_date: `2026-${String((i % 9) + 1).padStart(2, '0')}-${String((i % 28) + 1).padStart(2, '0')}`,
    }))
    const { error } = await adminClient().from('documents').insert(rows)
    if (error) throw error
  })

  it('pages 50/50/20 with no duplicates, newest first', async () => {
    const seen: string[] = []
    let cursor = null
    const sizes: number[] = []
    let prevDate = '9999-12-31'
    do {
      const page = await listDocuments(A.client, {}, cursor)
      sizes.push(page.rows.length)
      for (const r of page.rows) {
        expect(r.transaction_date <= prevDate).toBe(true)
        prevDate = r.transaction_date
        seen.push(r.id)
      }
      cursor = page.next
    } while (cursor)
    expect(sizes).toEqual([50, 50, 20])
    expect(new Set(seen).size).toBe(120)
  })

  it('searches and filters, including search combined with a cursor', async () => {
    const mitre = await listDocuments(A.client, { search: 'mitre' }, null)
    expect(mitre.rows.length).toBe(12)
    expect(mitre.rows.every((r) => r.merchant_name === 'Mitre 10')).toBe(true)
    const page1 = await listDocuments(A.client, { search: 'mitre' }, null, 5)
    const page2 = await listDocuments(A.client, { search: 'mitre' }, page1.next, 5)
    expect(page2.rows.every((r) => r.merchant_name === 'Mitre 10')).toBe(true)
    expect(page2.rows.some((r) => page1.rows.some((p) => p.id === r.id))).toBe(false)
    const big = await listDocuments(A.client, { minAmount: 100 }, null)
    expect(big.rows.map((r) => r.amount).sort((a, b) => a - b)).toEqual([100, 101, 102, 103, 104, 105, 106, 107, 108, 109, 110, 111, 112, 113, 114, 115, 116, 117, 118, 119, 120])
    const jan = await listDocuments(A.client, { from: '2026-01-01', to: '2026-01-31' }, null, 200)
    expect(jan.rows.length).toBeGreaterThan(0)
    expect(jan.rows.every((r) => r.transaction_date.startsWith('2026-01'))).toBe(true)
  })

  it('deletes all documents for the user only', async () => {
    expect(await deleteAllDocuments(A.client)).toBe(120)
    expect((await listDocuments(A.client, {}, null)).rows).toEqual([])
  })
})
