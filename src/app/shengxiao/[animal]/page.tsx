import Link from 'next/link'
import Nav from '@/components/Nav'
import { notFound } from 'next/navigation'
import { SHENGXIAO, getShengXiao, getPeiDui, getLiunian, LIUNIAN_YEARS } from '@/lib/shengxiaoData'

export function generateStaticParams() {
  return SHENGXIAO.map(s => ({ animal: s.slug }))
}

export async function generateMetadata({ params }: { params: Promise<{ animal: string }> }) {
  const { animal } = await params
  const sx = getShengXiao(animal)
  if (!sx) return { title: '生肖未找到' }
  return {
    title: `属${sx.name}的命运详解：${sx.years.slice(-4).join('、')}年属${sx.name}人性格财运婚姻运势`,
    description: `属${sx.name}（地支${sx.zhi}、五行属${sx.wuxing}）人命理详解：性格特点、事业财运、婚姻配对、健康养生、本命佛${sx.benmingfo}、幸运数字颜色，以及2024-2031流年运势。`,
    keywords: [`属${sx.name}`, `${sx.name}年出生`, `属${sx.name}运势`, `属${sx.name}性格`, `属${sx.name}婚姻`, `属${sx.name}配对`, sx.benmingfo]
  }
}

// 地支 → 五行展示色 class（与首页/生肖索引页同一套 hw- 五色）
const ZHI_WX_CLASS: Record<string, string> = {
  '子': 'water', '亥': 'water',
  '寅': 'wood', '卯': 'wood',
  '巳': 'fire', '午': 'fire',
  '申': 'metal', '酉': 'metal',
  '辰': 'earth', '戌': 'earth', '丑': 'earth', '未': 'earth',
}

// 流年格配色（只作用于 div/span——.hw-page a 会压制 <a> 上的 Tailwind 文字色，
// 故盒色挂在 <a>、字色挂在子元素；色板与下方图例说明一致：绿=合、红=害/刑、橙=冲、灰=平）
const TONE_BOX: Record<string, string> = {
  '吉': 'bg-green-50 border-green-200',
  '凶': 'bg-red-50 border-red-200',
  '动': 'bg-orange-50 border-orange-200',
  '平': 'bg-paper-dark/30 border-gold/15'
}
const TONE_TX: Record<string, string> = {
  '吉': 'text-green-700',
  '凶': 'text-red-700',
  '动': 'text-orange-700',
  '平': 'text-ink-light'
}

export default async function ShengXiaoPage({ params }: { params: Promise<{ animal: string }> }) {
  const { animal } = await params
  const sx = getShengXiao(animal)
  if (!sx) notFound()

  return (
    <main className="hw-page">
      <Nav />
      <div className="hw-wrap hw-c-pg">
        <nav className="hw-c-back">
          <Link href="/">首页</Link>
          <span className="mx-2">›</span>
          <Link href="/shengxiao">十二生肖</Link>
          <span className="mx-2">›</span>
          <span>属{sx.name}</span>
        </nav>

        {/* 头部信息 */}
        <div className="hw-c-box mb-6">
          <div className="flex items-center gap-5 mb-4">
            <div className={`hw-zx w-20! h-20! text-4xl! hw-${ZHI_WX_CLASS[sx.zhi] ?? 'earth'}`}>
              {sx.name}
            </div>
            <div>
              <h1 className="hw-c-h1">属{sx.name}人命运详解</h1>
              <p className="hw-c-meta">
                地支{sx.zhi} · 五行属{sx.wuxing} · 本命佛{sx.benmingfo}
              </p>
              <p className="text-ink-light/40 text-xs mt-1">
                出生年份（以立春为界）：{sx.years.join('、')}年
              </p>
            </div>
          </div>

          {/* 生肖关系 */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-2 text-sm">
            <div className="bg-green-50 border border-green-200 rounded p-2 text-center">
              <div className="text-xs text-ink-light/60">六合贵人</div>
              <div className="font-bold text-green-700">属{sx.liuHe}</div>
            </div>
            <div className="bg-green-50 border border-green-200 rounded p-2 text-center">
              <div className="text-xs text-ink-light/60">三合</div>
              <div className="font-bold text-green-700">属{sx.sanHe[0]}、{sx.sanHe[1]}</div>
            </div>
            <div className="bg-red-50 border border-red-200 rounded p-2 text-center">
              <div className="text-xs text-ink-light/60">六冲</div>
              <div className="font-bold text-red-700">属{sx.liuChong}</div>
            </div>
            <div className="bg-red-50 border border-red-200 rounded p-2 text-center">
              <div className="text-xs text-ink-light/60">六害</div>
              <div className="font-bold text-red-700">属{sx.liuHai}</div>
            </div>
            <div className="bg-orange-50 border border-orange-200 rounded p-2 text-center col-span-2 md:col-span-1">
              <div className="text-xs text-ink-light/60">相刑</div>
              <div className="font-bold text-orange-700">{sx.sanXing.map(x => '属' + x).join('、')}</div>
            </div>
          </div>
        </div>

        {/* 五大命理板块 */}
        <Section title="性格特点" body={sx.personality} />
        <Section title="事业运" body={sx.career} />
        <Section title="财运" body={sx.wealth} />
        <Section title="婚姻感情" body={sx.marriage} />
        <Section title="健康养生" body={sx.health} />

        {/* 幸运物 */}
        <div className="hw-c-box mb-6">
          <h2 className="hw-c-secTitle">属{sx.name}幸运物与开运指南</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
            <LuckyItem label="幸运数字" value={sx.luckyNumber} />
            <LuckyItem label="幸运颜色" value={sx.luckyColor} />
            <LuckyItem label="有利方位" value={sx.luckyDirection} />
            <LuckyItem label="本命佛" value={sx.benmingfo} />
            <LuckyItem label="吉祥花卉" value={sx.luckyFlower} />
            <LuckyItem label="幸运宝石" value={sx.luckyStone} />
          </div>
          <p className="text-xs text-ink-light/40 mt-4">
            提示：幸运物为传统民俗参考，最上等的改运之道是修心积德、勤奋努力。
          </p>
        </div>

        {/* 生肖配对表 */}
        <div className="hw-c-box mb-6">
          <h2 className="hw-c-secTitle">属{sx.name}生肖配对表</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {SHENGXIAO.map(other => {
              const pd = getPeiDui(sx, other.name)
              const good = pd.level.includes('上等')
              return (
                <div
                  key={other.slug}
                  className={`border rounded p-3 text-sm ${good ? 'border-green-200 bg-green-50' : pd.level.includes('中等') ? 'border-gold/15' : 'border-red-100 bg-red-50/40'}`}
                >
                  <div className="flex justify-between items-center mb-1">
                    <Link href={`/shengxiao/${other.slug}`} className="font-bold hw-c-link">
                      {sx.name} + {other.name}
                    </Link>
                    <span className={`text-xs px-2 py-0.5 rounded ${good ? 'bg-green-100 text-green-700' : pd.level.includes('中等') ? 'bg-paper-dark/40 text-ink-light' : 'bg-red-100 text-red-600'}`}>
                      {pd.level}
                    </span>
                  </div>
                  <p className="text-xs text-ink-light leading-relaxed">{pd.desc}</p>
                </div>
              )
            })}
          </div>
        </div>

        {/* 流年运势入口 */}
        <div className="hw-c-box mb-6">
          <h2 className="hw-c-secTitle">属{sx.name}流年运势（2024-2031）</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {LIUNIAN_YEARS.map(y => {
              const ln = getLiunian(sx, y)
              return (
                <Link
                  key={y}
                  href={`/shengxiao/${sx.slug}/${y}`}
                  className={`block border rounded-lg p-3 text-center transition ${TONE_BOX[ln.tone]}`}
                >
                  <div className="font-bold text-lg">{y}</div>
                  <div className={`text-xs mt-0.5 ${TONE_TX[ln.tone]}`}>{ln.ganZhi}年 · {ln.relation}太岁</div>
                </Link>
              )
            })}
          </div>
          <p className="text-xs text-ink-light/40 mt-3">
            绿色为合太岁吉年，红色为害/刑太岁需谨慎，橙色为冲太岁主动荡，灰色为平稳之年。
          </p>
        </div>

        {/* CTA */}
        <div className="hw-c-cta">
          <h2 className="hw-c-secTitle">生肖只是年支，八字更精准</h2>
          <p className="hw-c-dx">
            相同生肖的人命运千差万别，因为完整八字包含年月日时四柱。输入您的精确出生时辰，查看专属命盘。
          </p>
          <Link href="/" className="hw-c-btnBig">
            立即排八字 →
          </Link>
        </div>

        <p className="text-center text-xs text-ink-light/40 mt-6">
          以上内容为传统命理民俗文化，仅供参考娱乐，不构成决策依据。
        </p>
      </div>
    </main>
  )
}

function Section({ title, body }: { title: string; body: string }) {
  return (
    <div className="hw-c-box mb-4">
      <h2 className="hw-c-secTitle">{title}</h2>
      <p className="hw-c-body">{body}</p>
    </div>
  )
}

function LuckyItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center gap-3 bg-gold/5 rounded p-3">
      <span className="text-ink-light/60 shrink-0">{label}</span>
      <span className="font-semibold text-ink">{value}</span>
    </div>
  )
}
