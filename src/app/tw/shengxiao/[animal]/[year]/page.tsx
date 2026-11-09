import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { SHENGXIAO, getShengXiao, getLiunian, LIUNIAN_YEARS, TAISUI_TITLE_WORD } from '@/lib/shengxiaoData'
import { triAlternates } from '@/lib/lang'
import { toHant } from '@/lib/hant'
import { ShengXiaoYearView } from '@/components/shengxiao/ShengXiaoYearView'

// 繁体流年页（/tw/shengxiao/<属相>/<年>，96 页）
//
// 与简体页同源：内容来自 shengxiaoData.getLiunian，正文一律经 toHant 派生；
// 页面体例与简/英共用 components/shengxiao/ShengXiaoYearView（2026-11-09 收敛），
// 不再维护第二套 JSX。★ 干支由 toHant 的占位保护保证不被误转。

export function generateStaticParams() {
  const params: { animal: string; year: string }[] = []
  for (const sx of SHENGXIAO) {
    for (const y of LIUNIAN_YEARS) {
      params.push({ animal: sx.slug, year: String(y) })
    }
  }
  return params
}

export async function generateMetadata({ params }: { params: Promise<{ animal: string; year: string }> }): Promise<Metadata> {
  const { animal, year } = await params
  const sx = getShengXiao(animal)
  if (!sx) return { title: '頁面未找到' }
  const ln = getLiunian(sx, Number(year))
  const name = toHant(sx.name)
  // ★ 词表来自单一来源，繁体由 toHant 派生（禁止再手写第二份繁体映射）
  const taiSuiWord = toHant(TAISUI_TITLE_WORD[ln.relation])
  return {
    title: `${year}年屬${name}運勢詳解：${taiSuiWord}，事業財運感情健康全解`,
    description: `${year}${ln.ganZhi}年屬${name}人運勢如何？${toHant(ln.relationText)}詳解屬${name}${year}年事業、財運、感情婚姻、健康注意事項與開運化解建議。`,
    alternates: {
      canonical: `/tw/shengxiao/${sx.slug}/${year}`,
      languages: triAlternates(`/shengxiao/${sx.slug}/${year}`),
    },
  }
}

export default async function HantShengXiaoLiunian({ params }: { params: Promise<{ animal: string; year: string }> }) {
  const { animal, year } = await params
  const yearNum = Number(year)
  const sx = getShengXiao(animal)
  if (!sx || !LIUNIAN_YEARS.includes(yearNum)) notFound()

  return <ShengXiaoYearView locale="zh-Hant" sx={sx} year={yearNum} />
}
