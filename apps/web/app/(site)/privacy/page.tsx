import type { Metadata } from 'next'
import { PRIVACY } from '@taxsteps/core'
import { LegalArticle } from '../LegalArticle'

export const metadata: Metadata = { title: PRIVACY.title, description: 'How Tax Steps handles your information: you own it, we never sell or share it.' }

export default function PrivacyPage() {
  return <LegalArticle doc={PRIVACY} />
}
