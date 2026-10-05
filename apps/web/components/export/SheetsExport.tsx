'use client'
import Link from 'next/link'
import type { DocumentFilter } from '@taxsteps/core'

/** Placeholder until Google Sheets is wired up (Task 22). */
export function SheetsExport(_props: { filter: DocumentFilter; label: string; disabled: boolean }) {
  return (
    <div className="banner banner-warn">
      Google Sheets export is being set up. Use Excel or CSV for now, or check <Link className="link" href="/settings">Settings</Link>.
    </div>
  )
}
