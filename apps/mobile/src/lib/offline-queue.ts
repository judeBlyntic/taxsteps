// Saves made while offline wait here (structured data only — never images) and are
// flushed in order when connectivity returns. Saves are idempotent upserts by id.
import { DocumentInputSchema, type DocumentInput } from '@taxsteps/core'

export type QueueItem = { input: DocumentInput; queuedAt: string; attempts: number; lastError: string | null }
export type KV = { getItem(k: string): Promise<string | null>; setItem(k: string, v: string): Promise<void> }

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

    async flush(save: (input: DocumentInput) => Promise<unknown>): Promise<{ saved: number; failed: number }> {
      const items = await read()
      const remaining: QueueItem[] = []
      let saved = 0
      for (const item of items) {
        try {
          await save(item.input)
          saved++
        } catch (e) {
          remaining.push({ ...item, attempts: item.attempts + 1, lastError: e instanceof Error ? e.message : String(e) })
        }
      }
      await write(remaining)
      return { saved, failed: remaining.length }
    },

    async discard(id: string): Promise<void> {
      await write((await read()).filter((x) => x.input.id !== id))
    },

    clear: () => write([]),
  }
}

export type OfflineQueue = ReturnType<typeof createOfflineQueue>
