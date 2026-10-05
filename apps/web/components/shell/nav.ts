import { BarChart3, Download, Home, Receipt, ScanLine, Settings, type LucideIcon } from 'lucide-react'

export type NavItem = { href: string; label: string; icon: LucideIcon }

export const NAV: NavItem[] = [
  { href: '/', label: 'Dashboard', icon: Home },
  { href: '/documents', label: 'Documents', icon: Receipt },
  { href: '/scan', label: 'Scan', icon: ScanLine },
  { href: '/reports', label: 'Reports', icon: BarChart3 },
  { href: '/export', label: 'Export', icon: Download },
  { href: '/settings', label: 'Settings', icon: Settings },
]

export const isActive = (pathname: string, href: string) => (href === '/' ? pathname === '/' : pathname.startsWith(href))
