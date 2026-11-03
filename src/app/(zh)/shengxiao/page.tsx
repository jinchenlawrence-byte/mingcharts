import Link from 'next/link'
import Nav from '@/components/Nav'
import { SHENGXIAO } from '@/lib/shengxiaoData'

export const metadata = {
  title: '十二生肖运势大全：属相性格、财运、婚姻、配对、本命佛查询',
  description: '十二生肖命理详解：属鼠、属牛、属虎、属兔、属龙、属蛇、属马、属羊、属猴、属鸡、属狗、属猪的性格、事业、财运、婚姻、配对、本命佛、幸运颜色数字查询。'
}

// 地支 → 五行展示色（仅展示层；与首页 hw- 五色同一套：木绿/火红/土黄/金灰/水蓝）
const ZHI_WX: Record<string, 'wood' | 'fire' | 'earth' | 'metal' | 'water'> = {
  '子': 'water', '亥': 'water',
  '寅': 'wood', '卯': 'wood',
  '巳': 'fire', '午': 'fire',
  '申': 'metal', '酉': 'metal',
  '辰': 'earth', '戌': 'earth', '丑': 'earth', '未': 'earth',
}

export default function ShengXiaoIndex() {
  return (
    <main className="hw-page">
      <Nav />
      <div className="hw-wrap hw-c-pg">
        <nav className="hw-c-back">
          <Link href="/">首页</Link>
          <span className="mx-2">›</span>
          <span>十二生肖</span>
        </nav>

        <header>
          <h1 className="hw-c-h1">十二生肖运势大全</h1>
          <p className="hw-lede">
            点击您的属相，查看性格、事业、财运、婚姻、配对、本命佛、幸运颜色与数字，以及逐年流年运势。
          </p>
        </header>

        {/* 十二属相卡片墙（地支五行配色圆徽，与首页 hw- 五色一致） */}
        <div className="hw-zod mb-10">
          {SHENGXIAO.map(sx => (
            <Link key={sx.slug} href={`/shengxiao/${sx.slug}`}>
              <span className={`hw-zx hw-${ZHI_WX[sx.zhi] ?? 'earth'}`}>{sx.name}</span>
              <span>
                <b>属{sx.name}</b>
                <i>{sx.zhi} · {sx.wuxing} · 本命佛{sx.benmingfo.replace('菩萨', '')}</i>
              </span>
            </Link>
          ))}
        </div>

        {/* 2027 丁未年窗口：年底至春节是「来年运势」搜索高峰，集中给出 12 个属相入口 */}
        <div className="hw-c-box mb-10">
          <h2 className="hw-c-secTitle">2027 丁未年运势 · 十二属相</h2>
          <p className="hw-c-body mb-4">
            2027 年立春后为丁未年。属羊值太岁（本命年）、属牛冲太岁兼刑、属狗刑太岁、属鼠害太岁；属马六合，属猪与属兔三合。
            下面是各属相 2027 年的分项运势，另有
            <Link href="/article/2027-dingwei-nian-yunshi" className="hw-c-link">「丁未年运势怎么看」</Link>与
            <Link href="/article/2027-fantaishui" className="hw-c-link">「犯太岁怎么化解」</Link>两篇说明。
          </p>
          <div className="flex flex-wrap gap-x-4 gap-y-2">
            {SHENGXIAO.map(sx => (
              <Link key={sx.slug} href={`/shengxiao/${sx.slug}/2027`} className="hw-c-link text-sm">
                属{sx.name} · 2027
              </Link>
            ))}
          </div>
        </div>

        <div className="hw-c-two">
          <div className="hw-c-box">
            <h2 className="hw-c-secTitle">生肖是怎么来的？</h2>
            <p className="hw-c-body">
              十二生肖又称属相，是中国传统以十二地支配十二种动物的纪年方式：子鼠、丑牛、寅虎、卯兔、辰龙、巳蛇、午马、未羊、申猴、酉鸡、戌狗、亥猪。
              生肖以每年立春为界（非公历1月1日），决定一个人的属相。命理中通过生肖地支之间的六合、三合、相冲、相害、相刑关系，
              可推断婚配好坏与流年运势。
            </p>
          </div>
          <div className="hw-c-box">
            <h2 className="hw-c-secTitle">生肖与八字的关系</h2>
            <p className="hw-c-body mb-4">
              生肖只是八字中"年支"一个字，看性格运势以完整八字（年月日时四柱）更为准确。
              生肖运势适合作为通俗参考，而重大决策建议结合完整八字命盘综合分析。
            </p>
            <Link href="/" className="hw-c-btnBig">
              输入时辰看完整八字 →
            </Link>
          </div>
        </div>
      </div>
    </main>
  )
}
