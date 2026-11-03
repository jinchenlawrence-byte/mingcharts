import type { Metadata } from 'next'
import EnAuthClient from './Client'
import { triAlternates } from '@/lib/lang'

export const metadata: Metadata = {
  title: 'Sign in / Sign up',
  description: 'Sign in to save your Bazi chart and review unlocked Fate Book reports.',
  alternates: { canonical: '/en/auth', languages: triAlternates('/auth') },
  robots: { index: false, follow: true },
}

export default function EnAuthPage() {
  return <EnAuthClient />
}
