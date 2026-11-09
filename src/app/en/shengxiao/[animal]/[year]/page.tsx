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
  return {
    title: `${year} ${copy.name} annual fortune: ${en.relationText}`,
    description: `${year} (${en.ganZhi}) annual reading for the ${copy.name}: ${en.summary} Career, wealth, relationships, health and Tai Sui guidance.`,
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
