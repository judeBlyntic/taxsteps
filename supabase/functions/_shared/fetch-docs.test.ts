import { assert, assertEquals } from '@std/assert'
import type { SupabaseClient } from '@supabase/supabase-js'
import { fetchExportDocs } from './fetch-docs.ts'

// PostgREST echoes the query string in a response header; ~400 ids pushes it past 16 KB and the request fails.
function fakeClient(rows: { id: string; transaction_date: string }[]) {
  const idCalls: number[] = []
  const client = {
    from: () => ({
      select: () => {
        let ids: string[] | null = null
        const q = {
          in: (_col: string, v: string[]) => { ids = v; idCalls.push(v.length); return q },
          gte: () => q, lte: () => q, lt: () => q, eq: () => q, ilike: () => q, or: () => q, order: () => q,
          range: () => Promise.resolve({
            data: rows.filter((r) => !ids || ids.includes(r.id)).map((r) => ({ ...r, metadata: {}, categories: null, expense_type: 'business', status: 'complete', source: 'scan' })),
            error: null,
          }),
        }
        return q
      },
    }),
  }
  return { client: client as unknown as SupabaseClient, idCalls }
}

Deno.test('fetch-docs: a large selection is fetched in small batches and returned in date order', async () => {
  const rows = Array.from({ length: 1000 }, (_, i) => ({ id: `id-${String(i).padStart(4, '0')}`, transaction_date: `2026-${String((i % 12) + 1).padStart(2, '0')}-01` }))
  const { client, idCalls } = fakeClient(rows)
  const docs = await fetchExportDocs(client, { ids: rows.map((r) => r.id) })
  assertEquals(docs.length, 1000)
  assert(idCalls.every((n) => n <= 200), `batch sizes: ${idCalls.join(',')}`)
  const keys = docs.map((d) => `${d.transaction_date}|${d.id}`)
  assertEquals(keys, [...keys].sort())
})
