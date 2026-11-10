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
  let title = `${year}年屬${name}運勢詳解：${taiSuiWord}，事業財運感情健康全解`
  let description = `${year}${ln.ganZhi}年屬${name}人運勢如何？${toHant(ln.relationText)}詳解屬${name}${year}年事業、財運、感情婚姻、健康注意事項與開運化解建議。`

  // 2028 五頁按 slug 手寫覆蓋（不建配置層）。以下繁體均為簡體文案經 toHant 的實測派生結果
  if (year === '2028') {
    if (sx.slug === 'long') {
      title = '2028屬龍運勢：申辰三合貴人年，事業感情怎麼借力'
      description = '2028戊申年，屬龍辰土與太歲申金成三合，非犯太歲。頁內給事業、財運、感情、健康四項判斷，以及開運顏色、幸運數字與本命佛。'
    } else if (sx.slug === 'shu') {
      title = '2028屬鼠生肖運程：申子三合，合作與貴人怎麼用'
      description = '2028戊申年，屬鼠子水與太歲申金成三合，貴人與合作機會增多。頁內拆解事業、財運、感情、健康四項，並附開運顏色、數字與本命佛。'
    } else if (sx.slug === 'ma') {
      title = '2028屬馬運勢：戊申年無沖合，該守還是該攻'
      description = '2028戊申年，屬馬與太歲無刑沖合害，屬平順之年。頁內逐項拆解事業、財運、感情、健康，並附開運顏色、幸運數字與本命佛。'
    } else if (sx.slug === 'niu') {
      title = '2028屬牛運勢：丑土遇申金，平順年怎麼佈局'
      description = '2028戊申年，屬牛丑土與太歲申金無刑沖，屬平順之年。頁內給四項運勢判斷、開運顏色與數字，另附三條常見問答。'
    } else if (sx.slug === 'gou') {
      title = '2028屬狗運勢：戊申年無刑沖，平順年的事業與感情判斷'
      description = '2028戊申年，屬狗戌土與太歲申金無刑沖合害，屬平順之年。頁內給事業、財運、感情、健康四項判斷與開運建議，另附三條問答。'
    }
  }

  return {
    title,
    description,
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
