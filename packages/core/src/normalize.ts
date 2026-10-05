// Turns untrusted AI output into validated, normalised review fields + warnings.
import { isISODate, type ISODate } from './dates.ts'
import { AppError } from './errors.ts'
import { toCents, fromCents } from './money.ts'
import { checkTaxRate, regionFor } from './regions.ts'
import { EXTRACTION_FIELDS, type FieldKey } from './registry.ts'
import { CONFIDENCE_KEYS, type ExtractionHints, type ExtractionResponse, type ExtractionWarning, type ModelOutput } from './schemas.ts'

const maxLen = Object.fromEntries(EXTRACTION_FIELDS.map((d) => [d.key, d.maxLength])) as Partial<Record<FieldKey, number>>

function text(v: string | null, key: FieldKey): string | null {
  const s = v?.trim()
  if (!s) return null
  const limit = maxLen[key]
  return limit ? s.slice(0, limit) : s
}

function money(v: number | null): number | null {
  return v !== null && Number.isFinite(v) && v >= 0 ? fromCents(toCents(v)) : null
}

const CONFIDENCE_TO_FIELD: Record<(typeof CONFIDENCE_KEYS)[number], FieldKey> = {
  merchant_name: 'merchant_name', title: 'title', document_type: 'document_type', transaction_date: 'transaction_date',
  invoice_number: 'invoice_number', subtotal: 'subtotal', tax_amount: 'tax_amount', total: 'amount', currency: 'currency',
  tax_label: 'tax_label', payment_method: 'payment_method', category: 'category_id', description: 'description',
}

const WARNING_COPY: Record<ExtractionWarning['code'], string> = {
  MERCHANT_MISSING: "We couldn't find the merchant name. Please add it.",
  TOTAL_MISSING: "We couldn't find the total. Please enter it.",
  DATE_MISSING: "We couldn't read the date. Please enter it.",
  TAX_EXCEEDS_TOTAL: 'The tax amount is more than the total. Please check both.',
  TAX_RATE_MISMATCH: "The tax doesn't match the usual rate for your region. Please check it.",
  FUTURE_DATE: 'This date is in the future. Please check it.',
}

const warn = (code: ExtractionWarning['code'], field: FieldKey | null): ExtractionWarning => ({ code, field, message: WARNING_COPY[code] })

export function normalizeExtraction(
  raw: ModelOutput, hints: ExtractionHints, today: ISODate,
): Omit<ExtractionResponse, 'model'> {
  if (!raw.is_document) throw new AppError('NOT_A_DOCUMENT')

  const region = regionFor(hints.country)
  const merchant = text(raw.merchant_name, 'merchant_name')
  const amount = money(raw.total)
  const tax = money(raw.tax_amount)
  const rawDate = raw.transaction_date?.trim() ?? null
  const date = rawDate && isISODate(rawDate) ? rawDate : null
  if (!merchant && amount === null && !date) throw new AppError('UNREADABLE')

  const currencyRaw = raw.currency?.trim().toUpperCase()
  const currency = currencyRaw && /^[A-Z]{3}$/.test(currencyRaw) ? currencyRaw : hints.currency?.toUpperCase() ?? null
  const wanted = raw.category?.trim().toLowerCase()
  const category = wanted ? hints.categories.find((c) => c.toLowerCase() === wanted) ?? null : null

  const warnings: ExtractionWarning[] = []
  if (!merchant) warnings.push(warn('MERCHANT_MISSING', 'merchant_name'))
  if (amount === null) warnings.push(warn('TOTAL_MISSING', 'amount'))
  if (!date) warnings.push(warn('DATE_MISSING', 'transaction_date'))
  else if (date > today) warnings.push(warn('FUTURE_DATE', 'transaction_date'))
  if (amount !== null && tax !== null) {
    if (tax > amount) warnings.push(warn('TAX_EXCEEDS_TOTAL', 'tax_amount'))
    else if ((!currency || currency === region.currency) && checkTaxRate(toCents(amount), toCents(tax), region) === 'mismatch') {
      warnings.push(warn('TAX_RATE_MISMATCH', 'tax_amount'))
    }
  }

  const confidence: Partial<Record<FieldKey, number>> = {}
  for (const k of CONFIDENCE_KEYS) {
    const v = raw.confidence[k]
    if (typeof v === 'number' && Number.isFinite(v)) confidence[CONFIDENCE_TO_FIELD[k]] = Math.min(1, Math.max(0, v))
  }

  return {
    fields: {
      document_type: raw.document_type ?? 'receipt',
      merchant_name: merchant,
      title: text(raw.title, 'title'),
      description: text(raw.description, 'description'),
      category,
      amount,
      subtotal: money(raw.subtotal),
      tax_amount: tax,
      tax_label: text(raw.tax_label, 'tax_label') ?? (tax !== null ? region.taxLabel : null),
      currency,
      transaction_date: date,
      invoice_number: text(raw.invoice_number, 'invoice_number'),
      payment_method: text(raw.payment_method, 'payment_method'),
    },
    confidence,
    warnings,
  }
}
