import { describe, expect, it } from 'vitest'
import { CATEGORY_IDS } from '../../core/src/fixtures.ts'
import { toUserMessage } from '@taxsteps/core'
import type { TaxStepsClient } from './client.ts'
import { upsertCategory } from './categories.ts'

function failingClient(error: { code: string; message: string }, status: number): TaxStepsClient {
  const result = Promise.resolve({ data: null, error, status })
  const builder = { update: () => builder, insert: () => builder, eq: () => builder, select: () => builder, single: () => result }
  return { from: () => builder } as unknown as TaxStepsClient
}

const rename = { id: CATEGORY_IDS.office, name: 'Groceries', icon: 'briefcase', color: 'neutral-300' }

describe('category save errors', () => {
  it('say so when the name is already taken', async () => {
    const e = await upsertCategory(failingClient({ code: '23505', message: 'duplicate key value violates unique constraint' }, 409), rename).catch((x) => x)
    expect(toUserMessage(e)).toBe('You already have a category called “Groceries”.')
  })
  it('never talk about expenses', async () => {
    const e = await upsertCategory(failingClient({ code: '42501', message: 'permission denied' }, 403), rename).catch((x) => x)
    expect(toUserMessage(e)).not.toMatch(/expense/i)
  })
})
