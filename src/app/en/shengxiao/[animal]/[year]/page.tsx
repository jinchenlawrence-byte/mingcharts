import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { SHENGXIAO, getShengXiao, LIUNIAN_YEARS } from '@/lib/shengxiaoData'
import { getShengXiaoEn } from '@/lib/shengxiaoEn'
import { getLiunianEn } from '@/lib/shengxiaoYearEn'
import { triAlternates } from '@/lib/lang'
import { ShengXiaoYearView } from '@/components/shengxiao/ShengXiaoYearView'

// English year page (/en/shengxiao/<sign>/<year>): 12 signs × 2024–2031 = 96 pages.
// Shares components/shengxiao/ShengXiaoYearView with zh/tw; English copy comes from
// lib/shengxiaoYearEn (no Chinese fields from getLiunian are rendered here).

export function generateStaticParams() {
  return SHENGXIAO.flatMap((sx) =>
    LIUNIAN_YEARS.map((year) => ({ animal: sx.slug, year: String(year) }))
  )
}

// 2026-11-17 GSC: this page had 123 impressions, 0 clicks at average position 5.48
// for the query "tiger 2031". Only this page's title/description are overridden so the
// query and the year sit at the front of the snippet; the other 95 pages keep the
// generic template below (no unrelated page is touched).
const INTENT_META: Record<string, { title: string; description: string }> = {
  'hu/2031': {
    title: '2031 Tiger Fortune: Love, Career & Money',
    description:
      'Tiger in 2031: a He Tai Sui harmony year. What it means for career, wealth, love and health, plus what to weigh before big decisions.',
  },
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ animal: string; year: string }>
}): Promise<Metadata> {
  const { animal, year } = await params
  const sx = getShengXiao(animal)
  const copy = getShengXiaoEn(animal)

  if (!sx || !copy || !LIUNIAN_YEARS.includes(Number(year))) return { title: 'Zodiac year not found' }

  const en = getLiunianEn(sx, Number(year))
  const intent = INTENT_META[`${sx.slug}/${year}`]
  return {
    title: intent?.title ?? `${year} ${copy.name} annual fortune: ${en.relationText}`,
    description:
      intent?.description ??
      `${year} (${en.ganZhi}) annual reading for the ${copy.name}: ${en.summary} Career, wealth, relationships, health and Tai Sui guidance.`,
    alternates: {
      canonical: `/en/shengxiao/${sx.slug}/${year}`,
      languages: triAlternates(`/shengxiao/${sx.slug}/${year}`),
    },
  }
}

export default async function EnShengXiaoYear({ params }: { params: Promise<{ animal: string; year: string }> }) {
  const { animal, year } = await params
  const yearNum = Number(year)
  const sx = getShengXiao(animal)
  const copy = getShengXiaoEn(animal)

  if (!sx || !copy || !LIUNIAN_YEARS.includes(yearNum)) notFound()

  return <ShengXiaoYearView locale="en" sx={sx} year={yearNum} />
}
