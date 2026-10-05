'use client'
import type { ReactNode } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { BarChart3, CloudOff, Home, Receipt, RefreshCw, ScanLine, Settings } from 'lucide-react'
import { useProfile, useRealtimeSync, type SyncState } from '@taxsteps/data'
import { Logo } from '@/components/ui/Logo'
import { ICON } from '@/components/ui/icons'
import { NAV, isActive } from './nav'
import { DrawerProvider } from '@/components/documents/DrawerContext'

const SYNC_COPY: Record<SyncState, { title: string; body: string }> = {
  live: { title: 'All synced', body: 'Changes appear on all your devices instantly.' },
  connecting: { title: 'Connecting…', body: 'Linking this browser with your other devices.' },
  offline: { title: 'Offline', body: "Changes will sync when you're back online." },
}

function initials(name: string | null | undefined, email: string) {
  const src = name?.trim() || email
  return src.split(/[\s@.]+/).filter(Boolean).slice(0, 2).map((s) => s[0]!.toUpperCase()).join('')
}

export function AppShell({ userId, email, children }: { userId: string; email: string; children: ReactNode }) {
  const pathname = usePathname()
  const sync = useRealtimeSync(userId)
  const { data: profile } = useProfile()
  const copy = SYNC_COPY[sync]

  return (
    <DrawerProvider>
    <div className="shell">
      <aside className="sidebar" aria-label="Main navigation">
        <Logo />
        <nav className="stack" style={{ gap: 6 }}>
          {NAV.map(({ href, label, icon: Icon }) => (
            <Link key={href} href={href} className="nav-item" aria-current={isActive(pathname, href) ? 'page' : undefined}>
              <Icon {...ICON} />{label}
            </Link>
          ))}
        </nav>
        <div className="grow" />
        <div className="sync-card" data-state={sync} role="status">
          <strong>{sync === 'offline' ? <CloudOff {...ICON} /> : <RefreshCw {...ICON} />}{copy.title}</strong>
          <span>{copy.body}</span>
        </div>
        <Link href="/settings" className="user-chip" style={{ color: 'inherit', textDecoration: 'none' }}>
          <span className="avatar">{initials(profile?.full_name, email)}</span>
          <span className="grow">
            <span className="name" style={{ display: 'block' }}>{profile?.full_name || email}</span>
            <span className="sub" style={{ display: 'block' }}>{profile?.business_name || email}</span>
          </span>
        </Link>
      </aside>

      <div className="main">
        <div className="panel">
          <div className="topbar">
            <Logo />
            <span className="grow" />
            <span className="sync-dot" aria-label={copy.title} title={copy.title}
              style={{ width: 10, height: 10, borderRadius: '50%', background: sync === 'live' ? 'var(--color-accent-2-600)' : 'var(--color-accent-500)' }} />
            <Link href="/settings" className="avatar" aria-label="Settings" style={{ textDecoration: 'none' }}>{initials(profile?.full_name, email)}</Link>
          </div>
          {children}
        </div>
      </div>

      <nav className="tabbar" aria-label="Main navigation">
        <Link href="/" className="tab" aria-current={isActive(pathname, '/') ? 'page' : undefined}><Home {...ICON} />Home</Link>
        <Link href="/documents" className="tab" aria-current={isActive(pathname, '/documents') ? 'page' : undefined}><Receipt {...ICON} />Documents</Link>
        <Link href="/scan" className="tab-scan" aria-label="Scan receipt"><ScanLine {...ICON} /></Link>
        <Link href="/reports" className="tab" aria-current={isActive(pathname, '/reports') || isActive(pathname, '/export') ? 'page' : undefined}><BarChart3 {...ICON} />Reports</Link>
        <Link href="/settings" className="tab" aria-current={isActive(pathname, '/settings') ? 'page' : undefined}><Settings {...ICON} />Settings</Link>
      </nav>
    </div>
    </DrawerProvider>
  )
}
