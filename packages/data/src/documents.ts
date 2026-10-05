import {
  applyCursor, applyDocumentFilter, DocumentInputSchema, type Cursor, type DocumentFilter, type DocumentInput,
  type DocumentRow, type Database, type Json,
} from '@taxsteps/core'
import { currentUserId, dbError, type TaxStepsClient } from './client.ts'

type DbDocument = Database['public']['Tables']['documents']['Row']

/** DB rows use plain strings for enum-like columns; narrow them to the app types. */
export function asDocumentRow(r: DbDocument): DocumentRow {
  return {
    ...r,
    expense_type: r.expense_type === 'personal' ? 'personal' : 'business',
    status: r.status === 'complete' ? 'complete' : 'needs_review',
    source: r.source === 'scan' || r.source === 'upload' ? r.source : 'manual',
    metadata: r.metadata && typeof r.metadata === 'object' && !Array.isArray(r.metadata) ? r.metadata : {},
  }
}

export async function listDocuments(
  c: TaxStepsClient, filter: DocumentFilter, cursor: Cursor | null, pageSize = 50,
): Promise<{ rows: DocumentRow[]; next: Cursor | null }> {
  const q = applyCursor(applyDocumentFilter(c.from('documents').select('*'), filter), cursor)
  const { data, error, status } = await q
    .order('transaction_date', { ascending: false })
    .order('id', { ascending: false })
    .limit(pageSize + 1)
  if (error) throw dbError('INTERNAL', error, status)
  const rows = data.slice(0, pageSize).map(asDocumentRow)
  const last = rows[rows.length - 1]
  return { rows, next: data.length > pageSize && last ? { date: last.transaction_date, id: last.id } : null }
}

export async function getDocument(c: TaxStepsClient, id: string): Promise<DocumentRow | null> {
  const { data, error, status } = await c.from('documents').select('*').eq('id', id).maybeSingle()
  if (error) throw dbError('INTERNAL', error, status)
  return data ? asDocumentRow(data) : null
}

/**
 * Insert-or-update by id. Idempotent: saving the same draft twice leaves one row.
 * Pass `ownerId` to pin the row to a specific user: RLS then rejects the write if the
 * client's session belongs to anyone else (used by the mobile offline queue).
 */
export async function saveDocument(c: TaxStepsClient, input: DocumentInput, ownerId?: string): Promise<DocumentRow> {
  const clean = DocumentInputSchema.parse(input)
  const { data, error, status } = await c
    .from('documents')
    .upsert({ ...clean, metadata: clean.metadata as Json, ...(ownerId ? { user_id: ownerId } : {}) }, { onConflict: 'id' })
    .select('*')
    .single()
  if (error || !data) throw dbError('SAVE_FAILED', error, status)
  return asDocumentRow(data)
}

export async function deleteDocument(c: TaxStepsClient, id: string): Promise<void> {
  const { error, status } = await c.from('documents').delete().eq('id', id)
  if (error) throw dbError('DELETE_FAILED', error, status)
}

export async function deleteAllDocuments(c: TaxStepsClient): Promise<number> {
  const userId = await currentUserId(c)
  const { error, count, status } = await c.from('documents').delete({ count: 'exact' }).eq('user_id', userId)
  if (error) throw dbError('DELETE_FAILED', error, status)
  return count ?? 0
}

export async function listDocumentTypes(c: TaxStepsClient): Promise<{ code: string; label: string }[]> {
  const { data, error, status } = await c.from('document_types').select('code, label').order('sort')
  if (error) throw dbError('INTERNAL', error, status)
  return data
}
