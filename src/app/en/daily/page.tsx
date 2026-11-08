import type { Metadata } from 'next'
import DailyView from '@/components/daily/DailyView'
import { triAlternates } from '@/lib/lang'

export const metadata: Metadata = {
  title: "Daily sign: today's stem-branch and one thought to keep",
  description:
    "A new sign each day, drawn from the imagery of today's heavenly stem and earthly branch — a small mirror for reflection, not a prediction. Days turn by time zone at the late Zi hour (23:00).",
  alternates: { canonical: '/en/daily', languages: triAlternates('/daily') },
}

// English daily sign: shares components/daily/DailyView with zh/tw (added 2026-11-09)
export default async function EnDailyPage({
  searchParams,
}: {
  searchParams: Promise<{ zone?: string }>
}) {
  const sp = await searchParams
  return <DailyView locale="en" rawZone={sp.zone ?? null} />
}
