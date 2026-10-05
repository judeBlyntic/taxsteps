// User isolation: user B must never read or change user A's records.
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { getSummary, listCategories, saveDocument } from '@taxsteps/data/api'
import { createTestUser, deleteTestUser, input, type TestUser } from './helpers.ts'

let A: TestUser
let B: TestUser
let docA: { id: string }
let categoryA: string

beforeAll(async () => {
  A = await createTestUser({ country: 'NZ', currency: 'NZD' })
  B = await createTestUser({ country: 'NZ', currency: 'NZD' })
  categoryA = (await listCategories(A.client))[0]!.id
  docA = await saveDocument(A.client, input({ category_id: categoryA }))
})
afterAll(async () => {
  await deleteTestUser(A.userId)
  await deleteTestUser(B.userId)
})

describe('row level security', () => {
  it("hides A's documents from B", async () => {
    expect((await B.client.from('documents').select('*').eq('id', docA.id)).data).toEqual([])
    expect((await B.client.from('documents').select('*')).data).toEqual([])
  })
  it("prevents B updating or deleting A's documents", async () => {
    expect((await B.client.from('documents').update({ merchant_name: 'Hacked' }).eq('id', docA.id).select()).data).toEqual([])
    expect((await B.client.from('documents').delete().eq('id', docA.id).select()).data).toEqual([])
    const still = await A.client.from('documents').select('merchant_name').eq('id', docA.id).single()
    expect(still.data?.merchant_name).toBe('Mitre 10')
  })
  it("prevents B hijacking A's document id or category", async () => {
    await expect(saveDocument(B.client, input({ id: docA.id, merchant_name: 'Hijack' }))).rejects.toThrow()
    await expect(saveDocument(B.client, input({ category_id: categoryA }))).rejects.toThrow()
  })
  it('prevents inserting rows owned by someone else', async () => {
    const res = await B.client.from('documents').insert({ ...input(), user_id: A.userId })
    expect(res.error).not.toBeNull()
  })
  it("hides A's profile and categories from B", async () => {
    expect((await B.client.from('profiles').select('*').eq('id', A.userId)).data).toEqual([])
    expect((await B.client.from('categories').select('*').eq('user_id', A.userId)).data).toEqual([])
  })
  it('blocks clients from server-only tables', async () => {
    const gc = await A.client.from('google_connections').select('*')
    expect(gc.data ?? []).toEqual([])
    expect((await A.client.from('api_usage').insert({ user_id: A.userId, kind: 'extract' })).error).not.toBeNull()
  })
  it("excludes A's data from B's summary", async () => {
    expect((await getSummary(B.client, null, {})).currencies).toEqual([])
  })
  it('blocks clients from the rate-limit function', async () => {
    const r = await A.client.rpc('consume_rate_limit', { p_user_id: A.userId, p_kind: 'export', p_per_hour: 99, p_per_day: 99 })
    expect(r.error).not.toBeNull()
  })
})
