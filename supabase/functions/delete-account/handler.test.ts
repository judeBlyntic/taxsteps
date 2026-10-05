import { assertEquals } from '@std/assert'
import { AppError } from '../_shared/core.ts'
import { handleDeleteAccount, type DeleteDeps } from './handler.ts'

const post = (body: unknown) =>
  new Request('http://localhost/delete-account', {
    method: 'POST', headers: { 'content-type': 'application/json', authorization: 'Bearer t' }, body: JSON.stringify(body),
  })

function deps(over: Partial<DeleteDeps> = {}): DeleteDeps & { calls: string[] } {
  const calls: string[] = []
  return {
    calls,
    requireUser: () => Promise.resolve({ userId: 'user-1', email: null, client: {} as never }),
    revokeGoogle: (id) => { calls.push(`revoke:${id}`); return Promise.resolve() },
    deleteUser: (id) => { calls.push(`delete:${id}`); return Promise.resolve({ error: null }) },
    ...over,
  }
}

Deno.test('delete-account: requires typed confirmation', async () => {
  const d = deps()
  assertEquals((await handleDeleteAccount(post({}), d)).status, 400)
  assertEquals((await handleDeleteAccount(post({ confirm: 'delete' }), d)).status, 400)
  assertEquals(d.calls, [])
})

Deno.test('delete-account: requires a signed-in user', async () => {
  const res = await handleDeleteAccount(post({ confirm: 'DELETE' }), deps({ requireUser: () => Promise.reject(new AppError('UNAUTHORIZED')) }))
  assertEquals(res.status, 401)
})

Deno.test('delete-account: revokes Google then deletes the caller only', async () => {
  const d = deps()
  const res = await handleDeleteAccount(post({ confirm: 'DELETE' }), d)
  assertEquals(res.status, 200)
  assertEquals(await res.json(), { ok: true })
  assertEquals(d.calls, ['revoke:user-1', 'delete:user-1'])
})

Deno.test('delete-account: a failed Google revoke does not block deletion', async () => {
  const d = deps({ revokeGoogle: () => Promise.reject(new Error('google down')) })
  const res = await handleDeleteAccount(post({ confirm: 'DELETE' }), d)
  assertEquals(res.status, 200)
  assertEquals(d.calls, ['delete:user-1'])
})

Deno.test('delete-account: reports deletion failures', async () => {
  const res = await handleDeleteAccount(post({ confirm: 'DELETE' }), deps({ deleteUser: () => Promise.resolve({ error: new Error('db') }) }))
  assertEquals(res.status, 500)
  assertEquals(((await res.json()) as { error: { code: string } }).error.code, 'DELETE_FAILED')
})
