// JSON responses, CORS and error mapping. Never logs request bodies or extracted values.
import { AppError, ERROR_MESSAGES } from './core.ts'

function allowedOrigins(): string[] {
  return (Deno.env.get('APP_ALLOWED_ORIGINS') ?? '').split(',').map((s) => s.trim()).filter(Boolean)
}

export function corsHeaders(origin: string | null): Record<string, string> {
  const h: Record<string, string> = {
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-region',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    Vary: 'Origin',
  }
  if (origin && allowedOrigins().includes(origin)) h['Access-Control-Allow-Origin'] = origin
  return h
}

export function json(data: unknown, init: { status?: number; origin?: string | null } = {}): Response {
  return new Response(JSON.stringify(data), {
    status: init.status ?? 200,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', ...corsHeaders(init.origin ?? null) },
  })
}

const isZodError = (e: unknown) => typeof e === 'object' && e !== null && (e as { name?: string }).name === 'ZodError'

export function errorResponse(e: unknown, origin: string | null, fn = 'function'): Response {
  if (e instanceof AppError) {
    if (e.status >= 500) console.error(JSON.stringify({ fn, code: e.code }))
    return json({ error: { code: e.code, message: e.message } }, { status: e.status, origin })
  }
  if (isZodError(e) || e instanceof SyntaxError) {
    return json({ error: { code: 'VALIDATION', message: ERROR_MESSAGES.VALIDATION } }, { status: 400, origin })
  }
  console.error(JSON.stringify({ fn, code: 'INTERNAL', type: (e as { name?: string })?.name ?? typeof e }))
  return json({ error: { code: 'INTERNAL', message: ERROR_MESSAGES.INTERNAL } }, { status: 500, origin })
}

export function preflight(req: Request): Response | null {
  return req.method === 'OPTIONS' ? new Response(null, { status: 204, headers: corsHeaders(req.headers.get('origin')) }) : null
}

export function requirePost(req: Request): void {
  if (req.method !== 'POST') throw new AppError('VALIDATION', 'Method not allowed', 405)
}

/** Reads a JSON body with a size cap (checked on the header and the actual text). */
export async function readJson(req: Request, maxBytes: number): Promise<unknown> {
  if (Number(req.headers.get('content-length') ?? 0) > maxBytes) throw new AppError('FILE_TOO_LARGE')
  const text = await req.text()
  if (text.length > maxBytes) throw new AppError('FILE_TOO_LARGE')
  return JSON.parse(text)
}
