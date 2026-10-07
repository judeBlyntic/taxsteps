'use client'
import { useEffect, useSyncExternalStore } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

// Meta Pixel for the public website only (rendered by app/(site)/layout.tsx), loaded only after the visitor
// accepts. Inert everywhere else: no automatic events or form reading, no automatic page views on client-side
// navigation, and consent is revoked whenever the visitor leaves the website pages. See PRIVACY in @taxsteps/core.

const PIXEL_ID = process.env.NEXT_PUBLIC_META_PIXEL_ID
const KEY = 'taxsteps.ad-consent'
type Choice = 'granted' | 'denied'

type Fbq = ((...args: unknown[]) => void) & { callMethod?: (...args: unknown[]) => void; queue: unknown[][]; push: Fbq; loaded: boolean; version: string; disablePushState?: boolean }
declare global { interface Window { fbq?: Fbq; _fbq?: Fbq } }

// Supabase keeps the session in a script-readable cookie. A browser that holds one never gets third-party code:
// signed-in customers aren't ad audiences, and Meta's script must never run beside their session or records.
const hasSession = () => /(?:^|;\s*)sb-[^=;]+-auth-token/.test(document.cookie)

// The visitor's choice, kept in localStorage (or in memory for this visit if storage is blocked).
let memoryChoice: Choice | null = null
const listeners = new Set<() => void>()
function readChoice(): Choice | 'signed-in' | null {
  if (hasSession()) return 'signed-in'
  try {
    const v = localStorage.getItem(KEY)
    return v === 'granted' || v === 'denied' ? v : null
  } catch { return memoryChoice }
}
function saveChoice(c: Choice | null) {
  memoryChoice = c
  try { if (c) localStorage.setItem(KEY, c); else localStorage.removeItem(KEY) } catch { /* storage blocked: memory only */ }
  listeners.forEach((l) => l())
}
function subscribe(onChange: () => void) {
  listeners.add(onChange)
  window.addEventListener('storage', onChange) // another tab changed it
  return () => { listeners.delete(onChange); window.removeEventListener('storage', onChange) }
}

/** Meta's standard loader, written out so its options can be set before the library arrives. */
function installPixel(id: string) {
  if (window.fbq) return
  const fbq = function (...args: unknown[]) { if (fbq.callMethod) fbq.callMethod(...args); else fbq.queue.push(args) } as Fbq
  fbq.push = fbq
  fbq.loaded = true
  fbq.version = '2.0'
  fbq.queue = []
  fbq.disablePushState = true // page views are sent by us, only for website pages
  window.fbq = window._fbq = fbq
  const s = document.createElement('script')
  s.async = true
  s.src = 'https://connect.facebook.net/en_US/fbevents.js'
  document.head.appendChild(s)
  fbq('set', 'autoConfig', false, id) // no automatic events and no automatic advanced matching (never reads form fields)
  fbq('init', id)
}

export function MetaPixel() {
  const pathname = usePathname()
  const choice = useSyncExternalStore(subscribe, readChoice, () => undefined) // undefined on the server: no banner in the HTML

  // Active only while a website page is mounted and the visitor has accepted.
  useEffect(() => {
    if (!PIXEL_ID || choice !== 'granted' || hasSession()) return
    installPixel(PIXEL_ID)
    window.fbq!('consent', 'grant')
    const lead = (e: MouseEvent) => {
      if ((e.target as Element | null)?.closest?.('a[href="/sign-up"]')) window.fbq?.('track', 'Lead')
    }
    document.addEventListener('click', lead, true)
    return () => {
      document.removeEventListener('click', lead, true)
      window.fbq?.('consent', 'revoke')
    }
  }, [choice])

  useEffect(() => {
    if (PIXEL_ID && choice === 'granted') window.fbq?.('track', 'PageView')
  }, [choice, pathname])

  if (!PIXEL_ID || choice !== null) return null

  return (
    <div className="w-consent" role="region" aria-label="Cookie choices">
      <p>
        We&apos;d like to use Meta&apos;s advertising cookie on this website to see which of our ads work. It never runs inside the app
        or sees your records. <Link href="/privacy">Privacy Policy</Link>
      </p>
      <div className="row">
        <button type="button" className="w-btn w-btn-ghost" onClick={() => saveChoice('denied')}>Decline</button>
        <button type="button" className="w-btn w-btn-primary" onClick={() => saveChoice('granted')}>Accept</button>
      </div>
    </div>
  )
}

/** Footer link that reopens the banner. Hidden when no Pixel is configured. */
export function CookieChoicesButton() {
  if (!PIXEL_ID) return null
  return (
    <button type="button" className="w-link-btn w-cookie-link" onClick={() => saveChoice(null)}>Cookie choices</button>
  )
}
