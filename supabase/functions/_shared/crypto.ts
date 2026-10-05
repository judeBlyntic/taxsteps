// AES-256-GCM encryption for stored OAuth refresh tokens. Format: base64(iv).base64(ciphertext).
const b64 = (bytes: Uint8Array) => btoa(String.fromCharCode(...bytes))
const unb64 = (s: string) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0))

function importKey(keyB64: string): Promise<CryptoKey> {
  const raw = unb64(keyB64)
  if (raw.length !== 32) throw new Error('TOKEN_ENCRYPTION_KEY must be 32 bytes (base64)')
  return crypto.subtle.importKey('raw', raw, 'AES-GCM', false, ['encrypt', 'decrypt'])
}

export async function encryptToken(plain: string, keyB64: string): Promise<string> {
  const iv = crypto.getRandomValues(new Uint8Array(12))
  const ct = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, await importKey(keyB64), new TextEncoder().encode(plain))
  return `${b64(iv)}.${b64(new Uint8Array(ct))}`
}

export async function decryptToken(enc: string, keyB64: string): Promise<string> {
  const [iv, ct] = enc.split('.')
  if (!iv || !ct) throw new Error('Malformed token')
  const plain = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: unb64(iv) }, await importKey(keyB64), unb64(ct))
  return new TextDecoder().decode(plain)
}
