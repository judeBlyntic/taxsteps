// Realtime sync over the user's private broadcast channel ("user:<uid>"), fed by DB triggers.
import type { TaxStepsClient } from './client.ts'

export type SyncState = 'connecting' | 'live' | 'offline'
export type ChangeEvent = { table: string; operation: 'INSERT' | 'UPDATE' | 'DELETE'; id: string | null }

export function subscribeToUserChanges(
  c: TaxStepsClient,
  userId: string,
  onChange: (e: ChangeEvent) => void,
  onState: (s: SyncState) => void = () => {},
): () => void {
  let cancelled = false
  let channel: ReturnType<TaxStepsClient['channel']> | null = null

  void (async () => {
    await c.realtime.setAuth() // private channels authorise with the user's JWT
    if (cancelled) return
    channel = c
      .channel(`user:${userId}`, { config: { private: true } })
      .on('broadcast', { event: '*' }, (msg) => {
        const p = (msg.payload ?? {}) as { table?: string; operation?: string; record?: { id?: string }; old_record?: { id?: string } }
        const op = p.operation === 'INSERT' || p.operation === 'UPDATE' || p.operation === 'DELETE' ? p.operation : 'UPDATE'
        onChange({ table: p.table ?? 'unknown', operation: op, id: p.record?.id ?? p.old_record?.id ?? null })
      })
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') onState('live')
        else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') onState('offline')
        else onState('connecting')
      })
  })()

  return () => {
    cancelled = true
    if (channel) void c.removeChannel(channel)
  }
}
