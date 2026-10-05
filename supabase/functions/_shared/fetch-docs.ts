// Loads the caller's documents for an export (RLS-enforced via the user-scoped client).
import type { SupabaseClient } from '@supabase/supabase-js'
import { AppError, applyDocumentFilter, type DocumentFilter, type ExportDoc, type FilterableQuery } from './core.ts'

// Narrow view of the PostgREST builder (the full generic type is too deep for Deno's checker).
type DocsQuery = FilterableQuery<DocsQuery> & {
  order(column: string, opts?: { ascending?: boolean }): DocsQuery
  range(from: number, to: number): PromiseLike<{ data: unknown[] | null; error: unknown }>
}

const PAGE = 1000
export const MAX_EXPORT_ROWS = 10_000

type Row = Omit<ExportDoc, 'category_name' | 'expense_type' | 'status' | 'source'> & {
  expense_type: string; status: string; source: string; categories: { name: string } | null
}

function toExportDoc(r: Row): ExportDoc {
  const { categories, ...rest } = r
  return {
    ...rest,
    expense_type: r.expense_type === 'personal' ? 'personal' : 'business',
    status: r.status === 'complete' ? 'complete' : 'needs_review',
    source: r.source === 'scan' || r.source === 'upload' ? r.source : 'manual',
    metadata: r.metadata ?? {},
    category_name: categories?.name ?? null,
  }
}

export async function fetchExportDocs(client: SupabaseClient, filter: DocumentFilter): Promise<ExportDoc[]> {
  const out: ExportDoc[] = []
  for (let from = 0; ; from += PAGE) {
    const base = client.from('documents').select('*, categories(name)') as unknown as DocsQuery
    const { data, error } = await applyDocumentFilter(base, filter).order('transaction_date').order('id').range(from, from + PAGE - 1)
    if (error || !data) throw new AppError('EXPORT_FAILED')
    out.push(...(data as unknown as Row[]).map(toExportDoc))
    if (out.length > MAX_EXPORT_ROWS) throw new AppError('VALIDATION', 'Too many records — narrow the date range')
    if (data.length < PAGE) return out
  }
}
