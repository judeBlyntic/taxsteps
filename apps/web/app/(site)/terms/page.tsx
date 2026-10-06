import type { Metadata } from 'next'
import { TERMS } from '@taxsteps/core'
import { LegalArticle } from '../LegalArticle'

export const metadata: Metadata = { title: TERMS.title, description: 'The agreement between you and Blyntic Ltd for using Tax Steps.' }

export default function TermsPage() {
  return <LegalArticle doc={TERMS} />
}
