import Link from 'next/link'
import { OPERATOR, SERVICE_PROVIDERS, TERMS_VERSION, type LegalBlock, type LegalDoc } from '@taxsteps/core'
import { CookieChoicesButton } from '@/components/site/MetaPixel'
import { Logo } from '@/components/ui/Logo'
import './site.css'

function Block({ block }: { block: LegalBlock }) {
  if (typeof block === 'string') return <p>{block}</p>
  if ('list' in block) return <ul>{block.list.map((li) => <li key={li}>{li}</li>)}</ul>
  return (
    <div className="w-providers" role="table" aria-label="Service providers">
      {SERVICE_PROVIDERS.map((p) => (
        <div key={p.name} role="row" className="w-provider">
          <strong role="rowheader">{p.name}</strong>
          <span role="cell">{p.role}</span>
          <span role="cell" className="w-small">{p.location}</span>
        </div>
      ))}
    </div>
  )
}

/** Renders the Terms of Service or Privacy Policy from @taxsteps/core, the same text the phone app shows. */
export function LegalArticle({ doc }: { doc: LegalDoc }) {
  const other = doc.slug === 'terms' ? { href: '/privacy', label: 'Privacy Policy' } : { href: '/terms', label: 'Terms of Service' }
  return (
    <div className="site theme-fresh">
      <header className="w-nav">
        <div className="w-wrap w-nav-inner">
          <Logo href="/" reload />
          <Link className="w-link-btn" href={other.href}>{other.label}</Link>
          <a className="w-btn w-btn-primary" href="/sign-up">Start free</a>
        </div>
      </header>
      <main className="w-wrap w-legal">
        <span className="kicker">Last updated {OPERATOR.updated} · version {TERMS_VERSION}</span>
        <h1>{doc.title}</h1>
        <p className="w-legal-summary">{doc.summary}</p>
        {doc.sections.map((s, i) => (
          <section key={s.heading} aria-labelledby={`s${i}`}>
            <h2 id={`s${i}`}>{s.heading}</h2>
            {s.body.map((b, j) => <Block key={j} block={b} />)}
          </section>
        ))}
      </main>
      <footer className="w-footer w-wrap">
        <p className="w-small">{OPERATOR.name} · {OPERATOR.country} · <a href={`mailto:${OPERATOR.email}`}>{OPERATOR.email}</a></p>
        <CookieChoicesButton />
      </footer>
    </div>
  )
}
