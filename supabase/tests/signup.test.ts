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

  it('records the accepted terms version with a server timestamp that clients cannot backdate', async () => {
    const before = Date.now()
    const u = await createTestUser({ terms_version: '2026-10-07' })
    users.push(u)
    const p = await getProfile(u.client) as Record<string, unknown>
    expect(p.terms_version).toBe('2026-10-07')
    const stamped = Date.parse(String(p.terms_accepted_at))
    expect(stamped).toBeGreaterThan(before - 60_000)

    await u.client.from('profiles').update({ terms_accepted_at: '2000-01-01T00:00:00Z' } as never).eq('id', u.userId)
    expect(Date.parse(String((await getProfile(u.client) as Record<string, unknown>).terms_accepted_at))).toBe(stamped)

    const { error } = await u.client.from('profiles').update({ terms_version: 'v2' } as never).eq('id', u.userId)
    expect(error?.code).toBe('23514')
  })

  it('leaves terms unaccepted when signup metadata has none', async () => {
    expect(await getProfile(users[0]!.client)).toMatchObject({ terms_version: null, terms_accepted_at: null })
  })

  it('starts on the fresh theme, saves a switch and rejects unknown themes', async () => {
    const u = users[0]!
    expect((await getProfile(u.client)).theme).toBe('fresh')
    expect((await updateProfile(u.client, { theme: 'classic' })).theme).toBe('classic')
    const { error } = await u.client.from('profiles').update({ theme: 'dark' as never }).eq('id', u.userId)
    expect(error?.code).toBe('23514')
  })
})
