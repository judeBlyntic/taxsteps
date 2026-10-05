import { describe, expect, it } from 'vitest'
import { DOC_ID } from '../../core/src/fixtures.ts'
import type { DocumentInput } from '@taxsteps/core'
import type { TaxStepsClient } from './client.ts'
import { saveDocument } from './documents.ts'
import { resyncOnReconnect, userChangeGuard } from './realtime.ts'

const input: DocumentInput = {
  id: DOC_ID, document_type: 'receipt', merchant_name: 'Shop', title: null, description: null, category_id: null,
  expense_type: 'business', amount: 10, tax_amount: null, tax_label: null, currency: 'NZD', transaction_date: '2026-10-05',
  invoice_number: null, payment_method: null, status: 'needs_review', source: 'manual', metadata: {},
}

/** postgrest-js reports a failed fetch as { error, status: 0 } instead of throwing. */
function offlineClient(): TaxStepsClient {
  const result = Promise.resolve({ data: null, error: { message: 'TypeError: fetch failed' }, status: 0 })
  const builder = { upsert: () => builder, select: () => builder, single: () => result }
  return { from: () => builder } as unknown as TaxStepsClient
}

describe('network failures (review #7)', () => {
  it('are reported as NETWORK so the offline queue can take over', async () => {
    await expect(saveDocument(offlineClient(), input)).rejects.toMatchObject({ code: 'NETWORK' })
  })
})

describe('realtime reconnect (review #6)', () => {
  it('resyncs every time the channel comes back, but not on the first connect', () => {
    let resyncs = 0
    const onState = resyncOnReconnect(() => { resyncs++ })
    onState('connecting'); onState('live')
    expect(resyncs).toBe(0)
    onState('offline'); onState('connecting'); onState('live')
    expect(resyncs).toBe(1)
    onState('live')
    expect(resyncs).toBe(1)
    onState('offline'); onState('live')
    expect(resyncs).toBe(2)
  })
})

describe('switching users (review: shared devices)', () => {
  it('fires when a different user signs in, even after a sign-out or session expiry', () => {
    const changes: string[] = []
    const seen = userChangeGuard(() => changes.push('clear'))
    seen('alice'); seen('alice'); seen(null)
    expect(changes).toEqual([])
    seen('alice')
    expect(changes).toEqual([]) // same person back
    seen(null); seen('bob')
    expect(changes).toEqual(['clear'])
  })
})
