import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { SHENGXIAO, getShengXiao } from '@/lib/shengxiaoData'
import { getShengXiaoEn } from '@/lib/shengxiaoEn'
import { branchEn } from '@/lib/enTerms'
import { triAlternates } from '@/lib/lang'
import { ShengXiaoDetail } from '@/components/shengxiao/ShengXiaoDetail'

export function generateStaticParams() {
  return SHENGXIAO.map((s) => ({ animal: s.slug }))
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ animal: string }>
}): Promise<Metadata> {
  const { animal } = await params
  const sx = getShengXiao(animal)
  const copy = getShengXiaoEn(animal)
  if (!sx || !copy) return { title: 'Zodiac sign not found' }
  return {
    title: `${copy.name} (${branchEn(sx.zhi)}): personality, career, wealth and compatibility`,
    description: `The ${copy.name} in the Chinese zodiac: personality, career, money, marriage, compatibility, Six Harmony and Three Harmony pairings, guardian buddha ${copy.buddha}, lucky items and the 2024–2031 annual pillars.`,
    alternates: {
      canonical: `/en/shengxiao/${sx.slug}`,
      languages: triAlternates(`/shengxiao/${sx.slug}`),
    },
  }
}

// English detail: shares components/shengxiao/ShengXiaoDetail with zh/tw (unified 2026-11-09)
export default async function EnShengXiaoAnimal({
  params,
}: {
  params: Promise<{ animal: string }>
}) {
  const { animal } = await params
  const sx = getShengXiao(animal)
  const copy = getShengXiaoEn(animal)
  if (!sx || !copy) notFound()

  return <ShengXiaoDetail locale="en" sx={sx} />
}
