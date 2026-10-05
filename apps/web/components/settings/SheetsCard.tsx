'use client'
import { Sheet } from 'lucide-react'
import { ICON } from '@/components/ui/icons'

/** Google Sheets connection — wired up with the google-sheets function (Task 22). */
export function SheetsCard() {
  return (
    <section className="tile stack" style={{ gap: 12 }}>
      <h4>Integrations</h4>
      <div className="row" style={{ gap: 14 }}>
        <span className="cat-dot" style={{ background: 'var(--color-accent-2-200)', color: 'var(--color-accent-2-800)' }}><Sheet {...ICON} /></span>
        <div className="grow"><b>Google Sheets</b><div className="muted" style={{ fontSize: 13 }}>Coming soon — send expenses to a spreadsheet.</div></div>
        <button type="button" className="btn btn-secondary" disabled>Connect</button>
      </div>
    </section>
  )
}
