'use client'
import Link from 'next/link'
import { FileSpreadsheet, FileText, Sheet, Table } from 'lucide-react'
import type { DocumentFilter } from '@taxsteps/core'
import { ICON } from '@/components/ui/icons'
import { useFileExport } from '@/lib/download'

const tile = { all: 'unset', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 12, padding: 16, borderRadius: 26, boxSizing: 'border-box' } as const
const disc = { width: 42, height: 42, flex: 'none', borderRadius: '50%', background: 'var(--color-bg)', display: 'grid', placeItems: 'center' } as const

export function ExportTiles({ filter, label, sheetsHref }: { filter: DocumentFilter; label: string; sheetsHref: string }) {
  const { run, busy } = useFileExport()
  const items = [
    { format: 'csv' as const, title: 'CSV', sub: 'Spreadsheet-ready rows', icon: FileText, bg: 'var(--color-neutral-200)', fg: 'var(--color-text)' },
    { format: 'xlsx' as const, title: 'Excel', sub: '.xlsx · 3 sheets', icon: FileSpreadsheet, bg: 'var(--color-accent-2-200)', fg: 'var(--color-accent-2-900)' },
    { format: 'pdf' as const, title: 'PDF', sub: 'Accountant report', icon: Table, bg: 'var(--color-accent-200)', fg: 'var(--color-accent-900)' },
  ]
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12 }}>
      {items.map(({ format, title, sub, icon: Icon, bg, fg }) => (
        <button key={format} type="button" style={{ ...tile, background: bg, color: fg }} disabled={busy !== null} onClick={() => void run(format, filter, label)}>
          <span style={disc}>{busy === format ? <span className="spinner" /> : <Icon {...ICON} width={18} height={18} />}</span>
          <span><b style={{ display: 'block', fontSize: 15 }}>{title}</b><span style={{ fontSize: 12, opacity: 0.85 }}>{sub}</span></span>
        </button>
      ))}
      <Link href={sheetsHref} style={{ ...tile, background: 'var(--color-accent-2-300)', color: 'var(--color-accent-2-900)' }}>
        <span style={disc}><Sheet {...ICON} width={18} height={18} /></span>
        <span><b style={{ display: 'block', fontSize: 15 }}>Google Sheets</b><span style={{ fontSize: 12, opacity: 0.85 }}>Send rows to a sheet</span></span>
      </Link>
    </div>
  )
}
