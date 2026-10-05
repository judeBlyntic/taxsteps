import { ShieldCheck } from 'lucide-react'
import { COPY } from '@taxsteps/core'
import { Logo } from '@/components/ui/Logo'
import { ICON } from '@/components/ui/icons'

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="auth">
      <section className="auth-art" aria-label="About Tax Steps">
        <div className="blob" style={{ width: 360, height: 360, right: -120, top: -100, background: 'var(--color-accent-2-400)' }} />
        <div className="blob" style={{ width: 200, height: 200, left: -60, bottom: -60, background: 'var(--color-accent-300)' }} />
        <Logo href="/sign-in" />
        <div className="stack" style={{ gap: 14 }}>
          <h1>Every receipt, sorted.</h1>
          <p style={{ margin: 0, maxWidth: '40ch', fontSize: 16 }}>{COPY.tagline}</p>
          <div className="banner banner-ok" style={{ maxWidth: 440, background: 'var(--color-bg)' }}>
            <ShieldCheck {...ICON} />
            <span>{COPY.privacyPanel}</span>
          </div>
        </div>
      </section>
      <section className="auth-form">{children}</section>
    </main>
  )
}
