// Stores the auth session in the device keychain/keystore (expo-secure-store). SecureStore
// values are size-limited, so long values are split into chunks.

type SecureStoreLike = {
  getItemAsync(key: string): Promise<string | null>
  setItemAsync(key: string, value: string): Promise<void>
  deleteItemAsync(key: string): Promise<void>
}

export type AsyncStorageLike = {
  getItem(key: string): Promise<string | null>
  setItem(key: string, value: string): Promise<void>
  removeItem(key: string): Promise<void>
}

// SecureStore keys may only contain alphanumerics, ".", "-" and "_".
const safe = (key: string) => key.replace(/[^\w.-]/g, '_')

export function createChunkedStorage(store: SecureStoreLike, chunkSize = 1800): AsyncStorageLike {
  const countKey = (k: string) => `${safe(k)}__n`
  const chunkKey = (k: string, i: number) => `${safe(k)}__${i}`

  async function removeItem(key: string) {
    const n = Number((await store.getItemAsync(countKey(key))) ?? 0)
    for (let i = 0; i < n; i++) await store.deleteItemAsync(chunkKey(key, i))
    await store.deleteItemAsync(countKey(key))
  }

  return {
    async getItem(key) {
      const n = await store.getItemAsync(countKey(key))
      if (n === null) return null
      const parts: string[] = []
      for (let i = 0; i < Number(n); i++) {
        const part = await store.getItemAsync(chunkKey(key, i))
        if (part === null) return null // partially written: treat as missing
        parts.push(part)
      }
      return parts.join('')
    },
    async setItem(key, value) {
      await removeItem(key)
      const count = Math.max(1, Math.ceil(value.length / chunkSize))
      for (let i = 0; i < count; i++) await store.setItemAsync(chunkKey(key, i), value.slice(i * chunkSize, (i + 1) * chunkSize))
      await store.setItemAsync(countKey(key), String(count))
    },
    removeItem,
  }
}
