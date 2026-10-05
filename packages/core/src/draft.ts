// Review-form state shared by web and mobile: build a draft from an extraction or
// a saved row, then validate it into a DocumentInput on Save.
import { formatDate, parseUserDate, type ISODate } from './dates.ts'
import { formatAmountInput, parseAmount, toCents } from './money.ts'
import { checkTaxRate, regionFor } from './regions.ts'
import { EXTRACTION_FIELDS, FIELD_KEYS, type FieldKey } from './registry.ts'
import {
  DocumentInputSchema, type Category, type DocumentInput, type DocumentRow, type DocumentSource, type DocumentStatus,
  type ExpenseType, type ExtractionResponse, type ExtractionWarning, type Profile,
} from './schemas.ts'
import { deriveStatus } from './status.ts'

export type Draft = {
  id: string
  values: Record<FieldKey, string>
  expense_type: ExpenseType
  source: DocumentSource
  flags: FieldKey[]
  warnings: ExtractionWarning[]
  statusOverride: DocumentStatus | null
}

export type DraftContext = {
  profile: Pick<Profile, 'currency' | 'country' | 'locale'>
  categories: Category[]
  today: ISODate
  newId: () => string
}

export type DraftResult = { ok: true; input: DocumentInput } | { ok: false; errors: Partial<Record<FieldKey, string>> }

const LOW_CONFIDENCE = 0.75
const blankValues = (): Record<FieldKey, string> =>
  Object.fromEntries(FIELD_KEYS.map((k) => [k, ''])) as Record<FieldKey, string>
const amountText = (v: number | null | undefined, locale: string) =>
  typeof v === 'number' ? formatAmountInput(toCents(v), locale) : ''

export function emptyDraft(ctx: DraftContext): Draft {
  const values = blankValues()
  values.transaction_date = formatDate(ctx.today, ctx.profile.locale)
  values.currency = ctx.profile.currency
  values.tax_label = regionFor(ctx.profile.country).taxLabel
  values.document_type = 'receipt'
  return { id: ctx.newId(), values, expense_type: 'business', source: 'manual', flags: [], warnings: [], statusOverride: null }
}

export function draftFromExtraction(res: ExtractionResponse, ctx: DraftContext, source: 'scan' | 'upload'): Draft {
  const base = emptyDraft(ctx)
  const f = res.fields
  const locale = ctx.profile.locale
  const category = f.category
    ? ctx.categories.find((c) => !c.archived && c.name.toLowerCase() === f.category!.toLowerCase())
    : undefined
  const values: Record<FieldKey, string> = {
    ...base.values,
    merchant_name: f.merchant_name ?? '',
    title: f.title ?? '',
    description: f.description ?? '',
    document_type: f.document_type,
    transaction_date: f.transaction_date ? formatDate(f.transaction_date, locale) : '',
    invoice_number: f.invoice_number ?? '',
    payment_method: f.payment_method ?? '',
    amount: amountText(f.amount, locale),
    tax_amount: amountText(f.tax_amount, locale),
    subtotal: amountText(f.subtotal, locale),
    currency: f.currency ?? base.values.currency,
    tax_label: f.tax_label ?? base.values.tax_label,
    category_id: category?.id ?? '',
  }
  const flags = new Set<FieldKey>()
  for (const [k, v] of Object.entries(res.confidence) as [FieldKey, number][]) if (v < LOW_CONFIDENCE) flags.add(k)
  for (const w of res.warnings) if (w.field) flags.add(w.field)
  for (const d of EXTRACTION_FIELDS) if (d.required && !values[d.key]) flags.add(d.key)
  return { ...base, values, source, flags: [...flags], warnings: res.warnings }
}

function statusFor(amountCents: number, taxCents: number | null, categoryId: string | null, currency: string, country: string | null): DocumentStatus {
  const region = regionFor(country)
  const taxCheck = taxCents === null || currency !== region.currency ? 'unchecked' : checkTaxRate(amountCents, taxCents, region)
  return deriveStatus({ taxCents, categoryId, taxCheck })
}

export function draftFromRow(row: DocumentRow, ctx: DraftContext): Draft {
  const locale = ctx.profile.locale
  const subtotal = typeof row.metadata.subtotal === 'number' ? row.metadata.subtotal : null
  const values: Record<FieldKey, string> = {
    merchant_name: row.merchant_name,
    title: row.title ?? '',
    document_type: row.document_type,
    transaction_date: formatDate(row.transaction_date, locale),
    invoice_number: row.invoice_number ?? '',
    subtotal: amountText(subtotal, locale),
    tax_amount: amountText(row.tax_amount, locale),
    amount: amountText(row.amount, locale),
    currency: row.currency,
    tax_label: row.tax_label ?? '',
    payment_method: row.payment_method ?? '',
    category_id: row.category_id ?? '',
    description: row.description ?? '',
  }
  const derived = statusFor(toCents(row.amount), row.tax_amount === null ? null : toCents(row.tax_amount), row.category_id, row.currency, ctx.profile.country)
  return {
    id: row.id, values, expense_type: row.expense_type, source: row.source, flags: [], warnings: [],
    statusOverride: derived === row.status ? null : row.status,
  }
}

const opt = (s: string) => (s.trim() ? s.trim() : null)

export function draftToInput(draft: Draft, ctx: DraftContext): DraftResult {
  const v = draft.values
  const locale = ctx.profile.locale
  const errors: Partial<Record<FieldKey, string>> = {}
  const example = formatAmountInput(8745, locale)

  for (const d of EXTRACTION_FIELDS) {
    if (d.required && !v[d.key].trim()) errors[d.key] = 'Required'
    else if (d.maxLength && v[d.key].trim().length > d.maxLength) errors[d.key] = `Too long (max ${d.maxLength} characters)`
  }

  const parseMoney = (key: FieldKey): number | null => {
    if (!v[key].trim()) return null
    const cents = parseAmount(v[key], locale)
    if (cents === null) errors[key] ??= `Enter a valid amount, e.g. ${example}`
    return cents
  }
  const amountCents = parseMoney('amount')
  const taxCents = parseMoney('tax_amount')
  const subtotalCents = parseMoney('subtotal')

  let date: ISODate | null = null
  if (v.transaction_date.trim()) {
    date = parseUserDate(v.transaction_date, locale)
    const maxDate = `${Number(ctx.today.slice(0, 4)) + 1}${ctx.today.slice(4)}`
    if (!date || date < '1900-01-01' || date > maxDate) errors.transaction_date ??= `Enter a valid date, e.g. ${formatDate(ctx.today, locale)}`
  }

  const currency = v.currency.trim().toUpperCase()
  if (currency && !/^[A-Z]{3}$/.test(currency)) errors.currency ??= 'Use a 3-letter currency code, e.g. NZD'
  if (amountCents !== null && taxCents !== null && taxCents > amountCents) errors.tax_amount ??= "Tax can't be more than the total"

  if (Object.keys(errors).length > 0 || amountCents === null || !date) return { ok: false, errors }

  const categoryId = ctx.categories.some((c) => c.id === v.category_id) ? v.category_id : null
  const input: DocumentInput = {
    id: draft.id,
    document_type: v.document_type.trim(),
    merchant_name: v.merchant_name.trim(),
    title: opt(v.title),
    description: opt(v.description),
    category_id: categoryId,
    expense_type: draft.expense_type,
    amount: amountCents / 100,
    tax_amount: taxCents === null ? null : taxCents / 100,
    tax_label: opt(v.tax_label),
    currency,
    transaction_date: date,
    invoice_number: opt(v.invoice_number),
    payment_method: opt(v.payment_method),
    status: draft.statusOverride ?? statusFor(amountCents, taxCents, categoryId, currency, ctx.profile.country),
    source: draft.source,
    metadata: subtotalCents === null ? {} : { subtotal: subtotalCents / 100 },
  }
  const parsed = DocumentInputSchema.safeParse(input)
  if (!parsed.success) {
    for (const issue of parsed.error.issues) {
      const key = issue.path[0]
      if (typeof key === 'string' && (FIELD_KEYS as string[]).includes(key)) errors[key as FieldKey] ??= issue.message
    }
    return { ok: false, errors: Object.keys(errors).length ? errors : { merchant_name: 'Please check the details' } }
  }
  return { ok: true, input: parsed.data }
}
