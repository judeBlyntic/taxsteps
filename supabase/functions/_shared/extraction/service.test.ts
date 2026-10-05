import { assertEquals, assertRejects, assertStringIncludes } from '@std/assert'
import { AppError, ModelOutputSchema } from '../core.ts'
import { INVOICE_RAW, RECEIPT_RAW } from '../../../../packages/core/src/fixtures.ts'
import { DocumentExtractionService, createProvider } from './service.ts'
import { OpenAIProvider } from './openai.ts'
import { MODEL_JSON_SCHEMA } from './json-schema.ts'
import type { ExtractionFile, ExtractionProvider } from './provider.ts'

const HINTS = { categories: ['Groceries', 'Office'], country: 'NZ', currency: 'NZD' }
const FILE: ExtractionFile = { base64: '/9j/4AAQ', mimeType: 'image/jpeg', filename: 'r.jpg' }
const fake = (out: unknown): ExtractionProvider => ({ name: 'fake', model: 'fake', extract: () => Promise.resolve(out) })
const fixedNow = () => new Date('2026-10-05T01:00:00Z')

Deno.test('service: normalises a receipt and reports the model', async () => {
  const r = await new DocumentExtractionService(fake(RECEIPT_RAW), fixedNow).extract(FILE, HINTS, 'Pacific/Auckland')
  assertEquals(r.fields.merchant_name, 'Countdown')
  assertEquals(r.fields.category, 'Groceries')
  assertEquals(r.model, 'fake')
})

Deno.test('service: extracts invoices', async () => {
  const r = await new DocumentExtractionService(fake(INVOICE_RAW), fixedNow).extract(FILE, HINTS, 'Pacific/Auckland')
  assertEquals(r.fields.document_type, 'invoice')
  assertEquals(r.fields.invoice_number, 'INV-12345')
})

Deno.test('service: malformed model output is UNREADABLE', async () => {
  const err = await assertRejects(() => new DocumentExtractionService(fake({ junk: true })).extract(FILE, HINTS, 'UTC'), AppError)
  assertEquals(err.code, 'UNREADABLE')
})

Deno.test('service: uses the profile timezone for "today" (future-date check)', async () => {
  // 2026-10-05T01:00Z is still 4 Oct in New York, so a 5 Oct receipt is in the future there.
  const r = await new DocumentExtractionService(fake(RECEIPT_RAW), fixedNow).extract(FILE, HINTS, 'America/New_York')
  assertEquals(r.warnings.map((w) => w.code), ['FUTURE_DATE'])
})

Deno.test('json schema mirrors ModelOutputSchema and is strict', () => {
  const zodKeys = Object.keys(ModelOutputSchema.shape).sort()
  assertEquals(Object.keys(MODEL_JSON_SCHEMA.properties).sort(), zodKeys)
  assertEquals([...MODEL_JSON_SCHEMA.required].sort(), zodKeys)
  assertEquals(MODEL_JSON_SCHEMA.additionalProperties, false)
  assertEquals(MODEL_JSON_SCHEMA.properties.confidence.additionalProperties, false)
})

Deno.test('createProvider: requires an API key and a known provider', () => {
  const env = (vals: Record<string, string>) => ({ get: (k: string) => vals[k] })
  let code = ''
  try { createProvider(env({ AI_PROVIDER: 'openai' })) } catch (e) { code = (e as AppError).code }
  assertEquals(code, 'INTERNAL')
  try { createProvider(env({ AI_PROVIDER: 'other', AI_API_KEY: 'k' })) } catch (e) { code = (e as AppError).code + '2' }
  assertEquals(code, 'INTERNAL2')
  assertEquals(createProvider(env({ AI_API_KEY: 'k' })).model, 'gpt-6.1-sol')
})

function stubFetch(responseBody: unknown, status = 200) {
  const calls: { url: string; body: Record<string, unknown>; headers: Headers }[] = []
  const f: typeof fetch = (input, init) => {
    calls.push({ url: String(input), body: JSON.parse(String(init?.body)), headers: new Headers(init?.headers) })
    return Promise.resolve(new Response(JSON.stringify(responseBody), { status }))
  }
  return { f, calls }
}

const okResponse = { output: [{ type: 'message', content: [{ type: 'output_text', text: JSON.stringify(RECEIPT_RAW) }] }] }

Deno.test('OpenAIProvider: sends an image with storage disabled and a strict schema', async () => {
  const { f, calls } = stubFetch(okResponse)
  const out = await new OpenAIProvider({ apiKey: 'sk-test', model: 'm1', fetch: f }).extract(FILE, HINTS)
  assertEquals((out as { merchant_name: string }).merchant_name, ' Countdown ')
  const c = calls[0]!
  assertEquals(c.url, 'https://api.openai.com/v1/responses')
  assertEquals(c.headers.get('authorization'), 'Bearer sk-test')
  assertEquals(c.body.store, false)
  assertEquals(c.body.model, 'm1')
  const fmt = (c.body.text as { format: { type: string; strict: boolean } }).format
  assertEquals([fmt.type, fmt.strict], ['json_schema', true])
  const content = (c.body.input as { content: { type: string; image_url?: string }[] }[])[0]!.content
  assertEquals(content.find((p) => p.type === 'input_image')?.image_url, 'data:image/jpeg;base64,/9j/4AAQ')
  assertStringIncludes(String(c.body.instructions), 'Groceries')
})

Deno.test('OpenAIProvider: sends PDFs as input_file', async () => {
  const { f, calls } = stubFetch(okResponse)
  await new OpenAIProvider({ apiKey: 'k', model: 'm', fetch: f }).extract({ base64: 'JVBERi0x', mimeType: 'application/pdf', filename: 'inv.pdf' }, HINTS)
  const content = (calls[0]!.body.input as { content: Record<string, string>[] }[])[0]!.content
  const file = content.find((p) => p.type === 'input_file')!
  assertEquals([file.filename, file.file_data], ['inv.pdf', 'data:application/pdf;base64,JVBERi0x'])
})

Deno.test('OpenAIProvider: provider errors and unparsable output', async () => {
  const bad = await assertRejects(() => new OpenAIProvider({ apiKey: 'k', model: 'm', fetch: stubFetch({}, 500).f }).extract(FILE, HINTS), AppError)
  assertEquals(bad.code, 'INTERNAL')
  const junk = { output: [{ type: 'message', content: [{ type: 'output_text', text: 'not json' }] }] }
  const unreadable = await assertRejects(() => new OpenAIProvider({ apiKey: 'k', model: 'm', fetch: stubFetch(junk).f }).extract(FILE, HINTS), AppError)
  assertEquals(unreadable.code, 'UNREADABLE')
  const refusal = { output: [{ type: 'message', content: [{ type: 'refusal', refusal: 'no' }] }] }
  const refused = await assertRejects(() => new OpenAIProvider({ apiKey: 'k', model: 'm', fetch: stubFetch(refusal).f }).extract(FILE, HINTS), AppError)
  assertEquals(refused.code, 'UNREADABLE')
})
