// Strict JSON schema sent to the model (mirrors ModelOutputSchema in packages/core).
import { CONFIDENCE_KEYS } from '../core.ts'

const str = (description?: string) => ({ type: ['string', 'null'], ...(description ? { description } : {}) })
const num = (description?: string) => ({ type: ['number', 'null'], ...(description ? { description } : {}) })

const properties = {
  is_document: { type: 'boolean', description: 'False if the image is not a receipt, invoice, bill or expense document.' },
  unreadable_reason: str('Why the document could not be read, else null.'),
  document_type: { type: ['string', 'null'], enum: ['receipt', 'invoice', 'bill', 'expense', null] },
  merchant_name: str('Business that issued the document.'),
  title: str('Short description of what was bought, e.g. "Office supplies".'),
  description: str('Optional longer description, e.g. main items.'),
  category: str('One of the provided category names exactly, or null.'),
  total: num('Total paid including tax.'),
  subtotal: num('Amount before tax, if shown.'),
  tax_amount: num('Tax amount (GST/VAT/sales tax), if shown.'),
  tax_label: str('Tax name as printed, e.g. GST, VAT, MwSt.'),
  currency: str('ISO 4217 code, e.g. NZD.'),
  transaction_date: str('Date of the transaction as YYYY-MM-DD.'),
  invoice_number: str('Invoice or receipt number.'),
  payment_method: str('e.g. Visa, EFTPOS, Cash.'),
  confidence: {
    type: 'object',
    additionalProperties: false,
    description: 'Confidence 0-1 for each extracted field.',
    properties: Object.fromEntries(CONFIDENCE_KEYS.map((k) => [k, { type: 'number' }])),
    required: [...CONFIDENCE_KEYS],
  },
}

export const MODEL_JSON_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  properties,
  required: Object.keys(properties),
} as const
