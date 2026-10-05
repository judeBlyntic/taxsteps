import { assert, assertEquals, assertStringIncludes } from '@std/assert'
import { AppError, type ExportDoc } from '../_shared/core.ts'
import { decryptToken } from '../_shared/crypto.ts'
import { signState, verifyState } from '../_shared/oauth-state.ts'
import { DOCS } from '../export-documents/test-fixtures.ts'
import { handleSheets, type ConnectionRow, type SheetsDeps } from './handler.ts'

const KEY = btoa(String.fromCharCode(...new Uint8Array(32).fill(3)))
const env = {
  clientId: 'cid', clientSecret: 'csecret', redirectUri: 'https://x.supabase.co/functions/v1/google-sheets/callback',
  tokenKey: KEY, stateSecret: 'state-secret', webUrl: 'http://localhost:3000', mobileScheme: 'taxsteps',
}
const NOW = 1_790_000_000_000
const idToken = (claims: object) => `h.${btoa(JSON.stringify(claims)).replace(/=+$/, '')}.s`

type Call = { url: string; method: string; body: string }
function google(opts: { sheetEmpty?: boolean; invalidGrant?: boolean } = {}) {
  const calls: Call[] = []
  const f: typeof fetch = async (input, init) => {
    const url = String(input)
    const body = typeof init?.body === 'string' ? init.body : init?.body ? String(init.body) : ''
    calls.push({ url, method: init?.method ?? 'GET', body })
    const json = (v: unknown, status = 200) => new Response(JSON.stringify(v), { status, headers: { 'content-type': 'application/json' } })
    if (url.startsWith('https://oauth2.googleapis.com/token')) {
      if (body.includes('grant_type=authorization_code')) return json({ access_token: 'at', refresh_token: 'rt-secret', id_token: idToken({ email: 'me@gmail.com' }) })
      return opts.invalidGrant ? json({ error: 'invalid_grant' }, 400) : json({ access_token: 'at2' })
    }
    if (url.startsWith('https://oauth2.googleapis.com/revoke')) return new Response('', { status: 200 })
    if (url.startsWith('https://www.googleapis.com/drive/v3/files')) return json({ files: [{ id: 's1', name: 'Tax Steps Export' }] })
    if (url.includes('/values/') && url.includes(':append')) return json({ updates: { updatedRows: 4 } })
    if (url.includes('/values/')) return json(opts.sheetEmpty === false ? { values: [['Date']] } : {})
    if (url.endsWith(':batchUpdate')) return json({})
    if (url.startsWith('https://sheets.googleapis.com/v4/spreadsheets?') || url === 'https://sheets.googleapis.com/v4/spreadsheets') {
      return json({ spreadsheetId: 'new1', properties: { title: 'Tax Steps Export' } })
    }
    if (url.startsWith('https://sheets.googleapis.com/v4/spreadsheets/')) return json({ sheets: [{ properties: { title: 'Expenses' } }] })
    return json({ error: 'unexpected ' + url }, 500)
  }
  return { f, calls }
}

function memoryStore(initial: ConnectionRow | null = null) {
  let row = initial
  const log: string[] = []
  return {
    log,
    get row() { return row },
    store: {
      get: async () => row,
      upsert: async (r: ConnectionRow) => { log.push('upsert'); row = r },
      update: async (patch: Partial<ConnectionRow>) => { log.push('update'); row = row ? { ...row, ...patch } : row },
      remove: async () => { log.push('remove'); row = null },
    },
  }
}

async function connectedRow(): Promise<ConnectionRow> {
  const { encryptToken } = await import('../_shared/crypto.ts')
  return { google_email: 'me@gmail.com', refresh_token_enc: await encryptToken('rt-secret', KEY), default_spreadsheet_id: null, default_sheet_name: null }
}

function deps(over: Partial<SheetsDeps> = {}, store = memoryStore(), g = google()): SheetsDeps {
  return {
    requireUser: () => Promise.resolve({ userId: 'u1', email: null, client: {} as never }),
    enforceRateLimit: () => Promise.resolve(),
    connections: () => store.store,
    fetch: g.f,
    fetchExportDocs: () => Promise.resolve(DOCS as ExportDoc[]),
    getProfile: () => Promise.resolve({ timezone: 'Pacific/Auckland', locale: 'en-NZ' }),
    env,
    now: () => NOW,
    ...over,
  }
}
const post = (body: unknown) => new Request('https://x/functions/v1/google-sheets', {
  method: 'POST', headers: { authorization: 'Bearer t', 'content-type': 'application/json' }, body: JSON.stringify(body),
})

Deno.test('sheets start: least-privilege scope and a signed state', async () => {
  const res = await handleSheets(post({ action: 'start', returnTo: 'http://localhost:3000/settings' }), deps())
  const { url } = await res.json() as { url: string }
  const u = new URL(url)
  assertEquals(u.origin + u.pathname, 'https://accounts.google.com/o/oauth2/v2/auth')
  assertStringIncludes(u.searchParams.get('scope')!, 'https://www.googleapis.com/auth/drive.file')
  assertEquals(u.searchParams.get('scope')!.includes('auth/spreadsheets'), false)
  assertEquals(u.searchParams.get('access_type'), 'offline')
  assertEquals((await verifyState(u.searchParams.get('state')!, env.stateSecret, NOW)).uid, 'u1')
})

Deno.test('sheets start: rejects foreign return targets', async () => {
  assertEquals((await handleSheets(post({ action: 'start', returnTo: 'https://evil.com' }), deps())).status, 400)
})

Deno.test('sheets callback: relays the code to the app without storing anything', async () => {
  const mem = memoryStore()
  const g = google()
  const state = await signState({ uid: 'u1', nonce: 'n', exp: NOW + 60_000, ret: 'http://localhost:3000/settings' }, env.stateSecret)
  const res = await handleSheets(new Request(`https://x/functions/v1/google-sheets/callback?code=abc&state=${state}`), deps({}, mem, g))
  assertEquals(res.status, 302)
  const loc = new URL(res.headers.get('location')!)
  assertEquals(loc.origin + loc.pathname, 'http://localhost:3000/settings')
  assertEquals(loc.searchParams.get('sheets_code'), 'abc')
  assertEquals(loc.searchParams.get('sheets_state'), state)
  assertEquals(mem.log, [])
  assertEquals(g.calls.length, 0) // no token exchange in the unauthenticated callback
})

Deno.test('sheets complete: the signed-in user who started the flow gets an encrypted token', async () => {
  const mem = memoryStore()
  const state = await signState({ uid: 'u1', nonce: 'n', exp: NOW + 60_000, ret: 'http://localhost:3000/settings' }, env.stateSecret)
  const res = await handleSheets(post({ action: 'complete', code: 'abc', state }), deps({}, mem))
  assertEquals(res.status, 200)
  assert(mem.row && mem.row.refresh_token_enc !== 'rt-secret')
  assertEquals(await decryptToken(mem.row!.refresh_token_enc, KEY), 'rt-secret')
  assertEquals(mem.row!.google_email, 'me@gmail.com')
})

Deno.test("sheets complete: someone else's connect link can't link into their account (OAuth CSRF)", async () => {
  const mem = memoryStore()
  const g = google()
  const attackerState = await signState({ uid: 'attacker', nonce: 'n', exp: NOW + 60_000, ret: 'http://localhost:3000/settings' }, env.stateSecret)
  const res = await handleSheets(post({ action: 'complete', code: 'victim-code', state: attackerState }), deps({}, mem, g)) // signed in as u1
  assertEquals(res.status, 401)
  assertEquals(mem.log, [])
  assertEquals(g.calls.length, 0)
})

Deno.test('sheets export: header + rows appended as RAW values', async () => {
  const mem = memoryStore(await connectedRow())
  const g = google({ sheetEmpty: true })
  const res = await handleSheets(post({ action: 'export', spreadsheetId: 's1', sheet: 'Expenses', filter: {} }), deps({}, mem, g))
  assertEquals(res.status, 200)
  const body = await res.json() as { updatedRows: number; spreadsheetUrl: string }
  assertEquals(body.spreadsheetUrl, 'https://docs.google.com/spreadsheets/d/s1/edit')
  const append = g.calls.find((c) => c.url.includes(':append'))!
  assertStringIncludes(append.url, 'valueInputOption=RAW')
  const values = (JSON.parse(append.body) as { values: unknown[][] }).values
  assertEquals(values.length, 4) // header + 3 docs
  assertEquals(values[0]![0], 'Date')
  assertEquals(values[2]![1], '=HYPERLINK(x)') // RAW: stored as text, never evaluated
  assertEquals(mem.row!.default_spreadsheet_id, 's1')
})

Deno.test('sheets export: no duplicate header on a non-empty sheet', async () => {
  const g = google({ sheetEmpty: false })
  await handleSheets(post({ action: 'export', spreadsheetId: 's1', sheet: 'Expenses', filter: {} }), deps({}, memoryStore(await connectedRow()), g))
  const values = (JSON.parse(g.calls.find((c) => c.url.includes(':append'))!.body) as { values: unknown[][] }).values
  assertEquals(values.length, 3)
})

Deno.test('sheets: not connected, expired grant and unauthenticated', async () => {
  assertEquals((await handleSheets(post({ action: 'list-spreadsheets' }), deps())).status, 409)
  const expired = await handleSheets(post({ action: 'list-spreadsheets' }), deps({}, memoryStore(await connectedRow()), google({ invalidGrant: true })))
  assertEquals(expired.status, 409)
  assertEquals(((await expired.json()) as { error: { code: string } }).error.code, 'SHEETS_AUTH_EXPIRED')
  assertEquals((await handleSheets(post({ action: 'status' }), deps({ requireUser: () => Promise.reject(new AppError('UNAUTHORIZED')) }))).status, 401)
})

Deno.test('sheets: list, create and status', async () => {
  const mem = memoryStore(await connectedRow())
  const list = await (await handleSheets(post({ action: 'list-spreadsheets' }), deps({}, mem))).json()
  assertEquals(list, [{ id: 's1', name: 'Tax Steps Export' }])
  const created = await (await handleSheets(post({ action: 'create-spreadsheet', title: 'Tax Steps Export' }), deps({}, mem))).json()
  assertEquals(created, { id: 'new1', name: 'Tax Steps Export' })
  const tabs = await (await handleSheets(post({ action: 'list-worksheets', spreadsheetId: 's1' }), deps({}, mem))).json()
  assertEquals(tabs, ['Expenses'])
  let limited = false
  const status = await (await handleSheets(post({ action: 'status' }), deps({ enforceRateLimit: () => { limited = true; return Promise.resolve() } }, mem))).json()
  assertEquals(status, { configured: true, connected: true, email: 'me@gmail.com', defaultSpreadsheetId: 'new1', defaultSheet: null })
  assertEquals(limited, false) // status is free
})

Deno.test('sheets disconnect: revokes and deletes the connection', async () => {
  const mem = memoryStore(await connectedRow())
  const g = google()
  assertEquals((await handleSheets(post({ action: 'disconnect' }), deps({}, mem, g))).status, 200)
  assert(g.calls.some((c) => c.url.startsWith('https://oauth2.googleapis.com/revoke')))
  assertEquals(mem.row, null)
})

Deno.test('sheets: clear message when Google credentials are not configured', async () => {
  const res = await handleSheets(post({ action: 'start', returnTo: 'http://localhost:3000/settings' }), deps({ env: { ...env, clientId: '', clientSecret: '' } }))
  assertEquals(res.status, 500)
  assertEquals(((await res.json()) as { error: { message: string } }).error.message, 'Google Sheets is not configured yet.')
  const status = await (await handleSheets(post({ action: 'status' }), deps({ env: { ...env, clientId: '' } }))).json() as { configured: boolean }
  assertEquals(status.configured, false)
})
