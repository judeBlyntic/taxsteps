import { regionFor, type ExtractionHints } from '../core.ts'

export function buildInstructions(hints: ExtractionHints): string {
  const region = regionFor(hints.country)
  const categories = hints.categories.length ? hints.categories.map((c) => `"${c}"`).join(', ') : '(none)'
  return [
    'You extract structured data from photos or PDFs of receipts, invoices and bills for an expense-tracking app.',
    'Documents may come from any country and be in any language. Read them carefully; never invent values.',
    'If a field is not present or not legible, return null for it and give it low confidence.',
    'Rules:',
    '- total is the final amount paid INCLUDING tax. subtotal is before tax. Use plain numbers (no symbols or thousands separators).',
    '- transaction_date must be YYYY-MM-DD. Resolve day/month order using the country and currency on the document.',
    `- currency is an ISO 4217 code inferred from symbols, text or country. If unclear, use ${hints.currency ?? 'null'}.`,
    `- tax_label is the tax name printed on the document. The user's region usually calls it "${region.taxLabel}".`,
    `- category must be exactly one of: ${categories} — or null if none fits.`,
    '- title is a short human summary of the purchase (2–5 words).',
    '- confidence: 0–1 per field; use < 0.6 when guessing or partially legible.',
    '- Set is_document=false (and explain in unreadable_reason) if the image is not a receipt, invoice, bill or expense document.',
  ].join('\n')
}
