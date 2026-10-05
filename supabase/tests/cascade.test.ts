// Deleting an account removes every row the user owned.
import { describe, expect, it } from 'vitest'
import { saveDocument } from '@taxsteps/data/api'
import { adminClient, createTestUser, input } from './helpers.ts'

describe('account deletion cascade', () => {
  it('removes profile, categories, documents and usage rows', async () => {
    const u = await createTestUser({ country: 'NZ', currency: 'NZD' })
    await saveDocument(u.client, input())
    const admin = adminClient()
    await admin.rpc('consume_rate_limit', { p_user_id: u.userId, p_kind: 'extract', p_per_hour: 10, p_per_day: 10 })

    const { error } = await admin.auth.admin.deleteUser(u.userId)
    expect(error).toBeNull()

    for (const [table, col] of [['profiles', 'id'], ['categories', 'user_id'], ['documents', 'user_id'], ['api_usage', 'user_id']] as const) {
      const { count } = await admin.from(table).select('*', { count: 'exact', head: true }).eq(col, u.userId)
      expect(count, table).toBe(0)
    }
  })
})
