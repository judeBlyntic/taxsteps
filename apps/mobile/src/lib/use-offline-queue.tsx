import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { AppState } from 'react-native'
import AsyncStorage from '@react-native-async-storage/async-storage'
import NetInfo from '@react-native-community/netinfo'
import { useQueryClient } from '@tanstack/react-query'
import { isAppError, type DocumentInput } from '@taxsteps/core'
import { invalidateDocuments, saveDocument, useClient } from '@taxsteps/data'
import { createOfflineQueue, type QueueItem } from './offline-queue'

type Api = {
  pending: QueueItem[]
  isOnline: boolean
  saveOrQueue: (input: DocumentInput) => Promise<'saved' | 'queued'>
  retry: () => Promise<void>
  discard: (id: string) => Promise<void>
  clear: () => Promise<void>
}

const queue = createOfflineQueue(AsyncStorage)
const Ctx = createContext<Api | null>(null)

export function OfflineQueueProvider({ children }: { children: ReactNode }) {
  const client = useClient()
  const qc = useQueryClient()
  const [pending, setPending] = useState<QueueItem[]>([])
  const [isOnline, setOnline] = useState(true)

  const refresh = useCallback(async () => setPending(await queue.list()), [])
  const retry = useCallback(async () => {
    const { saved } = await queue.flush((input) => saveDocument(client, input))
    if (saved) invalidateDocuments(qc)
    await refresh()
  }, [client, qc, refresh])

  useEffect(() => {
    void refresh()
    const unsubNet = NetInfo.addEventListener((s) => {
      const online = s.isConnected !== false && s.isInternetReachable !== false
      setOnline(online)
      if (online) void retry()
    })
    const sub = AppState.addEventListener('change', (st) => { if (st === 'active') void retry() })
    return () => { unsubNet(); sub.remove() }
  }, [refresh, retry])

  const saveOrQueue = useCallback(async (input: DocumentInput): Promise<'saved' | 'queued'> => {
    if (isOnline) {
      try {
        await saveDocument(client, input)
        invalidateDocuments(qc)
        return 'saved'
      } catch (e) {
        if (!(isAppError(e) && e.code === 'NETWORK') && !(e instanceof TypeError)) throw e
      }
    }
    await queue.enqueue(input)
    await refresh()
    return 'queued'
  }, [client, qc, isOnline, refresh])

  const api = useMemo<Api>(() => ({
    pending, isOnline, saveOrQueue, retry,
    discard: async (id) => { await queue.discard(id); await refresh() },
    clear: async () => { await queue.clear(); await refresh() },
  }), [pending, isOnline, saveOrQueue, retry, refresh])

  return <Ctx.Provider value={api}>{children}</Ctx.Provider>
}

export function useOfflineQueue(): Api {
  const v = useContext(Ctx)
  if (!v) throw new Error('useOfflineQueue must be used inside <OfflineQueueProvider>')
  return v
}
