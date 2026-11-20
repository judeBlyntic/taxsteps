import type { Metadata } from 'next'
import { ACCOUNT_DELETION } from '@taxsteps/core'
import { LegalArticle } from '../LegalArticle'

export const metadata: Metadata = {
  title: ACCOUNT_DELETION.title,
  description: 'How to delete your Tax Steps account and data from the phone app, the web app, or by email.',
}

// Google Play "Delete account URL": public, no sign-in, names the app and developer, explains what is kept.
export default function DeleteAccountPage() {
  return <LegalArticle doc={ACCOUNT_DELETION} />
}
