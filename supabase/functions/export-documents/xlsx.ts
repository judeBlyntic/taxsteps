// @deno-types="https://cdn.sheetjs.com/xlsx-0.20.3/package/types/index.d.ts"
import * as XLSX from 'xlsx'
import { EXPORT_HEADERS, exportRow, fromCents, guardCell, type ExportDoc } from '../_shared/core.ts'
import { aggregate } from './aggregate.ts'
import type { ExportContext } from './context.ts'

const toDate = (iso: string) => {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(Date.UTC(y!, m! - 1, d!))
}

/** Documents + By category + Summary sheets; numbers are numeric cells, strings are formula-guarded. */
export function buildXlsx(docs: ExportDoc[], ctx: ExportContext): Uint8Array {
  const rows = docs.map((d) => exportRow(d, ctx).map((v, i) => {
    if (i === 0 && typeof v === 'string') return toDate(v)
    return typeof v === 'string' ? guardCell(v) : v
  }))
  const documents = XLSX.utils.aoa_to_sheet([EXPORT_HEADERS, ...rows], { cellDates: true, dateNF: 'yyyy-mm-dd' })
  documents['!cols'] = EXPORT_HEADERS.map((h) => ({ wch: Math.max(10, h.length + 2) }))

  const { currencies, categories } = aggregate(docs)
  const byCategory = XLSX.utils.aoa_to_sheet([
    ['Category', 'Currency', 'Count', 'Total', 'Tax'],
    ...categories.map((c) => [guardCell(c.category), c.currency, c.count, fromCents(c.totalCents), fromCents(c.taxCents)]),
  ])
  const summary = XLSX.utils.aoa_to_sheet([
    ['Currency', 'Count', 'Total', 'Tax', 'Average'],
    ...currencies.map((c) => [c.currency, c.count, fromCents(c.totalCents), fromCents(c.taxCents), fromCents(Math.round(c.totalCents / c.count))]),
  ])

  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, documents, 'Documents')
  XLSX.utils.book_append_sheet(wb, byCategory, 'By category')
  XLSX.utils.book_append_sheet(wb, summary, 'Summary')
  wb.Props = { Title: `Tax Steps · ${ctx.label}`, Author: 'Tax Steps' }
  return new Uint8Array(XLSX.write(wb, { type: 'array', bookType: 'xlsx' }) as ArrayBuffer)
}
