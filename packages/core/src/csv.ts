// CSV + export row shaping (shared by the export function and Google Sheets export).
import { formatTimestamp } from './dates.ts'
import { DOCUMENT_TYPES } from './registry.ts'
import type { DocumentRow } from './schemas.ts'

export type Cell = string | number | null
export type ExportDoc = DocumentRow & { category_name: string | null }

/** Prefixes a quote so spreadsheet apps treat the value as text, not a formula. */
export function guardCell(v: string): string {
  return /^[=+\-@\t\r]/.test(v) ? `'${v}` : v
}

function csvCell(v: Cell): string {
  if (v === null) return ''
  if (typeof v === 'number') return String(v)
  const s = guardCell(v)
  return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}

export function toCsv(rows: Cell[][], opts: { bom?: boolean } = {}): string {
  const body = rows.map((r) => `${r.map(csvCell).join(',')}\r\n`).join('')
  return opts.bom ? `﻿${body}` : body
}

export const EXPORT_HEADERS = [
  'Date', 'Merchant', 'Title', 'Category', 'Description', 'Type', 'Document type', 'Total', 'Tax', 'Tax label',
  'Currency', 'Invoice number', 'Payment method', 'Status', 'Created', 'Updated',
]

const typeLabel = (code: string) => DOCUMENT_TYPES.find((t) => t.code === code)?.label ?? code

export function exportRow(d: ExportDoc, ctx: { timeZone: string; locale: string }): Cell[] {
  return [
    d.transaction_date,
    d.merchant_name,
    d.title ?? '',
    d.category_name ?? '',
    d.description ?? '',
    d.expense_type === 'business' ? 'Business' : 'Personal',
    typeLabel(d.document_type),
    d.amount,
    d.tax_amount,
    d.tax_label ?? '',
    d.currency,
    d.invoice_number ?? '',
    d.payment_method ?? '',
    d.status === 'complete' ? 'Complete' : 'Needs review',
    formatTimestamp(d.created_at, ctx.timeZone, ctx.locale),
    formatTimestamp(d.updated_at, ctx.timeZone, ctx.locale),
  ]
}
