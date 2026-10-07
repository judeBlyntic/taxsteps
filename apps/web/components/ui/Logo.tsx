import Link from 'next/link'
import { Footprints } from 'lucide-react'
import { ICON } from './icons'

/** `reload`: plain link with a full page load (website pages, so third-party scripts never carry over into the app). */
export function Logo({ href = '/', reload = false }: { href?: string; reload?: boolean }) {
  const inner = <><span className="brand-mark"><Footprints {...ICON} /></span><span className="brand-name">Tax Steps</span></>
  if (reload) return <a href={href} className="brand" aria-label="Tax Steps home">{inner}</a>
  return <Link href={href} className="brand" aria-label="Tax Steps home">{inner}</Link>
}
