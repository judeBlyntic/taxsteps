// Signed, expiring OAuth `state` (HMAC-SHA256) so the callback knows which user started the flow.
import { AppError } from './core.ts'

export type OAuthState = { uid: string; nonce: string; exp: number; ret: string }

const enc = new TextEncoder()
const b64url = (bytes: Uint8Array) => btoa(String.fromCharCode(...bytes)).replace(/=+$/, '').replace(/\+/g, '-').replace(/\//g, '_')
const unb64url = (s: string) => Uint8Array.from(atob(s.replace(/-/g, '+').replace(/_/g, '/')), (c) => c.charCodeAt(0))

async function hmacKey(secret: string) {
  return crypto.subtle.importKey('raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign', 'verify'])
}

export async function signState(s: OAuthState, secret: string): Promise<string> {
  const body = b64url(enc.encode(JSON.stringify(s)))
  const sig = new Uint8Array(await crypto.subtle.sign('HMAC', await hmacKey(secret), enc.encode(body)))
  return `${body}.${b64url(sig)}`
}

export async function verifyState(token: string, secret: string, now: number = Date.now()): Promise<OAuthState> {
  const [body, sig] = token.split('.')
  if (!body || !sig) throw new AppError('UNAUTHORIZED')
  const ok = await crypto.subtle.verify('HMAC', await hmacKey(secret), unb64url(sig), enc.encode(body)).catch(() => false)
  if (!ok) throw new AppError('UNAUTHORIZED')
  const s = JSON.parse(new TextDecoder().decode(unb64url(body))) as OAuthState
  if (typeof s.exp !== 'number' || s.exp < now) throw new AppError('UNAUTHORIZED')
  return s
}

/**
 * Only our web app or our app's URL scheme may receive the user (and the authorization code)
 * back. Expo Go URLs (exp://) can point at any dev server, so they're allowed only when
 * explicitly enabled for local development.
 */
export function isAllowedReturn(ret: string, env: { webUrl: string; mobileScheme: string; allowExpoGo?: boolean }): boolean {
  const web = env.webUrl.replace(/\/+$/, '')
  return ret === web || ret.startsWith(`${web}/`) || ret.startsWith(`${env.mobileScheme}://`) || (env.allowExpoGo === true && ret.startsWith('exp://'))
}
