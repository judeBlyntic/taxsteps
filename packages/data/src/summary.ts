import { filterToRpc, parseSummary, type DateRange, type DocumentFilter, type Json, type Summary } from '@taxsteps/core'
import { dbError, type TaxStepsClient } from './client.ts'

export async function getSummary(c: TaxStepsClient, range: DateRange | null, filter: DocumentFilter = {}): Promise<Summary> {
  const { data, error } = await c.rpc('document_summary', {
    ...(range ? { p_from: range.from, p_to: range.to } : {}),
    p_filters: filterToRpc(filter) as Json,
  })
  if (error) throw dbError('INTERNAL', error)
  return parseSummary(data)
}
