import type { Metadata } from 'next'
import ClaimClient from '@/components/claim/ClaimClient'

// Claim page (English). The token lives in the URL, so the page is never indexed.
export const metadata: Metadata = {
  title: 'Claim your Fate Book',
  description: 'Sign in with the email you used at checkout to add your paid Fate Book to your account.',
  robots: { index: false, follow: false },
}

export default function EnClaimPage() {
  return <ClaimClient locale="en" />
}
