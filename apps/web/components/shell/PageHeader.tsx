'use client'
import { useState, type FormEvent, type ReactNode } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ScanLine, Search } from 'lucide-react'
import { ICON } from '@/components/ui/icons'

export function PageHeader({ title, subtitle, actions }: { title: string; subtitle?: ReactNode; actions?: ReactNode }) {
  const router = useRouter()
  const [q, setQ] = useState('')
  function search(e: FormEvent) {
    e.preventDefault()
    router.push(q.trim() ? `/documents?search=${encodeURIComponent(q.trim())}` : '/documents')
  }
  return (
    <header className="page-header">
      <div className="grow">
        <h1 className="page-title">{title}</h1>
        {subtitle && <div className="page-sub">{subtitle}</div>}
      </div>
      <form role="search" className="search-pill" onSubmit={search}>
        <Search {...ICON} />
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search documents" aria-label="Search documents" />
      </form>
      {actions ?? (
        <Link href="/scan" className="btn btn-primary btn-lg hide-mobile"><ScanLine {...ICON} />Scan receipt</Link>
      )}
    </header>
  )
}
