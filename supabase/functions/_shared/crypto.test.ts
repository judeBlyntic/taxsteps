import { assertEquals, assertNotEquals, assertRejects } from '@std/assert'
import { decryptToken, encryptToken } from './crypto.ts'

const KEY = btoa(String.fromCharCode(...new Uint8Array(32).map((_, i) => i)))
const OTHER = btoa(String.fromCharCode(...new Uint8Array(32).fill(7)))

Deno.test('crypto: AES-GCM round trip with a fresh IV each time', async () => {
  const a = await encryptToken('1//refresh-token', KEY)
  const b = await encryptToken('1//refresh-token', KEY)
  assertNotEquals(a, b)
  assertEquals(a.includes('refresh'), false)
  assertEquals(await decryptToken(a, KEY), '1//refresh-token')
})

Deno.test('crypto: wrong key or tampering fails', async () => {
  const enc = await encryptToken('secret', KEY)
  await assertRejects(() => decryptToken(enc, OTHER))
  const [iv, ct] = enc.split('.')
  await assertRejects(() => decryptToken(`${iv}.${ct!.slice(0, -4)}AAAA`, KEY))
})
