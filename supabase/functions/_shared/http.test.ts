import { assertEquals, assertRejects } from '@std/assert'
import { AppError } from './core.ts'
import { errorResponse, readJson } from './http.ts'

// A 2 MB upload that is never read: an early error must release it, or the gateway holds the request open (~160 s).
function unreadUpload() {
  let cancelled = false
  const body = new ReadableStream<Uint8Array>({ pull(c) { c.enqueue(new Uint8Array(1024)) }, cancel() { cancelled = true } })
  const req = new Request('http://localhost/fn', {
    method: 'POST', body, headers: { 'content-length': '2000000', origin: 'https://taxsteps.pro' }, duplex: 'half',
  } as RequestInit)
  return { req, cancelled: () => cancelled }
}

Deno.test('http: an early error releases the unread request body', async () => {
  const { req, cancelled } = unreadUpload()
  const res = errorResponse(new AppError('UNAUTHORIZED'), req, 'test')
  assertEquals(res.status, 401)
  await new Promise((r) => setTimeout(r, 0))
  assertEquals(cancelled(), true)
})

Deno.test('http: an oversized body is refused from its header and released unread', async () => {
  const { req, cancelled } = unreadUpload()
  await assertRejects(() => readJson(req, 1024), AppError)
  await new Promise((r) => setTimeout(r, 0))
  assertEquals(cancelled(), true)
})
