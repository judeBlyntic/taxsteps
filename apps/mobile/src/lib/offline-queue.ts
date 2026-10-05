// Saves made while offline wait here (structured data only — never images) and are
// flushed in order when connectivity returns. Saves are idempotent upserts by id.
import { DocumentInputSchema, type DocumentInput } from '@taxsteps/core'

export type QueueItem = {
  input: DocumentInput
  queuedAt: string
  /** Changes on every re-queue, so a flush never removes an edit made while it was running. */
  version?: string
  attempts: number
  lastError: string | null
}
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

  // Every read-modify-write runs one at a time, so concurrent enqueue/flush/discard can't
  // overwrite each other's changes.
  let lock: Promise<unknown> = Promise.resolve()
  function exclusive<T>(fn: () => Promise<T>): Promise<T> {
    const run = lock.then(fn, fn)
    lock = run.catch(() => undefined)
    return run
  }
  const sameVersion = (a: QueueItem, b: QueueItem) => a.input.id === b.input.id && a.version === b.version

  let inFlight: Promise<{ saved: number; failed: number }> | null = null

  async function flushOnce(
    save: (input: DocumentInput) => Promise<unknown>,
    canContinue: () => Promise<boolean>,
  ): Promise<{ saved: number; failed: number }> {
    const snapshot = await exclusive(read)
    const saved: QueueItem[] = []
    const failed = new Map<string, string>()
    for (const item of snapshot) {
      if (!(await canContinue())) break
      try {
        await save(item.input) // slow network call: deliberately outside the lock
        saved.push(item)
      } catch (e) {
        failed.set(`${item.input.id}|${item.version}`, e instanceof Error ? e.message : String(e))
      }
    }
    // Re-read: anything queued or edited during the flush is kept untouched.
    return exclusive(async () => {
      const current = await read()
      const next = current
        .filter((i) => !saved.some((s) => sameVersion(s, i)))
        .map((i) => {
          const err = failed.get(`${i.input.id}|${i.version}`)
          return err === undefined ? i : { ...i, attempts: i.attempts + 1, lastError: err }
        })
      await write(next)
      return { saved: saved.length, failed: failed.size }
    })
  }

  return {
    list: () => exclusive(read),

    enqueue: (input: DocumentInput) => exclusive(async () => {
      const clean = DocumentInputSchema.parse(input) // strips anything that isn't a document field
      const items = await read()
      const item: QueueItem = { input: clean, queuedAt: new Date().toISOString(), version: Math.random().toString(36).slice(2), attempts: 0, lastError: null }
      const i = items.findIndex((x) => x.input.id === clean.id)
      if (i >= 0) items[i] = item
      else items.push(item)
      await write(items)
    }),

    /**
     * Saves queued items in order. `canContinue` is checked before each item (e.g. "is the
     * same user still signed in?"); when it returns false, flushing stops and the remaining
     * items stay queued untouched. Overlapping calls share one flush.
     */
    flush(
      save: (input: DocumentInput) => Promise<unknown>,
      canContinue: () => Promise<boolean> = async () => true,
    ): Promise<{ saved: number; failed: number }> {
      inFlight ??= flushOnce(save, canContinue).finally(() => { inFlight = null })
      return inFlight
    },

    discard: (id: string) => exclusive(async () => {
      await write((await read()).filter((x) => x.input.id !== id))
    }),

    clear: () => exclusive(() => write([])),
  }
}

export type OfflineQueue = ReturnType<typeof createOfflineQueue>
