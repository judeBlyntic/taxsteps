import { assertEquals } from '@std/assert'
import { AppError, ERROR_MESSAGES } from '../_shared/core.ts'
import { extractionResponse } from '../../../packages/core/src/fixtures.ts'
import { handleExtract, type ExtractDeps } from './handler.ts'

// Real magic bytes so content sniffing passes.
const b64 = (bytes: number[]) => btoa(String.fromCharCode(...bytes, ...new Array(16).fill(0)))
const JPEG = b64([0xff, 0xd8, 0xff, 0xe0])
const PDF = b64([0x25, 0x50, 0x44, 0x46, 0x2d])
const hints = { categories: ['Groceries'], country: 'NZ', currency: 'NZD' }
const VALID = { file: JPEG, mimeType: 'image/jpeg', filename: 'r.jpg', hints }

const post = (body: unknown, headers: Record<string, string> = {}) =>
  new Request('http://localhost/extract-document', {
    method: 'POST', headers: { 'content-type': 'application/json', authorization: 'Bearer t', ...headers }, body: JSON.stringify(body),
  })

function deps(over: Partial<ExtractDeps> = {}): ExtractDeps & { calls: string[] } {
  const calls: string[] = []
  return {
    calls,
    requireUser: () => Promise.resolve({ userId: 'u1', email: null, client: {} as never }),
    enforceRateLimit: () => { calls.push('ratelimit'); return Promise.resolve() },
    getTimeZone: () => Promise.resolve('Pacific/Auckland'),
    service: { extract: (_f, _h, tz) => { calls.push(`extract:${tz}`); return Promise.resolve(extractionResponse()) } },
    ...over,
  }
}
const reject = (code: ConstructorParameters<typeof AppError>[0]) => () => Promise.reject(new AppError(code))

Deno.test('extract: returns the extraction for a valid image', async () => {
  const d = deps()
  const res = await handleExtract(post(VALID), d)
  assertEquals(res.status, 200)
  assertEquals((await res.json()).fields.merchant_name, 'Countdown')
  assertEquals(d.calls, ['ratelimit', 'extract:Pacific/Auckland'])
})

Deno.test('extract: accepts PDFs', async () => {
  assertEquals((await handleExtract(post({ ...VALID, file: PDF, mimeType: 'application/pdf' }), deps())).status, 200)
})

Deno.test('extract: rejects unsupported and mislabelled files', async () => {
  assertEquals((await handleExtract(post({ ...VALID, mimeType: 'image/gif' }), deps())).status, 415)
  assertEquals((await handleExtract(post({ ...VALID, file: PDF }), deps())).status, 415) // PDF bytes labelled JPEG
  assertEquals((await handleExtract(post({ ...VALID, file: 'not base64!!' }), deps())).status, 415)
})

Deno.test('extract: rejects oversized files before calling the model', async () => {
  const d = deps()
  const res = await handleExtract(post({ ...VALID, file: JPEG + 'A'.repeat(17_000_000) }), d)
  assertEquals(res.status, 413)
  assertEquals(d.calls, [])
})

Deno.test('extract: auth, validation and rate limits', async () => {
  assertEquals((await handleExtract(post(VALID), deps({ requireUser: reject('UNAUTHORIZED') }))).status, 401)
  assertEquals((await handleExtract(post({ file: JPEG }), deps())).status, 400)
  assertEquals((await handleExtract(new Request('http://x', { method: 'POST', body: '{nope', headers: { authorization: 'Bearer t' } }), deps())).status, 400)
  assertEquals((await handleExtract(post(VALID), deps({ enforceRateLimit: reject('RATE_LIMITED') }))).status, 429)
  assertEquals((await handleExtract(new Request('http://x', { method: 'GET' }), deps())).status, 405)
})

Deno.test('extract: maps unreadable documents to the spec copy', async () => {
  const res = await handleExtract(post(VALID), deps({ service: { extract: reject('NOT_A_DOCUMENT') } }))
  assertEquals(res.status, 422)
  assertEquals(await res.json(), { error: { code: 'NOT_A_DOCUMENT', message: ERROR_MESSAGES.NOT_A_DOCUMENT } })
})

Deno.test('extract: answers CORS preflight only for allowed origins', async () => {
  Deno.env.set('APP_ALLOWED_ORIGINS', 'http://localhost:3000')
  const ok = await handleExtract(new Request('http://x', { method: 'OPTIONS', headers: { origin: 'http://localhost:3000' } }), deps())
  assertEquals(ok.headers.get('access-control-allow-origin'), 'http://localhost:3000')
  const evil = await handleExtract(new Request('http://x', { method: 'OPTIONS', headers: { origin: 'https://evil.example' } }), deps())
  assertEquals(evil.headers.get('access-control-allow-origin'), null)
})

Deno.test('extract: never logs the image or extracted values', async () => {
  const logged: string[] = []
  const orig = { log: console.log, error: console.error, warn: console.warn, info: console.info }
  for (const k of ['log', 'error', 'warn', 'info'] as const) console[k] = (...a: unknown[]) => { logged.push(a.map(String).join(' ')) }
  try {
    await handleExtract(post(VALID), deps())
    await handleExtract(post(VALID), deps({ service: { extract: () => Promise.reject(new Error('Countdown ' + JPEG)) } }))
    await handleExtract(post({ ...VALID, mimeType: 'image/gif' }), deps())
  } finally {
    Object.assign(console, orig)
  }
  const all = logged.join('\n')
  assertEquals(all.includes(JPEG), false)
  assertEquals(all.includes('Countdown'), false)
})
