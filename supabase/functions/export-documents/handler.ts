// POST { format, filter, label } → { filename, contentType, base64 }.
import type { SupabaseClient } from '@supabase/supabase-js'
import { encodeBase64 } from '@std/encoding'
import { EXPORT_HEADERS, ExportRequestSchema, exportRow, toCsv, uiLocale, type DocumentFilter, type ExportDoc } from '../_shared/core.ts'
import type { UserContext } from '../_shared/auth.ts'
import { errorResponse, json, preflight, readJson, requirePost } from '../_shared/http.ts'
import type { ExportContext } from './context.ts'
import { buildPdf } from './pdf.ts'
import { buildXlsx } from './xlsx.ts'

export type ExportDeps = {
  requireUser: (req: Request) => Promise<UserContext>
  enforceRateLimit: (userId: string) => Promise<void>
  fetchExportDocs: (client: SupabaseClient, filter: DocumentFilter) => Promise<ExportDoc[]>
  getProfile: (ctx: UserContext) => Promise<{ business_name: string | null; timezone: string; locale: string }>
  fonts: () => Promise<{ regular: Uint8Array; bold: Uint8Array }>
  now?: () => Date
}

const TYPES = {
  csv: 'text/csv; charset=utf-8',
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  pdf: 'application/pdf',
} as const

export function slug(label: string): string {
  return label.normalize('NFKD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60) || 'export'
}

export async function handleExport(req: Request, deps: ExportDeps): Promise<Response> {
  const origin = req.headers.get('origin')
  const pre = preflight(req)
  if (pre) return pre
  try {
    requirePost(req)
    const user = await deps.requireUser(req)
    const body = ExportRequestSchema.parse(await readJson(req, 1024 * 1024))
    await deps.enforceRateLimit(user.userId)

    const [docs, profile] = await Promise.all([deps.fetchExportDocs(user.client, body.filter), deps.getProfile(user)])
    const ctx: ExportContext = {
      label: body.label, businessName: profile.business_name, timeZone: profile.timezone, locale: uiLocale(profile.locale),
      generatedAt: deps.now?.() ?? new Date(),
    }

    let bytes: Uint8Array
    if (body.format === 'csv') {
      bytes = new TextEncoder().encode(toCsv([EXPORT_HEADERS, ...docs.map((d) => exportRow(d, ctx))], { bom: true }))
    } else if (body.format === 'xlsx') {
      bytes = buildXlsx(docs, ctx)
    } else {
      bytes = await buildPdf(docs, ctx, await deps.fonts())
    }

    return json({ filename: `tax-steps-${slug(body.label)}.${body.format}`, contentType: TYPES[body.format], base64: encodeBase64(bytes) }, { origin })
  } catch (e) {
    return errorResponse(e, origin, 'export-documents')
  }
}
