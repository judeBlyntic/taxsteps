import { describe, expect, it } from 'vitest'
import { createChunkedStorage } from './secure-storage'

function memStore() {
  const m = new Map<string, string>()
  return {
    m,
    getItemAsync: async (k: string) => m.get(k) ?? null,
    setItemAsync: async (k: string, v: string) => { m.set(k, v) },
    deleteItemAsync: async (k: string) => { m.delete(k) },
  }
}

describe('createChunkedStorage', () => {
  it('round-trips values larger than one SecureStore entry', async () => {
    const store = memStore()
    const s = createChunkedStorage(store, 1800)
    const big = 'x'.repeat(5000)
    await s.setItem('session', big)
    expect(await s.getItem('session')).toBe(big)
    expect([...store.m.values()].every((v) => v.length <= 1800)).toBe(true)
  })
  it('leaves no stale chunks when overwritten with a shorter value', async () => {
    const store = memStore()
    const s = createChunkedStorage(store, 1800)
    await s.setItem('session', 'y'.repeat(5000))
    await s.setItem('session', 'short')
    expect(await s.getItem('session')).toBe('short')
    expect(store.m.size).toBe(2) // count + one chunk
  })
  it('removes every chunk', async () => {
    const store = memStore()
    const s = createChunkedStorage(store, 1800)
    await s.setItem('session', 'z'.repeat(4000))
    await s.removeItem('session')
    expect(store.m.size).toBe(0)
    expect(await s.getItem('session')).toBeNull()
  })
  it('sanitises keys to SecureStore-safe characters', async () => {
    const store = memStore()
    await createChunkedStorage(store).setItem('sb-abc-auth-token:x', 'v')
    expect([...store.m.keys()].every((k) => /^[\w.-]+$/.test(k))).toBe(true)
  })
})
