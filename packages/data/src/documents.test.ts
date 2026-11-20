import { describe, expect, it } from 'vitest'
import { SAVED_ROW } from '../../core/src/fixtures.ts'
import type { DocumentInput } from '@taxsteps/core'
import type { TaxStepsClient } from './client.ts'
import { saveDocument } from './documents.ts'

const { user_id: _u, created_at: _c, updated_at: OPENED_AT, ...input } = SAVED_ROW
const edit: DocumentInput = { ...input, merchant_name: 'Edited here' }

/** Records every query-builder call; each terminal call (.single/.maybeSingle) takes the next response. */
function fakeClient(...responses: { data: unknown }[]) {
  const calls: unknown[][] = []
  const builder: Record<string, (...a: unknown[]) => unknown> = {}
  for (const m of ['upsert', 'update', 'select', 'eq']) builder[m] = (...a) => { calls.push([m, ...a]); return builder }
  builder.single = builder.maybeSingle = () => Promise.resolve({ error: null, status: 200, ...responses.shift() })
  return { client: { from: () => builder } as unknown as TaxStepsClient, calls }
}

describe('saving an edit to an existing document', () => {
  it('only writes if the document is unchanged since it was opened', async () => {
    const { client, calls } = fakeClient({ data: { ...SAVED_ROW, merchant_name: 'Edited here' } })
    const row = await saveDocument(client, edit, undefined, OPENED_AT)
    expect(row.merchant_name).toBe('Edited here')
    expect(calls.map((c) => c[0])).not.toContain('upsert')
    expect(calls).toContainEqual(['eq', 'id', SAVED_ROW.id])
    expect(calls).toContainEqual(['eq', 'updated_at', OPENED_AT])
  })

  it('writes nothing and returns the latest version when it was changed on another device', async () => {
    const latest = { ...SAVED_ROW, merchant_name: 'Changed on phone', updated_at: '2026-09-26T01:00:00Z' }
    const { client } = fakeClient({ data: null }, { data: latest })
    await expect(saveDocument(client, edit, undefined, OPENED_AT))
      .rejects.toMatchObject({ code: 'EDIT_CONFLICT', latest: { merchant_name: 'Changed on phone', updated_at: latest.updated_at } })
  })

  it('refuses (never re-creates it) when it was deleted on another device', async () => {
    const { client, calls } = fakeClient({ data: null }, { data: null })
    await expect(saveDocument(client, edit, undefined, OPENED_AT))
      .rejects.toMatchObject({ code: 'DOCUMENT_DELETED', message: 'This document was deleted on another device.', latest: null })
    expect(calls.map((c) => c[0])).not.toContain('upsert')
  })
})

describe('saving without an expectation (new documents, offline queue)', () => {
  it('stays an idempotent upsert by id', async () => {
    const { client, calls } = fakeClient({ data: SAVED_ROW })
    await saveDocument(client, edit)
    expect(calls[0]).toEqual(['upsert', expect.objectContaining({ id: SAVED_ROW.id }), { onConflict: 'id' }])
  })
})
