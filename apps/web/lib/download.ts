'use client'
import { useState } from 'react'
import { toUserMessage, type DocumentFilter, type ExportFormat } from '@taxsteps/core'
import { exportDocuments, useClient } from '@taxsteps/data'
import { useToast } from '@/components/ui/Toast'

/** Saves bytes as a file download, releasing the object URL straight after. */
export function saveBytes(bytes: ArrayBuffer, filename: string, contentType: string): void {
  const url = URL.createObjectURL(new Blob([bytes], { type: contentType }))
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

export function useFileExport() {
  const client = useClient()
  const toast = useToast()
  const [busy, setBusy] = useState<ExportFormat | null>(null)
  async function run(format: ExportFormat, filter: DocumentFilter, label: string) {
    setBusy(format)
    try {
      const file = await exportDocuments(client, { format, filter, label })
      saveBytes(file.bytes, file.filename, file.contentType)
      toast.show(`${file.filename} downloaded`)
    } catch (e) {
      toast.show(toUserMessage(e), 'error')
    } finally {
      setBusy(null)
    }
  }
  return { run, busy }
}
