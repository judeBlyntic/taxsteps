import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { adminClient, createTestUser, deleteTestUser, type TestUser } from './helpers.ts'

let A: TestUser
let B: TestUser
beforeAll(async () => {
  A = await createTestUser()
  B = await createTestUser()
})
afterAll(async () => {
  await deleteTestUser(A.userId)
  await deleteTestUser(B.userId)
})

const consume = async (userId: string) =>
  (await adminClient().rpc('consume_rate_limit', { p_user_id: userId, p_kind: 'export', p_per_hour: 3, p_per_day: 10 })).data

describe('consume_rate_limit', () => {
  it('allows up to the hourly limit then refuses', async () => {
    expect([await consume(A.userId), await consume(A.userId), await consume(A.userId)]).toEqual([true, true, true])
    expect(await consume(A.userId)).toBe(false)
  })
  it('counts per user', async () => {
    expect(await consume(B.userId)).toBe(true)
  })
  it('rejects unknown kinds', async () => {
    const r = await adminClient().rpc('consume_rate_limit', { p_user_id: A.userId, p_kind: 'nope', p_per_hour: 3, p_per_day: 10 })
    expect(r.error).not.toBeNull()
  })
})
