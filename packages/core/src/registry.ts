// Registries that drive the UI and validation. Adding a field, category or document
// type here (plus a DB row/column where noted) is all it takes to extend the app.
import type { TaxRegion } from './regions.ts'

export type DocumentTypeCode = 'receipt' | 'invoice' | 'bill' | 'expense'

export const DOCUMENT_TYPES: { code: DocumentTypeCode; label: string }[] = [
  { code: 'receipt', label: 'Receipt' },
  { code: 'invoice', label: 'Invoice' },
  { code: 'bill', label: 'Bill' },
  { code: 'expense', label: 'Expense' },
]

const COLORS = ['accent-2-300', 'accent-300', 'neutral-300', 'accent-200', 'accent-2-200', 'neutral-200', 'accent-100']

/** Seeded for every new user (the SQL seed in the schema migration mirrors this list). */
export const DEFAULT_CATEGORIES: { name: string; icon: string; color: string }[] = [
  ['Advertising', 'megaphone'], ['Vehicle', 'car'], ['Fuel', 'fuel'], ['Travel', 'plane'], ['Office', 'briefcase'],
  ['Equipment', 'wrench'], ['Software', 'monitor'], ['Phone', 'smartphone'], ['Internet', 'wifi'],
  ['Professional Services', 'handshake'], ['Insurance', 'shield-check'], ['Rent', 'building'], ['Meals', 'utensils'],
  ['Other', 'tag'],
].map(([name, icon], i) => ({ name: name!, icon: icon!, color: COLORS[i % COLORS.length]! }))

export const PAYMENT_METHODS = [
  'Card', 'Visa', 'Mastercard', 'Amex', 'EFTPOS', 'Debit card', 'Cash', 'Bank transfer', 'PayPal', 'Apple Pay', 'Google Pay', 'Other',
]

export type FieldKey =
  | 'merchant_name' | 'title' | 'document_type' | 'transaction_date' | 'invoice_number' | 'subtotal'
  | 'tax_amount' | 'amount' | 'currency' | 'tax_label' | 'payment_method' | 'category_id' | 'description'

export type FieldDef = {
  key: FieldKey
  label: string
  kind: 'text' | 'textarea' | 'money' | 'date' | 'category' | 'documentType' | 'currency' | 'payment'
  required: boolean
  storage: 'column' | 'metadata'
  maxLength?: number
  span: 'full' | 'half'
}

const f = (
  key: FieldKey, label: string, kind: FieldDef['kind'], span: FieldDef['span'],
  opts: { required?: boolean; maxLength?: number; storage?: FieldDef['storage'] } = {},
): FieldDef => ({ key, label, kind, span, required: opts.required ?? false, storage: opts.storage ?? 'column', ...(opts.maxLength ? { maxLength: opts.maxLength } : {}) })

/** Review-form fields in display order. */
export const EXTRACTION_FIELDS: FieldDef[] = [
  f('merchant_name', 'Merchant', 'text', 'full', { required: true, maxLength: 200 }),
  f('title', 'Title', 'text', 'half', { maxLength: 200 }),
  f('document_type', 'Document type', 'documentType', 'half', { required: true }),
  f('transaction_date', 'Date', 'date', 'half', { required: true }),
  f('invoice_number', 'Invoice / receipt #', 'text', 'half', { maxLength: 100 }),
  f('subtotal', 'Subtotal', 'money', 'half', { storage: 'metadata' }),
  f('tax_amount', 'Tax', 'money', 'half'),
  f('amount', 'Total', 'money', 'half', { required: true }),
  f('currency', 'Currency', 'currency', 'half', { required: true }),
  f('tax_label', 'Tax label', 'text', 'half', { maxLength: 20 }),
  f('payment_method', 'Payment method', 'payment', 'half', { maxLength: 60 }),
  f('category_id', 'Category', 'category', 'full'),
  f('description', 'Description', 'textarea', 'full', { maxLength: 2000 }),
]

export const FIELD_KEYS: FieldKey[] = EXTRACTION_FIELDS.map((d) => d.key)

export function fieldLabel(def: FieldDef, region: TaxRegion): string {
  return def.key === 'tax_amount' ? region.taxLabel : def.label
}
