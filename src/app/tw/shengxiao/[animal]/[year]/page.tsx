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

  // 2026-11-18 GSC（2027 窗口預備）：四頁已有位置、零點擊，摘要只寫「詳解…全解」沒有結論。
  // 只覆蓋這四頁，其餘 92 頁仍走上面的模板（不建配置層）。繁體逐字手寫，不經 toHant。
  // 展示 / 點擊 / 均位（28 天）：shu 29/0/6.14、yang 27/0/5.41、zhu 15/0/4.60、niu 1/0/4.00
  if (year === '2027') {
    if (sx.slug === 'shu') {
      title = '2027屬鼠運勢：害太歲年，口舌與暗損怎麼防'
      description = '2027丁未年，屬鼠子水與太歲未土相害，屬害太歲。害不主明面衝突，而是合作條件中途變、好意被誤解這類隱性消耗。頁內逐項說明事業、財運、感情、健康，並附開運顏色、幸運數字與本命佛。'
    } else if (sx.slug === 'yang') {
      title = '2027屬羊運勢：本命年值太歲，事業感情怎麼守'
      description = '2027丁未年，屬羊未土與太歲同支，值太歲，也就是本命年。值太歲是回到自己的本位：外部助力未必少，內心的緊迫感更強。頁內逐項說明事業、財運、感情、健康，並附開運顏色、幸運數字與本命佛。'
    } else if (sx.slug === 'zhu') {
      title = '2027屬豬運勢：合太歲貴人年，合作感情怎麼用'
      description = '2027丁未年，屬豬亥水與太歲未土成三合，屬合太歲，非犯太歲。合太歲主貴人與合作，適合把既有的關係與計畫往前推。頁內逐項說明事業、財運、感情、健康，並附開運顏色、幸運數字與本命佛。'
    } else if (sx.slug === 'niu') {
      title = '2027屬牛運勢：沖太歲兼刑，變動年怎麼過'
      description = '2027丁未年，屬牛丑土與太歲未土相沖兼相刑，是十二屬相裡關係最複雜的一組。沖主變動、刑主摩擦，變化中帶著糾纏。頁內逐項說明事業、財運、感情、健康，並附開運顏色、幸運數字與本命佛。'
    }
  }

  // 2028 五頁按 slug 手寫覆蓋（不建配置層）。以下繁體均為簡體文案經 toHant 的實測派生結果
  // 2026-11-17 GSC：shu（204 展示 / CTR 1.96%）、long（121 展示 / CTR 1.65%）兩頁改寫，
  // 年份與「屬X運勢」提到最前，描述直接給三合貴人年的具體判斷，不用「詳解」類空話。
  if (year === '2028') {
    if (sx.slug === 'long') {
      title = '2028屬龍運勢：申辰三合，事業感情財運詳解'
      description = '2028戊申年，屬龍與太歲申金成三合，是合太歲的貴人年，非犯太歲。頁內說明事業、財運、感情、健康，並附開運顏色、幸運數字與本命佛。'
    } else if (sx.slug === 'shu') {
      title = '2028屬鼠運勢：申子三合，事業感情財運詳解'
      description = '2028戊申年，屬鼠與太歲申金成三合，是合太歲的貴人年。頁內逐項說明事業、財運、感情、健康，並附開運顏色、幸運數字與本命佛。'
    } else if (sx.slug === 'ma') {
      title = '2028屬馬運勢：戊申年無沖合，該守還是該攻'
      description = '2028戊申年，屬馬與太歲無刑沖合害，屬平順之年。頁內逐項拆解事業、財運、感情、健康，並附開運顏色、幸運數字與本命佛。'
    } else if (sx.slug === 'niu') {
      title = '2028屬牛運勢：丑土遇申金，平順年怎麼佈局'
      description = '2028戊申年，屬牛丑土與太歲申金無刑沖，屬平順之年。頁內給四項運勢判斷、開運顏色與數字，另附三條常見問答。'
    } else if (sx.slug === 'gou') {
      title = '2028屬狗運勢：戊申年無刑沖，平順年事業感情判斷'
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
