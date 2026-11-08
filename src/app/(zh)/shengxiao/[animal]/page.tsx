import Nav from '@/components/Nav'
import { notFound } from 'next/navigation'
import { SHENGXIAO, getShengXiao } from '@/lib/shengxiaoData'
import { ShengXiaoDetail } from '@/components/shengxiao/ShengXiaoDetail'
import { triAlternates } from '@/lib/lang'

export function generateStaticParams() {
  return SHENGXIAO.map((s) => ({ animal: s.slug }))
}

export async function generateMetadata({ params }: { params: Promise<{ animal: string }> }) {
  const { animal } = await params
  const sx = getShengXiao(animal)
  if (!sx) return { title: '生肖未找到' }
  return {
    title: `属${sx.name}的命运详解：${sx.years.slice(-4).join('、')}年属${sx.name}人性格财运婚姻运势`,
    description: `属${sx.name}（地支${sx.zhi}、五行属${sx.wuxing}）人命理详解：性格特点、事业财运、婚姻配对、健康养生、本命佛${sx.benmingfo}、幸运数字颜色，以及2024-2031流年运势。`,
    keywords: [`属${sx.name}`, `${sx.name}年出生`, `属${sx.name}运势`, `属${sx.name}性格`, `属${sx.name}婚姻`, `属${sx.name}配对`, sx.benmingfo],
    // hreflang：与 /tw/shengxiao/<slug>、/en/shengxiao/<slug> 三向互指（矩阵由 lib/lang 单一生成）
    alternates: {
      canonical: `/shengxiao/${sx.slug}`,
      languages: triAlternates(`/shengxiao/${sx.slug}`),
    },
  }
}

// 生肖详情页体例：三语共用 components/shengxiao/ShengXiaoDetail（2026-11-09 收敛）
export default async function ShengXiaoPage({ params }: { params: Promise<{ animal: string }> }) {
  const { animal } = await params
  const sx = getShengXiao(animal)
  if (!sx) notFound()

  return (
    <main className="hw-page">
      <Nav />
      <ShengXiaoDetail locale="zh-Hans" sx={sx} />
    </main>
  )
}
