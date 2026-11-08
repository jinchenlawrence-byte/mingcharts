import Nav from '@/components/Nav'
import { ShengXiaoIndex } from '@/components/shengxiao/ShengXiaoIndex'
import { triAlternates } from '@/lib/lang'

export const metadata = {
  title: '十二生肖运势大全：属相性格、财运、婚姻、配对、本命佛查询',
  description: '十二生肖命理详解：属鼠、属牛、属虎、属兔、属龙、属蛇、属马、属羊、属猴、属鸡、属狗、属猪的性格、事业、财运、婚姻、配对、本命佛、幸运颜色数字查询。',
  // 与 /tw/shengxiao、/en/shengxiao 三向互指（英文页 2026-11-05 补齐）
  alternates: { canonical: '/shengxiao', languages: triAlternates('/shengxiao') },
}

// 十二生肖索引页体例：三语共用 components/shengxiao/ShengXiaoIndex（2026-11-09 收敛）
export default function ShengXiaoIndexPage() {
  return (
    <main className="hw-page">
      <Nav />
      <ShengXiaoIndex locale="zh-Hans" />
    </main>
  )
}
