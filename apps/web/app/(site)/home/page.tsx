import type { Metadata } from 'next'
import Link from 'next/link'
import {
  ArrowRight, BarChart3, Check, Fuel, Globe2, ListChecks, Plane, RefreshCw, ScanLine, ShieldCheck, ShoppingCart, Smartphone,
  Sparkles, Tags, Table, WifiOff, Wrench, type LucideIcon,
} from 'lucide-react'
import { COPY, TAX_REGIONS } from '@taxsteps/core'
import { Logo } from '@/components/ui/Logo'
import { ICON } from '@/components/ui/icons'
import './site.css'

// The public website. Signed-out visitors to / see this page (proxy.ts rewrites to /home); it always shows the Fresh theme.

export const metadata: Metadata = {
  title: { absolute: 'Tax Steps · Every receipt, sorted' },
  description: 'Snap a receipt and Tax Steps reads it, sorts it and gets your expenses ready for tax time, on iPhone, Android and the web. Your photo is never stored.',
}

const COUNTRIES = Object.values(TAX_REGIONS).filter((r) => r.country !== 'ZZ')

const STEPS: { icon: LucideIcon; title: string; body: string }[] = [
  { icon: ScanLine, title: 'Scan or upload', body: 'Take a photo on your phone, or drop a file in on the web.' },
  { icon: Sparkles, title: 'We read it', body: 'AI pulls out the merchant, date, totals and tax. Then the photo is deleted.' },
  { icon: ListChecks, title: 'You check it', body: "Anything we're unsure about is highlighted, so a quick look is all it takes." },
  { icon: Table, title: 'Export', body: 'CSV, Excel, PDF or straight to Google Sheets, ready for your accountant.' },
]

const RECEIPTS: { icon: LucideIcon; name: string; meta: string; amount: string; tone: string }[] = [
  { icon: Wrench, name: 'Mitre 10', meta: 'Tools · 25 Sep', amount: '$115.00', tone: 'lime' },
  { icon: Fuel, name: 'BP Connect', meta: 'Fuel · 24 Sep', amount: '$82.40', tone: 'lilac' },
  { icon: ShoppingCart, name: 'Countdown', meta: 'Groceries · 21 Sep', amount: '$146.20', tone: 'soft' },
  { icon: Plane, name: 'Air New Zealand', meta: 'Travel · 18 Sep', amount: '$289.00', tone: 'lime' },
]

const BUSINESS_DAYS = [1, 2, 3, 4, 5, 8, 10, 12, 15, 16, 18, 19, 22, 23, 24, 25, 29, 30]
const PERSONAL_DAYS = [6, 9, 14, 21, 27]

const FAQ: { q: string; a: string }[] = [
  { q: 'Do you keep my receipt photos?', a: `No. ${COPY.privacyPanel} ${COPY.providerNote}` },
  {
    q: 'Which countries does it work in?',
    a: `${COUNTRIES.map((c) => c.name).join(', ')}, and anywhere else with a general setting. Tax labels (GST, VAT, sales tax), currency and tax-year dates follow your country.`,
  },
  { q: 'Is this tax advice?', a: COPY.disclaimer },
  { q: 'Can my accountant use the exports?', a: 'Yes. Export to CSV, a three-sheet Excel workbook, a PDF expense report, or straight into a Google Sheet, for a month, a quarter, a tax year or any dates you pick.' },
  { q: 'Does it work without internet?', a: "On your phone, yes. Receipts you save offline wait on the device and sync as soon as you're back online." },
  { q: 'Which devices can I use?', a: 'The web app works in any modern browser today. The iPhone and Android apps are coming to the App Store and Google Play. One account works across all of them.' },
]

function Section({ id, kicker, title, intro, children }: { id?: string; kicker: string; title: string; intro?: string; children: React.ReactNode }) {
  return (
    <section id={id} className="w-section w-wrap" aria-labelledby={id ? `${id}-title` : undefined}>
      <div className="w-section-head w-reveal">
        <span className="kicker">{kicker}</span>
        <h2 id={id ? `${id}-title` : undefined}>{title}</h2>
        {intro ? <p className="w-lead">{intro}</p> : null}
      </div>
      {children}
    </section>
  )
}

/** Hero visual, drawn in CSS. Slot for a generated hero image or loop: replace the contents of .w-art. */
function HeroArt() {
  return (
    <div className="w-art" aria-hidden>
      <span className="w-blob w-blob-lime" />
      <span className="w-blob w-blob-lilac" />
      <div className="w-total">
        <span className="w-tab w-tab-1" /><span className="w-tab w-tab-2" />
        <div className="w-total-card">
          <span className="muted">September 2026</span>
          <strong className="w-total-amount num">$4,285.70</strong>
          <span className="muted">Total expenses · 47 receipts</span>
        </div>
      </div>
      <div className="w-phone">
        <div className="w-phone-notch" />
        <span className="w-phone-title">Receipts</span>
        {RECEIPTS.map(({ icon: Icon, name, meta, amount, tone }) => (
          <div key={name} className="w-row">
            <span className="w-dot" data-tone={tone}><Icon {...ICON} /></span>
            <span className="grow"><span className="w-row-name">{name}</span><span className="w-row-meta">{meta}</span></span>
            <span className="num">{amount}</span>
          </div>
        ))}
      </div>
      <span className="w-float w-float-1"><span className="w-tick"><Check {...ICON} /></span>Photo deleted</span>
      <span className="w-float w-float-2"><Sparkles {...ICON} />GST $28.04 found</span>
    </div>
  )
}

export default function HomePage() {
  return (
    <div className="site theme-fresh">
      <a className="w-skip" href="#main">Skip to content</a>
      <header className="w-nav">
        <div className="w-wrap w-nav-inner">
          <Logo href="/" />
          <nav className="w-nav-links" aria-label="Website">
            <a href="#how">How it works</a>
            <a href="#features">Features</a>
            <a href="#pricing">Pricing</a>
            <a href="#faq">FAQ</a>
          </nav>
          <div className="row">
            <Link className="w-link-btn" href="/sign-in">Sign in</Link>
            <Link className="w-btn w-btn-primary" href="/sign-up">Start free</Link>
          </div>
        </div>
      </header>

      <main id="main">
        <section className="w-hero w-wrap">
          <div className="w-hero-copy">
            <span className="w-pill"><ShieldCheck {...ICON} />Your receipt photo is never stored</span>
            <h1>Every receipt, sorted.</h1>
            <p className="w-lead">Snap a receipt and Tax Steps reads it, sorts it and keeps it ready for tax time, on your phone and on the web.</p>
            <div className="w-cta-row">
              <Link className="w-btn w-btn-primary w-btn-lg" href="/sign-up">Start free<ArrowRight {...ICON} /></Link>
              <a className="w-btn w-btn-ghost w-btn-lg" href="#how">See how it works</a>
            </div>
            <p className="w-fine">Free during early access · No card needed</p>
          </div>
          <HeroArt />
        </section>

        <ul className="w-trust w-wrap" aria-label="Highlights">
          <li><ShieldCheck {...ICON} />Photo never stored</li>
          <li><Globe2 {...ICON} />{COUNTRIES.length} countries · GST, VAT &amp; sales tax</li>
          <li><Smartphone {...ICON} />iPhone, Android &amp; web</li>
          <li><Table {...ICON} />CSV, Excel, PDF &amp; Sheets</li>
        </ul>

        <Section id="how" kicker="How it works" title="From crumpled receipt to tidy records in four steps"
          intro="No typing out totals, no shoebox at the end of the year.">
          <ol className="w-steps">
            {STEPS.map(({ icon: Icon, title, body }, i) => (
              <li key={title} className="w-step w-reveal">
                <span className="w-step-num num">0{i + 1}</span>
                <span className="w-step-icon"><Icon {...ICON} /></span>
                <h3>{title}</h3>
                <p>{body}</p>
              </li>
            ))}
          </ol>
        </Section>

        <Section id="features" kicker="Features" title="Everything tax time asks for, already sorted">
          <div className="w-bento">
            <article className="w-card w-card-lilac w-span-3 w-reveal">
              <span className="w-blob w-card-blob" aria-hidden />
              <RefreshCw {...ICON} className="w-card-icon" />
              <h3>One account, every device</h3>
              <p>Scan on your phone at the counter, tidy up on your laptop at night. Changes show up everywhere straight away.</p>
              <div className="chips" aria-hidden><span className="w-chip">iPhone</span><span className="w-chip">Android</span><span className="w-chip">Web</span></div>
            </article>
            <article className="w-card w-card-lime w-span-3 w-reveal">
              <BarChart3 {...ICON} className="w-card-icon" />
              <h3>Reports that add up</h3>
              <p>Totals by category, business and personal split out, and the GST or VAT you can claim, for any period.</p>
              <div className="row" style={{ gap: 14 }} aria-hidden>
                <span className="donut" style={{ background: 'conic-gradient(var(--color-accent-2-800) 0 72%, var(--color-accent-2-100) 0)' }} />
                <span><span className="w-big num">72%</span><br /><span className="w-small">business this month</span></span>
              </div>
            </article>
            <article className="w-card w-span-2 w-reveal">
              <h3>Receipt days</h3>
              <p>See at a glance which days you spent, and on what.</p>
              <div className="w-mini-cal" aria-hidden>
                {Array.from({ length: 28 }, (_, i) => i + 1).map((d) => (
                  <span key={d} data-kind={BUSINESS_DAYS.includes(d) ? 'business' : PERSONAL_DAYS.includes(d) ? 'personal' : undefined} />
                ))}
              </div>
            </article>
            <article className="w-card w-span-2 w-reveal">
              <Tags {...ICON} className="w-card-icon" />
              <h3>Your categories</h3>
              <p>Sensible defaults to start, then rename, recolour or add your own.</p>
            </article>
            <article className="w-card w-span-2 w-reveal">
              <WifiOff {...ICON} className="w-card-icon" />
              <h3>Works offline</h3>
              <p>No signal on site? Save it anyway. It syncs the moment you&apos;re back online.</p>
            </article>
          </div>
        </Section>

        <section className="w-wrap w-section">
          <div className="w-privacy w-reveal">
            <span className="w-privacy-icon"><ShieldCheck {...ICON} /></span>
            <div className="stack" style={{ gap: 10 }}>
              <span className="kicker">Privacy first</span>
              <h2>Your receipt photo is read, then deleted.</h2>
              <p>{COPY.privacyPanel}</p>
              <p className="w-small">{COPY.providerNote}</p>
            </div>
          </div>
        </section>

        <Section id="pricing" kicker="Pricing" title="One simple plan, two ways to pay" intro="Every feature on both. Unlimited scans, exports and devices.">
          <div className="w-banner w-reveal"><Sparkles {...ICON} /><span><strong>Free during early access.</strong> No card needed. We&apos;ll let you know well before paid plans begin.</span></div>
          <div className="w-plans">
            <article className="w-plan w-reveal">
              <h3>Monthly</h3>
              <p className="w-price"><span className="num">$7.99</span><span className="w-small"> / month</span></p>
              <p className="w-small">Flexible, cancel anytime</p>
              <PlanList />
              <Link className="w-btn w-btn-ghost w-btn-lg" href="/sign-up">Start free</Link>
            </article>
            <article className="w-plan w-plan-best w-reveal">
              <span className="w-best">Best value · save $25.98</span>
              <h3>Annual</h3>
              <p className="w-price"><span className="num">$69.90</span><span className="w-small"> / year</span></p>
              <p className="w-small">Works out at $5.83 a month</p>
              <PlanList />
              <Link className="w-btn w-btn-primary w-btn-lg" href="/sign-up">Start free</Link>
            </article>
          </div>
          <p className="w-fine w-center">Both plans include a 7-day free trial once billing starts.</p>
        </Section>

        <Section id="faq" kicker="FAQ" title="Questions, answered">
          <div className="w-faq">
            {FAQ.map(({ q, a }) => (
              <details key={q} className="w-reveal">
                <summary>{q}</summary>
                <p>{a}</p>
              </details>
            ))}
          </div>
        </Section>

        <section className="w-wrap w-section">
          <div className="w-final w-reveal">
            <span className="w-blob w-final-blob" aria-hidden />
            <h2>Make this the last tax time you dread.</h2>
            <p>Start with your next receipt. It takes about ten seconds.</p>
            <Link className="w-btn w-btn-light w-btn-lg" href="/sign-up">Start free<ArrowRight {...ICON} /></Link>
          </div>
        </section>
      </main>

      <footer className="w-footer w-wrap">
        <div className="w-footer-top">
          <Logo href="/" />
          <nav className="row" aria-label="Footer" style={{ flexWrap: 'wrap', gap: 18 }}>
            <a href="#how">How it works</a><a href="#pricing">Pricing</a><a href="#faq">FAQ</a>
            <Link href="/sign-in">Sign in</Link><Link href="/sign-up">Create an account</Link>
          </nav>
        </div>
        <p className="w-small">{COPY.disclaimer}</p>
        <p className="w-small">© 2026 Tax Steps</p>
      </footer>
    </div>
  )
}

function PlanList() {
  return (
    <ul className="w-plan-list">
      {['Unlimited receipt scans', 'iPhone, Android and web', 'CSV, Excel, PDF and Google Sheets', 'Reports for any period'].map((f) => (
        <li key={f}><Check {...ICON} />{f}</li>
      ))}
    </ul>
  )
}
