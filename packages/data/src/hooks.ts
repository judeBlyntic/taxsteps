// TanStack Query hooks shared by web and mobile.
import { useEffect, useState } from 'react'
import { useInfiniteQuery, useMutation, useQuery, useQueryClient, type QueryClient } from '@tanstack/react-query'
import type { CategoryInput, Cursor, DateRange, DocumentFilter, DocumentInput, ProfileUpdate } from '@taxsteps/core'
import { useClient } from './context.tsx'
import { listCategories, upsertCategory } from './categories.ts'
import { deleteDocument, listDocuments, saveDocument } from './documents.ts'
import { getProfile, updateProfile } from './profile.ts'
import { subscribeToUserChanges, type SyncState } from './realtime.ts'
import { getSummary } from './summary.ts'
import { sheets, type SheetsStatus } from './functions.ts'

export const qk = {
  profile: ['profile'] as const,
  categories: ['categories'] as const,
  documentsRoot: ['documents'] as const,
  documents: (f: DocumentFilter) => ['documents', f] as const,
  summaryRoot: ['summary'] as const,
  summary: (r: DateRange | null, f: DocumentFilter) => ['summary', r, f] as const,
  sheetsStatus: ['sheets-status'] as const,
}

export function invalidateDocuments(qc: QueryClient) {
  void qc.invalidateQueries({ queryKey: qk.documentsRoot })
  void qc.invalidateQueries({ queryKey: qk.summaryRoot })
}

export function useProfile() {
  const c = useClient()
  return useQuery({ queryKey: qk.profile, queryFn: () => getProfile(c) })
}

export function useCategories() {
  const c = useClient()
  return useQuery({ queryKey: qk.categories, queryFn: () => listCategories(c, { includeArchived: true }) })
}

export function useDocuments(filter: DocumentFilter) {
  const c = useClient()
  return useInfiniteQuery({
    queryKey: qk.documents(filter),
    queryFn: ({ pageParam }) => listDocuments(c, filter, pageParam),
    initialPageParam: null as Cursor | null,
    getNextPageParam: (last) => last.next,
  })
}

export function useSummary(range: DateRange | null, filter: DocumentFilter = {}) {
  const c = useClient()
  return useQuery({ queryKey: qk.summary(range, filter), queryFn: () => getSummary(c, range, filter) })
}

export function useSaveDocument() {
  const c = useClient()
  const qc = useQueryClient()
  return useMutation({ mutationFn: (input: DocumentInput) => saveDocument(c, input), onSuccess: () => invalidateDocuments(qc) })
}

export function useDeleteDocument() {
  const c = useClient()
  const qc = useQueryClient()
  return useMutation({ mutationFn: (id: string) => deleteDocument(c, id), onSuccess: () => invalidateDocuments(qc) })
}

export function useUpdateProfile() {
  const c = useClient()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (patch: ProfileUpdate) => updateProfile(c, patch),
    onSuccess: (p) => qc.setQueryData(qk.profile, p),
  })
}

export function useUpsertCategory() {
  const c = useClient()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: CategoryInput) => upsertCategory(c, input),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: qk.categories })
      invalidateDocuments(qc)
    },
  })
}

/** Keeps every open screen in sync with changes made on any device. */
export function useRealtimeSync(userId: string | null): SyncState {
  const c = useClient()
  const qc = useQueryClient()
  const [state, setState] = useState<SyncState>('connecting')
  useEffect(() => {
    if (!userId) return
    return subscribeToUserChanges(c, userId, (e) => {
      if (e.table === 'categories') void qc.invalidateQueries({ queryKey: qk.categories })
      if (e.table === 'profiles') void qc.invalidateQueries({ queryKey: qk.profile })
      invalidateDocuments(qc)
    }, setState)
  }, [c, qc, userId])
  return state
}

export function useSheetsStatus() {
  const c = useClient()
  return useQuery({ queryKey: qk.sheetsStatus, queryFn: () => sheets<SheetsStatus>(c, { action: 'status' }), staleTime: 60_000, retry: false })
}
