import { describe, expect, it } from 'vitest'
import type { DocumentInput } from '@taxsteps/core'
import { createOfflineQueue, type KV } from './offline-queue'

function memKV(): KV & { dump: () => Record<string, string> } {
  const m = new Map<string, string>()
  return {
    getItem: async (k) => m.get(k) ?? null,
    setItem: async (k, v) => { m.set(k, v) },
    dump: () => Object.fromEntries(m),
  }
}

const U = (c: string) => `00000000-0000-4000-8000-${c.charCodeAt(0).toString(16).padStart(12, '0')}`
const inp = (id: string, over: Partial<DocumentInput> = {}): DocumentInput => ({
  id: U(id), document_type: 'receipt', merchant_name: id.toUpperCase(), title: null, description: null, category_id: null,
  expense_type: 'business', amount: 10, tax_amount: null, tax_label: null, currency: 'NZD', transaction_date: '2026-10-05',
  invoice_number: null, payment_method: null, status: 'needs_review', source: 'scan', metadata: {}, ...over,
})

describe('offline queue', () => {
  it('replaces a queued item with the same id and keeps FIFO order', async () => {
    const q = createOfflineQueue(memKV())
    await q.enqueue(inp('a')); await q.enqueue(inp('b')); await q.enqueue(inp('a', { merchant_name: 'Edited' }))
    expect((await q.list()).map((i) => [i.input.id, i.input.merchant_name])).toEqual([[U('a'), 'Edited'], [U('b'), 'B']])
  })

  it('flushes in order and empties the queue', async () => {
    const q = createOfflineQueue(memKV())
    await q.enqueue(inp('a')); await q.enqueue(inp('b'))
    const seen: string[] = []
    expect(await q.flush(async (i) => { seen.push(i.id) })).toEqual({ saved: 2, failed: 0 })
    expect(seen).toEqual([U('a'), U('b')])
    expect(await q.list()).toEqual([])
  })

  it('keeps failed items with the error and attempt count', async () => {
    const q = createOfflineQueue(memKV())
    await q.enqueue(inp('c'))
    expect(await q.flush(async () => { throw new Error('offline') })).toEqual({ saved: 0, failed: 1 })
    expect((await q.list())[0]).toMatchObject({ attempts: 1, lastError: 'offline' })
  })

  it('is harmless to flush twice (idempotent saves)', async () => {
    const q = createOfflineQueue(memKV())
    await q.enqueue(inp('d'))
    let calls = 0
    await q.flush(async () => { calls++ })
    await q.flush(async () => { calls++ })
    expect(calls).toBe(1)
  })

  it('discards and clears', async () => {
    const q = createOfflineQueue(memKV())
    await q.enqueue(inp('e')); await q.enqueue(inp('f'))
    await q.discard(U('e'))
    expect((await q.list()).map((i) => i.input.id)).toEqual([U('f')])
    await q.clear()
    expect(await q.list()).toEqual([])
  })

  it('stores only structured data — never image data or file uris', async () => {
    const kv = memKV()
    const q = createOfflineQueue(kv)
    await q.enqueue({ ...inp('g'), ...({ base64: 'AAAA', uri: 'file:///tmp/x.jpg' } as object) } as DocumentInput)
    expect(JSON.stringify(kv.dump())).not.toMatch(/base64|file:\/\//)
  })

  it('survives corrupt storage', async () => {
    const kv = memKV()
    await kv.setItem('taxsteps.queue.v1', '{not json')
    expect(await createOfflineQueue(kv).list()).toEqual([])
  })
})

describe('per-user isolation', () => {
  it("never shows or flushes another user's queued expenses", async () => {
    const { queueKeyFor } = await import('./offline-queue')
    const kv = memKV()
    const alice = createOfflineQueue(kv, queueKeyFor('alice-id'))
    const bob = createOfflineQueue(kv, queueKeyFor('bob-id'))
    await alice.enqueue(inp('a'))
    expect(await bob.list()).toEqual([])
    const flushed: string[] = []
    await bob.flush(async (i) => { flushed.push(i.id) })
    expect(flushed).toEqual([])
    expect(await alice.list()).toHaveLength(1)
  })
})
