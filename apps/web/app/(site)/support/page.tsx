import type { Metadata } from 'next'
import { SUPPORT } from '@taxsteps/core'
import { LegalArticle } from '../LegalArticle'

export const metadata: Metadata = { title: SUPPORT.title, description: 'Get help with Tax Steps on iPhone, Android and the web.' }

// App Store Connect "Support URL".
export default function SupportPage() {
  return <LegalArticle doc={SUPPORT} />
}
