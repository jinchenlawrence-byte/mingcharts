import { notFound } from 'next/navigation'
import Nav from '@/components/Nav'
import { SHENGXIAO, getShengXiao, getLiunian, LIUNIAN_YEARS, TAISUI_TITLE_WORD, TAISUI_KEYWORD_WORD } from '@/lib/shengxiaoData'
import { ShengXiaoYearView } from '@/components/shengxiao/ShengXiaoYearView'
import { triAlternates } from '@/lib/lang'

export function generateStaticParams() {
  const params: { animal: string; year: string }[] = []
  for (const sx of SHENGXIAO) {
    for (const y of LIUNIAN_YEARS) {
      params.push({ animal: sx.slug, year: String(y) })
    }
  }
  return params
}

export async function generateMetadata({ params }: { params: Promise<{ animal: string; year: string }> }) {
  const { animal, year } = await params
  const sx = getShengXiao(animal)
  if (!sx) return { title: '页面未找到' }
  const ln = getLiunian(sx, Number(year))
  // ★ 标题词走单一来源（'平' = 平顺之年）；keywords 另用关键词表（'平' = 流年运势）
  const taiSuiWord = TAISUI_TITLE_WORD[ln.relation]
  return {
    title: `${year}年属${sx.name}运势详解：${taiSuiWord}，事业财运感情健康全解`,
    description: `${year}${ln.ganZhi}年属${sx.name}人运势如何？${ln.relationText}详解属${sx.name}${year}年事业、财运、感情婚姻、健康注意事项与开运化解建议。`,
    keywords: [`${year}年属${sx.name}运势`, `属${sx.name}${year}年`, `${year}年${TAISUI_KEYWORD_WORD[ln.relation]}`, `属${sx.name}${year}年财运`, `属${sx.name}本命年`],
    // hreflang：与 /tw、/en 同名年份页三向互指（矩阵由 lib/lang 单一生成）
    alternates: {
      canonical: `/shengxiao/${sx.slug}/${year}`,
      languages: triAlternates(`/shengxiao/${sx.slug}/${year}`),
    },
  }
}

// 简体流年页体例：三语共用 components/shengxiao/ShengXiaoYearView（2026-11-09 收敛）
export default async function LiunianPage({ params }: { params: Promise<{ animal: string; year: string }> }) {
  const { animal, year } = await params
  const yearNum = Number(year)
  const sx = getShengXiao(animal)
  if (!sx || !LIUNIAN_YEARS.includes(yearNum)) notFound()

  return (
    <main className="hw-page">
      <Nav />
      <ShengXiaoYearView locale="zh-Hans" sx={sx} year={yearNum} />
    </main>
  )
}
