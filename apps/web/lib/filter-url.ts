// Document filters live in the URL so they survive reloads and can be shared/bookmarked.
import { DocumentFilterSchema, type DocumentFilter } from '@taxsteps/core'

const SCALAR = ['from', 'to', 'search', 'merchant', 'documentType', 'expenseType', 'status'] as const
const NUMERIC = ['minAmount', 'maxAmount', 'minTax', 'maxTax'] as const

export function filterToSearchParams(f: DocumentFilter): URLSearchParams {
  const p = new URLSearchParams()
  for (const k of SCALAR) if (f[k]) p.set(k, String(f[k]))
  for (const k of NUMERIC) if (f[k] !== undefined) p.set(k, String(f[k]))
  for (const id of f.categoryIds ?? []) p.append('category', id)
  return p
}

/** Parses each key independently with the shared schema; anything malformed is dropped. */
export function filterFromSearchParams(p: URLSearchParams): DocumentFilter {
  const out: Record<string, unknown> = {}
  const keep = (key: keyof DocumentFilter, value: unknown) => {
    if (DocumentFilterSchema.shape[key].safeParse(value).success) out[key] = value
  }
  for (const k of SCALAR) { const v = p.get(k); if (v) keep(k, v) }
  for (const k of NUMERIC) {
    const v = p.get(k)
    if (v !== null && v.trim() !== '' && Number.isFinite(Number(v))) keep(k, Number(v))
  }
  const cats = p.getAll('category')
  if (cats.length) keep('categoryIds', cats)
  return out as DocumentFilter
}
