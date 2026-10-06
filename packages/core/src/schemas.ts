// zod schemas shared by clients and Edge Functions. Limits mirror the DB constraints.
import { z } from 'zod'
import { isISODate } from './dates.ts'
import { FIELD_KEYS, type FieldKey } from './registry.ts'

export const ExpenseTypeSchema = z.enum(['business', 'personal'])
export type ExpenseType = z.infer<typeof ExpenseTypeSchema>
export const DocumentStatusSchema = z.enum(['complete', 'needs_review'])
export type DocumentStatus = z.infer<typeof DocumentStatusSchema>
export const DocumentSourceSchema = z.enum(['scan', 'upload', 'manual'])
export type DocumentSource = z.infer<typeof DocumentSourceSchema>
export const DocumentTypeCodeSchema = z.enum(['receipt', 'invoice', 'bill', 'expense'])

const FieldKeySchema = z.enum(FIELD_KEYS as [FieldKey, ...FieldKey[]])
const nStr = z.string().nullable()
const nNum = z.number().nullable()

// ── Raw model output (mirrors the strict JSON schema sent to the AI provider) ──
export const CONFIDENCE_KEYS = [
  'merchant_name', 'title', 'document_type', 'transaction_date', 'invoice_number', 'subtotal',
  'tax_amount', 'total', 'currency', 'tax_label', 'payment_method', 'category', 'description',
] as const

export const ModelOutputSchema = z.object({
  is_document: z.boolean(),
  unreadable_reason: nStr,
  document_type: DocumentTypeCodeSchema.nullable(),
  merchant_name: nStr,
  title: nStr,
  description: nStr,
  category: nStr,
  total: nNum,
  subtotal: nNum,
  tax_amount: nNum,
  tax_label: nStr,
  currency: nStr,
  transaction_date: nStr,
  invoice_number: nStr,
  payment_method: nStr,
  confidence: z.record(z.enum(CONFIDENCE_KEYS), z.number()),
})
export type ModelOutput = z.infer<typeof ModelOutputSchema>

// ── What extract-document returns ──
export const ExtractedFieldsSchema = z.object({
  document_type: DocumentTypeCodeSchema,
  merchant_name: nStr,
  title: nStr,
  description: nStr,
  category: nStr,
  amount: nNum,
  subtotal: nNum,
  tax_amount: nNum,
  tax_label: nStr,
  currency: nStr,
  transaction_date: nStr,
  invoice_number: nStr,
  payment_method: nStr,
})
export type ExtractedFields = z.infer<typeof ExtractedFieldsSchema>

export const ExtractionWarningSchema = z.object({
  code: z.enum(['TOTAL_MISSING', 'DATE_MISSING', 'MERCHANT_MISSING', 'TAX_EXCEEDS_TOTAL', 'TAX_RATE_MISMATCH', 'FUTURE_DATE']),
  field: FieldKeySchema.nullable(),
  message: z.string(),
})
export type ExtractionWarning = z.infer<typeof ExtractionWarningSchema>

export const ExtractionResponseSchema = z.object({
  fields: ExtractedFieldsSchema,
  confidence: z.partialRecord(FieldKeySchema, z.number()),
  warnings: z.array(ExtractionWarningSchema),
  model: z.string(),
})
export type ExtractionResponse = z.infer<typeof ExtractionResponseSchema>

export const ExtractionHintsSchema = z.object({
  categories: z.array(z.string().max(100)).max(200),
  country: z.string().length(2).nullable(),
  currency: z.string().length(3).nullable(),
})
export type ExtractionHints = z.infer<typeof ExtractionHintsSchema>

export const ExtractRequestSchema = z.object({
  file: z.string().min(1),
  mimeType: z.string().max(100),
  filename: z.string().max(200).optional(),
  hints: ExtractionHintsSchema,
})
export type ExtractRequest = z.infer<typeof ExtractRequestSchema>

// ── Documents ──
export const MAX_AMOUNT = 999_999_999_999.99

export const DocumentInputSchema = z.object({
  id: z.uuid(),
  document_type: z.string().min(1).max(40),
  merchant_name: z.string().trim().min(1).max(200),
  title: z.string().max(200).nullable(),
  description: z.string().max(2000).nullable(),
  category_id: z.uuid().nullable(),
  expense_type: ExpenseTypeSchema,
  amount: z.number().min(0).max(MAX_AMOUNT),
  tax_amount: z.number().min(0).max(MAX_AMOUNT).nullable(),
  tax_label: z.string().max(20).nullable(),
  currency: z.string().regex(/^[A-Z]{3}$/),
  transaction_date: z.string().refine((d) => isISODate(d) && d >= '1900-01-01', 'Invalid date'),
  invoice_number: z.string().max(100).nullable(),
  payment_method: z.string().max(60).nullable(),
  status: DocumentStatusSchema,
  source: DocumentSourceSchema,
  metadata: z.record(z.string(), z.unknown()),
}).refine((d) => d.tax_amount === null || d.tax_amount <= d.amount, { path: ['tax_amount'], message: "Tax can't be more than the total" })
export type DocumentInput = z.infer<typeof DocumentInputSchema>

export type DocumentRow = DocumentInput & { user_id: string; created_at: string; updated_at: string }

// ── Profiles and categories ──
export const THEMES = ['fresh', 'classic'] as const
export type ThemeName = (typeof THEMES)[number]
/** Picker copy plus a preview swatch (ground, accent, second accent) for each theme. */
export const THEME_OPTIONS: { value: ThemeName; label: string; note: string; swatch: [string, string, string] }[] = [
  { value: 'fresh', label: 'Fresh', note: 'Off-white, lilac and lime', swatch: ['#f5f5f1', '#7e6be0', '#c6db5c'] },
  { value: 'classic', label: 'Classic', note: 'Cream, terracotta and sage', swatch: ['#f5ead8', '#c67139', '#7a8a5e'] },
]

export type Profile = {
  id: string
  full_name: string | null
  business_name: string | null
  tax_number: string | null
  country: string | null
  currency: string
  timezone: string
  locale: string
  fy_start_month: number
  fy_start_day: number
  theme: ThemeName
  terms_version: string | null
  terms_accepted_at: string | null
  created_at: string
  updated_at: string
}

export const ProfileUpdateSchema = z.object({
  full_name: z.string().trim().max(120).nullable(),
  business_name: z.string().trim().max(160).nullable(),
  tax_number: z.string().trim().max(40).nullable(),
  country: z.string().regex(/^[A-Z]{2}$/).nullable(),
  currency: z.string().regex(/^[A-Z]{3}$/),
  timezone: z.string().min(1).max(64),
  locale: z.string().min(2).max(35).refine((l) => {
    try {
      return Intl.getCanonicalLocales(l).length === 1 && Boolean(new Intl.NumberFormat(l))
    } catch {
      return false
    }
  }, 'Use a locale like en-NZ or en-US'),
  fy_start_month: z.number().int().min(1).max(12),
  fy_start_day: z.number().int().min(1).max(31),
  theme: z.enum(THEMES),
}).partial()
export type ProfileUpdate = z.infer<typeof ProfileUpdateSchema>

export type Category = {
  id: string
  user_id: string
  name: string
  icon: string
  color: string
  sort: number
  archived: boolean
}

export const CategoryInputSchema = z.object({
  id: z.uuid().optional(),
  name: z.string().trim().min(1).max(60),
  icon: z.string().min(1).max(40),
  color: z.string().min(1).max(40),
  sort: z.number().int().min(0).max(10_000).optional(),
  archived: z.boolean().optional(),
})
export type CategoryInput = z.infer<typeof CategoryInputSchema>
