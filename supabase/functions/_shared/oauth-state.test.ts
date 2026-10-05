import { assertEquals, assertRejects } from '@std/assert'
import { isAllowedReturn, signState, verifyState } from './oauth-state.ts'

const SECRET = 'state-secret-for-tests'
const env = { webUrl: 'http://localhost:3000', mobileScheme: 'taxsteps' }
const NOW = 1_790_000_000_000

Deno.test('state: sign and verify', async () => {
  const token = await signState({ uid: 'u1', nonce: 'n', exp: NOW + 600_000, ret: 'http://localhost:3000/settings' }, SECRET)
  assertEquals((await verifyState(token, SECRET, NOW)).uid, 'u1')
})

Deno.test('state: rejects tampering, wrong secret and expiry', async () => {
  const token = await signState({ uid: 'u1', nonce: 'n', exp: NOW + 600_000, ret: 'x' }, SECRET)
  const [body, sig] = token.split('.')
  const forged = btoa(JSON.stringify({ uid: 'attacker', nonce: 'n', exp: NOW + 600_000, ret: 'x' })).replace(/=+$/, '').replace(/\+/g, '-').replace(/\//g, '_')
  await assertRejects(() => verifyState(`${forged}.${sig}`, SECRET, NOW))
  await assertRejects(() => verifyState(token, 'other-secret', NOW))
  await assertRejects(() => verifyState(token, SECRET, NOW + 11 * 60_000))
  await assertRejects(() => verifyState(`${body}`, SECRET, NOW))
})

Deno.test('state: only our own return targets are allowed', () => {
  assertEquals(isAllowedReturn('http://localhost:3000/settings', env), true)
  assertEquals(isAllowedReturn('taxsteps://sheets', env), true)
  assertEquals(isAllowedReturn('exp://192.168.1.5:8081/--/sheets', env), false) // attacker-hostable
  assertEquals(isAllowedReturn('exp://192.168.1.5:8081/--/sheets', { ...env, allowExpoGo: true }), true) // dev only
  assertEquals(isAllowedReturn('https://evil.com', env), false)
  assertEquals(isAllowedReturn('http://localhost:3000.evil.com/x', env), false)
  assertEquals(isAllowedReturn('javascript:alert(1)', env), false)
})
