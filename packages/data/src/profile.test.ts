import { describe, expect, it } from 'vitest'
import { ERROR_MESSAGES, toUserMessage } from '@taxsteps/core'
import type { TaxStepsClient } from './client.ts'
import { updateProfile } from './profile.ts'

/** A signed-in client whose profile update is refused by the database. */
function refusingClient(): TaxStepsClient {
  const result = Promise.resolve({ data: null, error: { message: 'permission denied' }, status: 403 })
  const builder = { update: () => builder, eq: () => builder, select: () => builder, single: () => result }
  return {
    auth: { getSession: async () => ({ data: { session: { user: { id: 'u1' } } } }) },
    from: () => builder,
  } as unknown as TaxStepsClient
}

describe('updateProfile', () => {
  it('reports a failed save without talking about expenses', async () => {
    const e = await updateProfile(refusingClient(), { full_name: 'A' }).catch((err: unknown) => err)
    expect(toUserMessage(e)).toBe(ERROR_MESSAGES.INTERNAL)
  })
})
