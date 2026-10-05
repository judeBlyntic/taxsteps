// Saves made while offline wait here (structured data only — never images) and are
// flushed in order when connectivity returns. Saves are idempotent upserts by id.
import { DocumentInputSchema, type DocumentInput } from '@taxsteps/core'

export type QueueItem = { input: DocumentInput; queuedAt: string; attempts: number; lastError: string | null }
export type KV = { getItem(k: string): Promise<string | null>; setItem(k: string, v: string): Promise<void> }

/** Each signed-in user gets their own queue, so one person's offline saves can never be
 *  flushed into another account on a shared device. */
export function queueKeyFor(userId: string): string {
  return `taxsteps.queue.v1.${userId}`
}

export function createOfflineQueue(kv: KV, key = 'taxsteps.queue.v1') {
  async function read(): Promise<QueueItem[]> {
    try {
      const parsed: unknown = JSON.parse((await kv.getItem(key)) ?? '[]')
      return Array.isArray(parsed) ? (parsed as QueueItem[]) : []
    } catch {
      return []
    }
  }
  const write = (items: QueueItem[]) => kv.setItem(key, JSON.stringify(items))

  return {
    list: read,

    async enqueue(input: DocumentInput): Promise<void> {
      const clean = DocumentInputSchema.parse(input) // strips anything that isn't a document field
      const items = await read()
      const i = items.findIndex((x) => x.input.id === clean.id)
      const item: QueueItem = { input: clean, queuedAt: new Date().toISOString(), attempts: 0, lastError: null }
      if (i >= 0) items[i] = item
      else items.push(item)
      await write(items)
    },

    /**
     * Saves queued items in order. `canContinue` is checked before each item (e.g. "is the
     * same user still signed in?"); when it returns false, flushing stops and the remaining
     * items stay queued untouched.
     */
    async flush(
      save: (input: DocumentInput) => Promise<unknown>,
      canContinue: () => Promise<boolean> = async () => true,
    ): Promise<{ saved: number; failed: number }> {
      const items = await read()
      const remaining: QueueItem[] = []
      let saved = 0
      for (let i = 0; i < items.length; i++) {
        const item = items[i]!
        if (!(await canContinue())) {
          remaining.push(...items.slice(i))
          break
        }
        try {
          await save(item.input)
          saved++
        } catch (e) {
          remaining.push({ ...item, attempts: item.attempts + 1, lastError: e instanceof Error ? e.message : String(e) })
        }
      }
      await write(remaining)
      return { saved, failed: remaining.filter((r) => r.attempts > 0).length }
    },

    async discard(id: string): Promise<void> {
      await write((await read()).filter((x) => x.input.id !== id))
    },

    clear: () => write([]),
  }
}

export type OfflineQueue = ReturnType<typeof createOfflineQueue>
