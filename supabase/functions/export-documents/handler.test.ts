import { assert, assertEquals } from '@std/assert'
import { decodeBase64 } from '@std/encoding'
import { AppError } from '../_shared/core.ts'
import { handleExport, type ExportDeps } from './handler.ts'
import { DOCS, loadFonts } from './test-fixtures.ts'

const post = (body: unknown) =>
  new Request('http://localhost/export-documents', {
    method: 'POST', headers: { 'content-type': 'application/json', authorization: 'Bearer t' }, body: JSON.stringify(body),
  })

function deps(over: Partial<ExportDeps> = {}): ExportDeps {
  return {
    requireUser: () => Promise.resolve({ userId: 'u1', email: null, client: {} as never }),
    enforceRateLimit: () => Promise.resolve(),
    fetchExportDocs: () => Promise.resolve(DOCS),
    getProfile: () => Promise.resolve({ business_name: 'Kōwhai Build Ltd', timezone: 'Pacific/Auckland', locale: 'en-NZ' }),
    fonts: loadFonts,
    ...over,
  }
}
type ExportJson = { filename: string; contentType: string; base64: string }

Deno.test('export: CSV with BOM, guarded formulas and unicode', async () => {
  const res = await handleExport(post({ format: 'csv', filter: {}, label: 'October 2026' }), deps())
  assertEquals(res.status, 200)
  const body = (await res.json()) as ExportJson
  assertEquals(body.filename, 'tax-steps-october-2026.csv')
  assertEquals(body.contentType, 'text/csv; charset=utf-8')
  const csv = new TextDecoder('utf-8', { ignoreBOM: true }).decode(decodeBase64(body.base64))
  assert(csv.startsWith('﻿Date,Merchant'))
  assert(csv.includes("'=HYPERLINK(x)"))
  assert(csv.includes('Kōwhai Café'))
  assertEquals(csv.trim().split('\r\n').length, 4)
})

Deno.test('export: XLSX and PDF formats', async () => {
  const x = (await (await handleExport(post({ format: 'xlsx', filter: {}, label: 'FY 2026–27' }), deps())).json()) as ExportJson
  assertEquals(x.filename, 'tax-steps-fy-2026-27.xlsx')
  assertEquals(x.contentType, 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
  const p = (await (await handleExport(post({ format: 'pdf', filter: {}, label: 'All time' }), deps())).json()) as ExportJson
  assertEquals(new TextDecoder().decode(decodeBase64(p.base64).slice(0, 5)), '%PDF-')
})

Deno.test('export: passes the validated filter through', async () => {
  let seen: unknown = null
  await handleExport(post({ format: 'csv', filter: { from: '2025-07-01', to: '2026-06-30' }, label: 'x' }), deps({
    fetchExportDocs: (_c, f) => { seen = f; return Promise.resolve([]) },
  }))
  assertEquals(seen, { from: '2025-07-01', to: '2026-06-30' })
})

Deno.test('export: rejects bad requests, unauthenticated users and rate limits', async () => {
  assertEquals((await handleExport(post({ format: 'docx', filter: {}, label: 'x' }), deps())).status, 400)
  assertEquals((await handleExport(post({ format: 'csv', filter: { from: 'nope' }, label: 'x' }), deps())).status, 400)
  assertEquals((await handleExport(post({ format: 'csv', filter: {}, label: 'x' }), deps({ requireUser: () => Promise.reject(new AppError('UNAUTHORIZED')) }))).status, 401)
  assertEquals((await handleExport(post({ format: 'csv', filter: {}, label: 'x' }), deps({ enforceRateLimit: () => Promise.reject(new AppError('RATE_LIMITED')) }))).status, 429)
})

Deno.test('export: too many records asks the user to narrow the range', async () => {
  const res = await handleExport(post({ format: 'csv', filter: {}, label: 'x' }), deps({
    fetchExportDocs: () => Promise.reject(new AppError('VALIDATION', 'Too many records — narrow the date range')),
  }))
  assertEquals(res.status, 400)
  assertEquals(((await res.json()) as { error: { message: string } }).error.message, 'Too many records — narrow the date range')
})
