// Minimal Google OAuth + Drive + Sheets client. Scope: drive.file (only files Tax Steps creates).
import { AppError } from '../_shared/core.ts'

export const SCOPES = ['openid', 'email', 'https://www.googleapis.com/auth/drive.file']
type Cfg = { clientId: string; clientSecret: string; redirectUri: string }
type Fetch = typeof fetch

async function call<T>(f: Fetch, url: string, init: RequestInit = {}): Promise<T> {
  const res = await f(url, init)
  const body = await res.json().catch(() => ({})) as T & { error?: unknown }
  if (!res.ok) {
    if ((body as { error?: unknown }).error === 'invalid_grant') throw new AppError('SHEETS_AUTH_EXPIRED')
    console.error(JSON.stringify({ fn: 'google-sheets', status: res.status }))
    throw new AppError('EXPORT_FAILED', "We couldn't reach Google Sheets. Please try again.")
  }
  return body
}

const bearer = (token: string, extra: Record<string, string> = {}) => ({ Authorization: `Bearer ${token}`, ...extra })
const b64url = (bytes: ArrayBuffer) => btoa(String.fromCharCode(...new Uint8Array(bytes))).replace(/=+$/, '').replace(/\+/g, '-').replace(/\//g, '_')

/**
 * PKCE verifier derived from the flow's state nonce with a server-only secret, so each
 * authorization code can only be redeemed together with the state that started its flow
 * (blocks authorization-code injection) without storing anything server-side.
 */
export async function pkceVerifier(nonce: string, secret: string): Promise<string> {
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'])
  return b64url(await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(`pkce:${nonce}`)))
}

export async function pkceChallenge(verifier: string): Promise<string> {
  return b64url(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(verifier)))
}

export function authUrl(p: { clientId: string; redirectUri: string; state: string; codeChallenge: string }): string {
  const q = new URLSearchParams({
    client_id: p.clientId, redirect_uri: p.redirectUri, response_type: 'code', scope: SCOPES.join(' '),
    access_type: 'offline', prompt: 'consent', include_granted_scopes: 'true', state: p.state,
    code_challenge: p.codeChallenge, code_challenge_method: 'S256',
  })
  return `https://accounts.google.com/o/oauth2/v2/auth?${q}`
}

export function exchangeCode(f: Fetch, code: string, codeVerifier: string, cfg: Cfg) {
  return call<{ access_token: string; refresh_token?: string; id_token?: string }>(f, 'https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code, code_verifier: codeVerifier, client_id: cfg.clientId, client_secret: cfg.clientSecret, redirect_uri: cfg.redirectUri, grant_type: 'authorization_code',
    }).toString(),
  })
}

export async function accessToken(f: Fetch, refreshToken: string, cfg: Cfg): Promise<string> {
  const r = await call<{ access_token: string }>(f, 'https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ refresh_token: refreshToken, client_id: cfg.clientId, client_secret: cfg.clientSecret, grant_type: 'refresh_token' }).toString(),
  })
  return r.access_token
}

/** Email claim from the id_token Google returned directly over TLS (not user-supplied). */
export function emailFromIdToken(idToken: string | undefined): string | null {
  try {
    const payload = idToken?.split('.')[1]
    if (!payload) return null
    const json = JSON.parse(atob(payload.replace(/-/g, '+').replace(/_/g, '/'))) as { email?: string }
    return json.email ?? null
  } catch {
    return null
  }
}

export async function listAppSpreadsheets(f: Fetch, token: string): Promise<{ id: string; name: string }[]> {
  const q = new URLSearchParams({
    q: "mimeType='application/vnd.google-apps.spreadsheet' and trashed=false",
    fields: 'files(id,name)', orderBy: 'modifiedTime desc', pageSize: '50',
  })
  return (await call<{ files?: { id: string; name: string }[] }>(f, `https://www.googleapis.com/drive/v3/files?${q}`, { headers: bearer(token) })).files ?? []
}

export async function createSpreadsheet(f: Fetch, token: string, title: string): Promise<{ id: string; name: string }> {
  const r = await call<{ spreadsheetId: string; properties: { title: string } }>(f, 'https://sheets.googleapis.com/v4/spreadsheets', {
    method: 'POST', headers: bearer(token, { 'Content-Type': 'application/json' }),
    body: JSON.stringify({ properties: { title }, sheets: [{ properties: { title: 'Expenses' } }] }),
  })
  return { id: r.spreadsheetId, name: r.properties.title }
}

const sheetUrl = (id: string) => `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(id)}`
const a1 = (sheet: string, range: string) => encodeURIComponent(`'${sheet.replace(/'/g, "''")}'!${range}`)

export async function listWorksheets(f: Fetch, token: string, id: string): Promise<string[]> {
  const r = await call<{ sheets?: { properties: { title: string } }[] }>(f, `${sheetUrl(id)}?fields=sheets.properties.title`, { headers: bearer(token) })
  return (r.sheets ?? []).map((s) => s.properties.title)
}

export async function addWorksheet(f: Fetch, token: string, id: string, title: string): Promise<void> {
  await call(f, `${sheetUrl(id)}:batchUpdate`, {
    method: 'POST', headers: bearer(token, { 'Content-Type': 'application/json' }),
    body: JSON.stringify({ requests: [{ addSheet: { properties: { title } } }] }),
  })
}

export async function isSheetEmpty(f: Fetch, token: string, id: string, sheet: string): Promise<boolean> {
  const r = await call<{ values?: unknown[][] }>(f, `${sheetUrl(id)}/values/${a1(sheet, 'A1:A1')}`, { headers: bearer(token) })
  return !r.values?.length
}

/** RAW input: values are stored exactly as sent and never parsed as formulas. */
export async function appendRows(f: Fetch, token: string, id: string, sheet: string, rows: (string | number | null)[][]): Promise<number> {
  const r = await call<{ updates?: { updatedRows?: number } }>(
    f, `${sheetUrl(id)}/values/${a1(sheet, 'A1')}:append?valueInputOption=RAW&insertDataOption=INSERT_ROWS`,
    { method: 'POST', headers: bearer(token, { 'Content-Type': 'application/json' }), body: JSON.stringify({ values: rows.map((r) => r.map((v) => v ?? '')) }) },
  )
  return r.updates?.updatedRows ?? rows.length
}

export async function revoke(f: Fetch, token: string): Promise<void> {
  await f(`https://oauth2.googleapis.com/revoke?token=${encodeURIComponent(token)}`, { method: 'POST' })
}
