// Google Sheets: OAuth connect (GET …/callback) and JSON actions (POST).
import type { SupabaseClient } from '@supabase/supabase-js'
import { z } from 'zod'
import { AppError, DocumentFilterSchema, EXPORT_HEADERS, exportRow, type DocumentFilter, type ExportDoc } from '../_shared/core.ts'
import type { UserContext } from '../_shared/auth.ts'
import { decryptToken, encryptToken } from '../_shared/crypto.ts'
import { errorResponse, json, preflight, readJson, requirePost } from '../_shared/http.ts'
import { isAllowedReturn, signState, verifyState } from '../_shared/oauth-state.ts'
import * as G from './google.ts'

export type ConnectionRow = {
  google_email: string | null
  refresh_token_enc: string
  default_spreadsheet_id: string | null
  default_sheet_name: string | null
}
export type ConnectionStore = {
  get(): Promise<ConnectionRow | null>
  upsert(row: ConnectionRow): Promise<void>
  update(patch: Partial<ConnectionRow>): Promise<void>
  remove(): Promise<void>
}
export type SheetsEnv = {
  clientId: string; clientSecret: string; redirectUri: string; tokenKey: string; stateSecret: string; webUrl: string; mobileScheme: string
  allowExpoGo?: boolean
}
export type SheetsDeps = {
  requireUser: (req: Request) => Promise<UserContext>
  enforceRateLimit: (userId: string) => Promise<void>
  /** google_connections access for one user (service role; the table has no client policies). */
  connections: (userId: string) => ConnectionStore
  fetch: typeof fetch
  fetchExportDocs: (client: SupabaseClient, filter: DocumentFilter) => Promise<ExportDoc[]>
  getProfile: (ctx: UserContext) => Promise<{ timezone: string; locale: string }>
  env: SheetsEnv
  now?: () => number
}

const Title = z.string().trim().min(1).max(100)
export const SheetsRequestSchema = z.discriminatedUnion('action', [
  z.object({ action: z.literal('status') }),
  z.object({ action: z.literal('start'), returnTo: z.string().max(500) }),
  z.object({ action: z.literal('complete'), code: z.string().min(1).max(2000), state: z.string().min(1).max(4000) }),
  z.object({ action: z.literal('list-spreadsheets') }),
  z.object({ action: z.literal('create-spreadsheet'), title: Title }),
  z.object({ action: z.literal('list-worksheets'), spreadsheetId: z.string().min(1).max(200) }),
  z.object({ action: z.literal('create-worksheet'), spreadsheetId: z.string().min(1).max(200), title: Title }),
  z.object({ action: z.literal('export'), spreadsheetId: z.string().min(1).max(200), sheet: Title, filter: DocumentFilterSchema }),
  z.object({ action: z.literal('disconnect') }),
])
export type SheetsRequest = z.infer<typeof SheetsRequestSchema>

const redirect = (location: string) => new Response(null, { status: 302, headers: { Location: location, 'Cache-Control': 'no-store' } })
const withParam = (url: string, value: 'connected' | 'error') => `${url}${url.includes('?') ? '&' : '?'}sheets=${value}`

/**
 * Google redirects here (no Supabase session). We only verify the signed state and relay the
 * code back to our own app; the signed-in app then calls `complete`, which links the Google
 * account only if the state was issued to that same user (prevents OAuth CSRF / account linking).
 */
async function callback(req: Request, deps: SheetsDeps): Promise<Response> {
  const { env } = deps
  const params = new URL(req.url).searchParams
  const fallback = `${env.webUrl.replace(/\/+$/, '')}/settings`
  try {
    const stateToken = params.get('state') ?? ''
    const state = await verifyState(stateToken, env.stateSecret, deps.now?.())
    if (!isAllowedReturn(state.ret, env)) return redirect(withParam(fallback, 'error'))
    const code = params.get('code')
    if (!code || params.get('error')) return redirect(withParam(state.ret, 'error'))
    const sep = state.ret.includes('?') ? '&' : '?'
    return redirect(`${state.ret}${sep}${new URLSearchParams({ sheets_code: code, sheets_state: stateToken })}`)
  } catch {
    return redirect(withParam(fallback, 'error'))
  }
}

async function complete(user: UserContext, code: string, stateToken: string, deps: SheetsDeps, store: ConnectionStore) {
  const state = await verifyState(stateToken, deps.env.stateSecret, deps.now?.())
  if (state.uid !== user.userId) throw new AppError('UNAUTHORIZED')
  const tokens = await G.exchangeCode(deps.fetch, code, deps.env)
  if (!tokens.refresh_token) throw new AppError('SHEETS_AUTH_EXPIRED')
  await store.upsert({
    google_email: G.emailFromIdToken(tokens.id_token),
    refresh_token_enc: await encryptToken(tokens.refresh_token, deps.env.tokenKey),
    default_spreadsheet_id: null,
    default_sheet_name: null,
  })
}

export async function handleSheets(req: Request, deps: SheetsDeps): Promise<Response> {
  if (req.method === 'GET' && new URL(req.url).pathname.endsWith('/callback')) return callback(req, deps)
  const origin = req.headers.get('origin')
  const pre = preflight(req)
  if (pre) return pre
  try {
    requirePost(req)
    const user = await deps.requireUser(req)
    const body = SheetsRequestSchema.parse(await readJson(req, 64 * 1024))
    const store = deps.connections(user.userId)
    const { env } = deps

    if (body.action === 'status') {
      const row = await store.get()
      return json({
        configured: Boolean(env.clientId && env.clientSecret), connected: Boolean(row), email: row?.google_email ?? null,
        defaultSpreadsheetId: row?.default_spreadsheet_id ?? null, defaultSheet: row?.default_sheet_name ?? null,
      }, { origin })
    }
    if (!env.clientId || !env.clientSecret) throw new AppError('INTERNAL', 'Google Sheets is not configured yet.')

    await deps.enforceRateLimit(user.userId)

    if (body.action === 'start') {
      if (!isAllowedReturn(body.returnTo, env)) throw new AppError('VALIDATION', 'Invalid return address')
      const state = await signState({ uid: user.userId, nonce: crypto.randomUUID(), exp: (deps.now?.() ?? Date.now()) + 10 * 60_000, ret: body.returnTo }, env.stateSecret)
      return json({ url: G.authUrl({ clientId: env.clientId, redirectUri: env.redirectUri, state }) }, { origin })
    }

    if (body.action === 'complete') {
      await complete(user, body.code, body.state, deps, store)
      return json({ connected: true }, { origin })
    }

    const row = await store.get()
    if (!row) throw new AppError('SHEETS_NOT_CONNECTED')
    const refresh = await decryptToken(row.refresh_token_enc, env.tokenKey)

    if (body.action === 'disconnect') {
      await G.revoke(deps.fetch, refresh).catch(() => undefined)
      await store.remove()
      return json({ ok: true }, { origin })
    }

    const token = await G.accessToken(deps.fetch, refresh, env)
    switch (body.action) {
      case 'list-spreadsheets':
        return json(await G.listAppSpreadsheets(deps.fetch, token), { origin })
      case 'create-spreadsheet': {
        const created = await G.createSpreadsheet(deps.fetch, token, body.title)
        await store.update({ default_spreadsheet_id: created.id })
        return json(created, { origin })
      }
      case 'list-worksheets':
        return json(await G.listWorksheets(deps.fetch, token, body.spreadsheetId), { origin })
      case 'create-worksheet':
        await G.addWorksheet(deps.fetch, token, body.spreadsheetId, body.title)
        return json({ ok: true }, { origin })
      case 'export': {
        const [docs, profile] = await Promise.all([deps.fetchExportDocs(user.client, body.filter), deps.getProfile(user)])
        const rows = docs.map((d) => exportRow(d, { timeZone: profile.timezone, locale: profile.locale }))
        if (await G.isSheetEmpty(deps.fetch, token, body.spreadsheetId, body.sheet)) rows.unshift(EXPORT_HEADERS)
        const updatedRows = rows.length ? await G.appendRows(deps.fetch, token, body.spreadsheetId, body.sheet, rows) : 0
        await store.update({ default_spreadsheet_id: body.spreadsheetId, default_sheet_name: body.sheet })
        return json({ updatedRows, documents: docs.length, spreadsheetUrl: `https://docs.google.com/spreadsheets/d/${encodeURIComponent(body.spreadsheetId)}/edit` }, { origin })
      }
    }
  } catch (e) {
    return errorResponse(e, origin, 'google-sheets')
  }
}
