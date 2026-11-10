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
  let title = `${year}年属${sx.name}运势详解：${taiSuiWord}，事业财运感情健康全解`
  let description = `${year}${ln.ganZhi}年属${sx.name}人运势如何？${ln.relationText}详解属${sx.name}${year}年事业、财运、感情婚姻、健康注意事项与开运化解建议。`

  // 2028 五页按 slug 手写覆盖（不建配置层）：原模板未给出结果，点击率低
  if (year === '2028') {
    if (sx.slug === 'long') {
      title = '2028属龙运势：申辰三合贵人年，事业感情怎么借力'
      description = '2028戊申年，属龙辰土与太岁申金成三合，非犯太岁。页内给事业、财运、感情、健康四项判断，以及开运颜色、幸运数字与本命佛。'
    } else if (sx.slug === 'shu') {
      title = '2028属鼠生肖运程：申子三合，合作与贵人怎么用'
      description = '2028戊申年，属鼠子水与太岁申金成三合，贵人与合作机会增多。页内拆解事业、财运、感情、健康四项，并附开运颜色、数字与本命佛。'
    } else if (sx.slug === 'ma') {
      title = '2028属马运势：戊申年无冲合，该守还是该攻'
      description = '2028戊申年，属马与太岁无刑冲合害，属平顺之年。页内逐项拆解事业、财运、感情、健康，并附开运颜色、幸运数字与本命佛。'
    } else if (sx.slug === 'niu') {
      title = '2028属牛运势：丑土遇申金，平顺年怎么布局'
      description = '2028戊申年，属牛丑土与太岁申金无刑冲，属平顺之年。页内给四项运势判断、开运颜色与数字，另附三条常见问答。'
    } else if (sx.slug === 'gou') {
      title = '2028属狗运势：戊申年无刑冲，平顺年的事业与感情判断'
      description = '2028戊申年，属狗戌土与太岁申金无刑冲合害，属平顺之年。页内给事业、财运、感情、健康四项判断与开运建议，另附三条问答。'
    }
  }

  return {
    title,
    description,
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
