// Shared test fixtures (synthetic data only). Imported by core tests and Deno function tests.
import type { ModelOutput, ExtractionResponse, Category, DocumentRow } from './schemas.ts'

const conf = (v: number) => ({
  merchant_name: v, title: v, document_type: v, transaction_date: v, invoice_number: v, subtotal: v,
  tax_amount: v, total: v, currency: v, tax_label: v, payment_method: v, category: v, description: v,
})

export const RECEIPT_RAW: ModelOutput = {
  is_document: true, unreadable_reason: null, document_type: 'receipt',
  merchant_name: ' Countdown ', title: 'Groceries', description: null, category: 'groceries',
  total: 87.45, subtotal: 76.04, tax_amount: 11.41, tax_label: 'GST', currency: 'nzd',
  transaction_date: '2026-10-05', invoice_number: null, payment_method: 'EFTPOS',
  confidence: { ...conf(0.95), tax_amount: 0.6 },
}

export const INVOICE_RAW: ModelOutput = {
  is_document: true, unreadable_reason: null, document_type: 'invoice',
  merchant_name: 'Acme Design Ltd', title: 'Website retainer', description: 'October retainer', category: 'Office',
  total: 1150, subtotal: 1000, tax_amount: 150, tax_label: 'GST', currency: 'NZD',
  transaction_date: '2026-09-30', invoice_number: 'INV-12345', payment_method: 'Bank transfer',
  confidence: conf(0.9),
}

export const NOT_DOC_RAW: ModelOutput = {
  ...RECEIPT_RAW, is_document: false, unreadable_reason: 'Photo of a cat',
  merchant_name: null, total: null, transaction_date: null,
}

export const EMPTY_RAW: ModelOutput = {
  ...RECEIPT_RAW, merchant_name: null, title: null, total: null, subtotal: null, tax_amount: null,
  transaction_date: null, category: null, confidence: conf(0.1),
}

export const CATEGORY_IDS = {
  groceries: '11111111-1111-4111-8111-111111111111',
  office: '22222222-2222-4222-8222-222222222222',
} as const

export const CATEGORIES: Category[] = [
  { id: CATEGORY_IDS.groceries, user_id: 'u1', name: 'Groceries', icon: 'cart', color: 'accent-200', sort: 0, archived: false },
  { id: CATEGORY_IDS.office, user_id: 'u1', name: 'Office', icon: 'briefcase', color: 'neutral-300', sort: 1, archived: false },
]

export const DOC_ID = '33333333-3333-4333-8333-333333333333'

export function extractionResponse(fields: Partial<ExtractionResponse['fields']> = {}): ExtractionResponse {
  return {
    fields: {
      document_type: 'receipt', merchant_name: 'Countdown', title: 'Groceries', description: null, category: 'Groceries',
      amount: 87.45, subtotal: 76.04, tax_amount: 11.41, tax_label: 'GST', currency: 'NZD',
      transaction_date: '2026-10-05', invoice_number: null, payment_method: 'EFTPOS', ...fields,
    },
    confidence: { merchant_name: 0.95, amount: 0.95, tax_amount: 0.6, transaction_date: 0.95, category_id: 0.9 },
    warnings: [],
    model: 'test-model',
  }
}

export const SAVED_ROW: DocumentRow = {
  id: DOC_ID, user_id: 'u1', document_type: 'receipt', merchant_name: 'Mitre 10', title: 'Drill bits', description: null,
  category_id: CATEGORY_IDS.office, expense_type: 'business', amount: 115, tax_amount: 15, tax_label: 'GST', currency: 'NZD',
  transaction_date: '2026-09-25', invoice_number: '548921', payment_method: 'Visa', status: 'complete', source: 'scan',
  metadata: { subtotal: 100 }, created_at: '2026-09-25T01:00:00Z', updated_at: '2026-09-25T01:00:00Z',
}
