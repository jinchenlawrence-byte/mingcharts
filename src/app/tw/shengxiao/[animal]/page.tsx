import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { SHENGXIAO, getShengXiao } from '@/lib/shengxiaoData'
import { triAlternates } from '@/lib/lang'
import { toHant } from '@/lib/hant'
import { ShengXiaoDetail } from '@/components/shengxiao/ShengXiaoDetail'

export function generateStaticParams() {
  return SHENGXIAO.map((s) => ({ animal: s.slug }))
}

export async function generateMetadata({ params }: { params: Promise<{ animal: string }> }): Promise<Metadata> {
  const { animal } = await params
  const sx = getShengXiao(animal)
  if (!sx) return { title: '生肖未找到' }
  const name = toHant(sx.name)
  return {
    title: `屬${name}的命運詳解：${sx.years.slice(-4).join('、')}年屬${name}人性格財運婚姻運勢`,
    description: `屬${name}（地支${sx.zhi}、五行屬${toHant(sx.wuxing)}）人命理解析：性格特點、事業財運、婚姻配對、健康養生、本命佛${toHant(sx.benmingfo)}、幸運數字顏色，以及 2024-2031 流年運勢。`,
    alternates: {
      canonical: `/tw/shengxiao/${sx.slug}`,
      languages: triAlternates(`/shengxiao/${sx.slug}`),
    },
  }
}

// 繁体详情页：收敛到与简/英同一套 components/shengxiao/ShengXiaoDetail（2026-11-09）
export default async function HantShengXiaoDetail({ params }: { params: Promise<{ animal: string }> }) {
  const { animal } = await params
  const sx = getShengXiao(animal)
  if (!sx) notFound()

  return <ShengXiaoDetail locale="zh-Hant" sx={sx} />
}
