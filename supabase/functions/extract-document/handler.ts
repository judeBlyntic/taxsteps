// POST { file (base64), mimeType, filename?, hints } → ExtractionResponse.
// The file exists only in this request's memory: it is never written to disk, storage, the DB or logs.
import { AppError, ExtractRequestSchema, type ExtractionHints, type ExtractionResponse } from '../_shared/core.ts'
import type { UserContext } from '../_shared/auth.ts'
import { errorResponse, json, preflight, readJson, requirePost } from '../_shared/http.ts'
import type { ExtractionFile } from '../_shared/extraction/provider.ts'

export type ExtractDeps = {
  requireUser: (req: Request) => Promise<UserContext>
  enforceRateLimit: (userId: string) => Promise<void>
  getTimeZone: (ctx: UserContext) => Promise<string>
  service: { extract(file: ExtractionFile, hints: ExtractionHints, timeZone: string): Promise<ExtractionResponse> }
}

const MAX_BODY_BYTES = 15 * 1024 * 1024
const MAX_FILE_BYTES = 10 * 1024 * 1024

const SIGNATURES: Record<string, (b: Uint8Array) => boolean> = {
  'image/jpeg': (b) => b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff,
  'image/png': (b) => b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47,
  'image/webp': (b) => String.fromCharCode(...b.slice(0, 4)) === 'RIFF' && String.fromCharCode(...b.slice(8, 12)) === 'WEBP',
  'application/pdf': (b) => String.fromCharCode(...b.slice(0, 5)) === '%PDF-',
}

/** Checks the declared type against the file's magic bytes. */
function matchesSignature(base64: string, mimeType: string): boolean {
  const check = SIGNATURES[mimeType]
  if (!check) return false
  try {
    const head = atob(base64.slice(0, 24))
    return check(Uint8Array.from(head, (c) => c.charCodeAt(0)))
  } catch {
    return false
  }
}

export async function handleExtract(req: Request, deps: ExtractDeps): Promise<Response> {
  const origin = req.headers.get('origin')
  const pre = preflight(req)
  if (pre) return pre
  try {
    requirePost(req)
    const ctx = await deps.requireUser(req)
    const body = ExtractRequestSchema.parse(await readJson(req, MAX_BODY_BYTES))

    const base64 = body.file.replace(/^data:[^;]+;base64,/, '')
    if (base64.length * 0.75 > MAX_FILE_BYTES) throw new AppError('FILE_TOO_LARGE')
    if (!/^[A-Za-z0-9+/]+={0,2}$/.test(base64) || !matchesSignature(base64, body.mimeType)) {
      throw new AppError('UNSUPPORTED_FILE')
    }

    await deps.enforceRateLimit(ctx.userId)
    const timeZone = await deps.getTimeZone(ctx)
    const file: ExtractionFile = { base64, mimeType: body.mimeType, filename: body.filename ?? 'document' }
    return json(await deps.service.extract(file, body.hints, timeZone), { origin })
  } catch (e) {
    return errorResponse(e, origin, 'extract-document')
  }
}
