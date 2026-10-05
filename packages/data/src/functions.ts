// Edge Function calls. supabase-js attaches the user's JWT; errors come back as { error: { code } }.
import {
  AppError, ERROR_MESSAGES, ExtractionResponseSchema, type ErrorCode, type ExportRequest, type ExtractRequest,
  type ExtractionResponse,
} from '@taxsteps/core'
import type { TaxStepsClient } from './client.ts'

const isCode = (c: unknown): c is ErrorCode => typeof c === 'string' && c in ERROR_MESSAGES

async function toAppError(error: unknown): Promise<AppError> {
  const e = error as { name?: string; context?: unknown }
  if (e?.name === 'FunctionsFetchError' || e?.name === 'FunctionsRelayError') return new AppError('NETWORK')
  const ctx = e?.context
  if (ctx instanceof Response) {
    try {
      const body = (await ctx.json()) as { error?: { code?: unknown; message?: unknown } }
      const code = body.error?.code
      if (isCode(code)) {
        const msg = typeof body.error?.message === 'string' ? body.error.message : undefined
        return new AppError(code, msg, ctx.status)
      }
    } catch {
      // fall through
    }
    return new AppError(ctx.status === 401 ? 'UNAUTHORIZED' : 'INTERNAL', undefined, ctx.status)
  }
  return new AppError('INTERNAL')
}

export async function invokeFunction<T>(c: TaxStepsClient, name: string, body: unknown): Promise<T> {
  let result: { data: unknown; error: unknown }
  try {
    result = await c.functions.invoke(name, { body: body as Record<string, unknown> })
  } catch {
    throw new AppError('NETWORK')
  }
  if (result.error) throw await toAppError(result.error)
  return result.data as T
}

export async function extractDocument(c: TaxStepsClient, req: ExtractRequest): Promise<ExtractionResponse> {
  return ExtractionResponseSchema.parse(await invokeFunction<unknown>(c, 'extract-document', req))
}

export type ExportFile = { bytes: ArrayBuffer; filename: string; contentType: string }

function base64ToBytes(b64: string): ArrayBuffer {
  const bin = atob(b64)
  const out = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i)
  return out.buffer
}

/** The export function returns JSON { filename, contentType, base64 } so web and React Native handle it identically. */
export async function exportDocuments(c: TaxStepsClient, req: ExportRequest): Promise<ExportFile> {
  const res = await invokeFunction<{ filename: string; contentType: string; base64: string }>(c, 'export-documents', req)
  if (!res?.base64) throw new AppError('EXPORT_FAILED')
  return { bytes: base64ToBytes(res.base64), filename: res.filename, contentType: res.contentType }
}

export async function deleteAccount(c: TaxStepsClient): Promise<void> {
  await invokeFunction<{ ok: true }>(c, 'delete-account', { confirm: 'DELETE' })
}
