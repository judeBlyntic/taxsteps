import Link from 'next/link'
import { CheckCircle2 } from 'lucide-react'
import { Logo } from '@/components/ui/Logo'
import { ICON } from '@/components/ui/icons'

export const metadata = { title: 'Email confirmed' }

/** Shown after confirming an email from another device (e.g. signed up on the phone app). */
export default function ConfirmedPage() {
  return (
    <main className="auth-form" style={{ minHeight: '100dvh' }}>
      <div className="auth-card" style={{ alignItems: 'flex-start' }}>
        <Logo href="/sign-in" />
        <span className="brand-mark" style={{ width: 56, height: 56, background: 'var(--color-accent-2-600)' }}><CheckCircle2 {...ICON} /></span>
        <h2>Email confirmed</h2>
        <p className="muted" style={{ margin: 0 }}>Your account is ready. Sign in on the web or in the Tax Steps app on your phone.</p>
        <Link className="btn btn-primary btn-xl" href="/sign-in">Sign in</Link>
      </div>
    </main>
  )
}
