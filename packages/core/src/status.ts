import type { DocumentStatus } from './schemas.ts'

export function deriveStatus(i: {
  taxCents: number | null
  categoryId: string | null
  taxCheck: 'ok' | 'mismatch' | 'unchecked'
}): DocumentStatus {
  return i.taxCents === null || i.categoryId === null || i.taxCheck === 'mismatch' ? 'needs_review' : 'complete'
}
