// Mobile ↔ Supabase ↔ Web: changes made in one session arrive in another via the user's private channel.
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { deleteDocument, saveDocument, subscribeToUserChanges, type ChangeEvent } from '@taxsteps/data/api'
import { createTestUser, deleteTestUser, input, signInAgain, type TestUser } from './helpers.ts'

let A: TestUser
let B: TestUser
const unsubs: (() => void)[] = []

function listen(client: Parameters<typeof subscribeToUserChanges>[0], userId: string) {
  const events: ChangeEvent[] = []
  let live!: () => void
  const ready = new Promise<void>((r) => { live = r })
  unsubs.push(subscribeToUserChanges(client, userId, (e) => events.push(e), (s) => { if (s === 'live') live() }))
  return { events, ready }
}

const waitFor = async (pred: () => boolean, ms = 8000) => {
  const start = Date.now()
  while (!pred()) {
    if (Date.now() - start > ms) throw new Error('timed out waiting for realtime event')
    await new Promise((r) => setTimeout(r, 100))
  }
}

beforeAll(async () => {
  A = await createTestUser({ country: 'NZ', currency: 'NZD' })
  B = await createTestUser({ country: 'NZ', currency: 'NZD' })
})
afterAll(async () => {
  unsubs.forEach((u) => u())
  await deleteTestUser(A.userId)
  await deleteTestUser(B.userId)
})

describe('realtime sync', () => {
  it('mobile → web and web → mobile, including deletes, never leaking to other users', async () => {
    const phone = A.client
    const web = await signInAgain(A)
    const onWeb = listen(web, A.userId)
    const onPhone = listen(phone, A.userId)
    const onB = listen(B.client, B.userId)
    const spy = listen(B.client, A.userId) // B tries to join A's private channel
    await Promise.all([onWeb.ready, onPhone.ready, onB.ready])

    const doc = await saveDocument(phone, input())                       // saved on the phone
    await waitFor(() => onWeb.events.some((e) => e.id === doc.id && e.operation === 'INSERT'))

    await saveDocument(web, { ...input({ id: doc.id }), merchant_name: 'Edited on web' }) // edited on the web
    await waitFor(() => onPhone.events.some((e) => e.id === doc.id && e.operation === 'UPDATE'))

    await deleteDocument(web, doc.id)
    await waitFor(() => onPhone.events.some((e) => e.id === doc.id && e.operation === 'DELETE'))

    await new Promise((r) => setTimeout(r, 1500))
    expect(onB.events).toEqual([])
    expect(spy.events).toEqual([])
  })
})
