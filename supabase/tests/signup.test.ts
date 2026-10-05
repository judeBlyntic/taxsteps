import { afterAll, describe, expect, it } from 'vitest'
import { DEFAULT_CATEGORIES } from '@taxsteps/core'
import { getProfile, listCategories, updateProfile } from '@taxsteps/data/api'
import { createTestUser, deleteTestUser, type TestUser } from './helpers.ts'

const users: TestUser[] = []
afterAll(async () => { for (const u of users) await deleteTestUser(u.userId) })

describe('signup trigger', () => {
  it('creates the profile from signup metadata and seeds default categories', async () => {
    const u = await createTestUser({ country: 'GB', currency: 'GBP', timezone: 'Europe/London', fy_start_month: 4, fy_start_day: 6, full_name: 'Test User' })
    users.push(u)
    expect(await getProfile(u.client)).toMatchObject({ country: 'GB', currency: 'GBP', timezone: 'Europe/London', fy_start_month: 4, fy_start_day: 6, full_name: 'Test User' })
    expect((await listCategories(u.client)).map((c) => c.name)).toEqual(DEFAULT_CATEGORIES.map((c) => c.name))
  })

  it('falls back to safe defaults for invalid metadata', async () => {
    const v = await createTestUser({ timezone: 'Not/AZone', fy_start_month: 13, currency: 'dollars', country: 'Narnia' })
    users.push(v)
    expect(await getProfile(v.client)).toMatchObject({ timezone: 'Pacific/Auckland', fy_start_month: 1, fy_start_day: 1, currency: 'USD', country: null })
  })

  it('rejects an invalid timezone on profile update', async () => {
    const u = users[0]!
    await expect(updateProfile(u.client, { timezone: 'Mars/Olympus' })).rejects.toThrow()
    expect((await updateProfile(u.client, { timezone: 'Pacific/Auckland' })).timezone).toBe('Pacific/Auckland')
  })
})
