import Link from 'next/link'
import { Footprints } from 'lucide-react'
import { ICON } from './icons'

export function Logo({ href = '/' }: { href?: string }) {
  return (
    <Link href={href} className="brand" aria-label="Tax Steps home">
      <span className="brand-mark"><Footprints {...ICON} /></span>
      <span className="brand-name">Tax Steps</span>
    </Link>
  )
}
