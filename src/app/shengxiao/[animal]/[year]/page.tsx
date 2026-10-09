import Link from 'next/link'
import { notFound } from 'next/navigation'
import { SHENGXIAO, getShengXiao, getLiunian, LIUNIAN_YEARS } from '@/lib/shengxiaoData'

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
  const taiSuiWord = { '值': '本命年值太岁', '冲': '冲太岁', '害': '害太岁', '刑': '刑太岁', '合': '合太岁', '平': '运势' }[ln.relation]
  return {
    title: `${year}年属${sx.name}运势详解：${taiSuiWord}，事业财运感情健康全解`,
    description: `${year}${ln.ganZhi}年属${sx.name}人运势如何？${ln.relationText}详解属${sx.name}${year}年事业、财运、感情婚姻、健康注意事项与开运化解建议。`,
    keywords: [`${year}年属${sx.name}运势`, `属${sx.name}${year}年`, `${year}年${taiSuiWord}`, `属${sx.name}${year}年财运`, `属${sx.name}本命年`]
  }
}

const TONE_BADGE: Record<string, string> = {
  '吉': 'bg-green-100 text-green-700',
  '凶': 'bg-red-100 text-red-700',
  '动': 'bg-orange-100 text-orange-700',
  '平': 'bg-gray-100 text-gray-600'
}
const TONE_WORD: Record<string, string> = { '吉': '吉运年', '凶': '谨慎年', '动': '变动年', '平': '平稳年' }

export default async function LiunianPage({ params }: { params: Promise<{ animal: string; year: string }> }) {
  const { animal, year } = await params
  const yearNum = Number(year)
  const sx = getShengXiao(animal)
  if (!sx || !LIUNIAN_YEARS.includes(yearNum)) notFound()

  const ln = getLiunian(sx, yearNum)
  const prevYear = LIUNIAN_YEARS[LIUNIAN_YEARS.indexOf(yearNum) - 1]
  const nextYear = LIUNIAN_YEARS[LIUNIAN_YEARS.indexOf(yearNum) + 1]
  const isFanTaiSui = ['值', '冲', '害', '刑'].includes(ln.relation)

  return (
    <main className="min-h-screen bg-gradient-to-b from-amber-50 to-white">
      <div className="container mx-auto px-4 py-8 max-w-3xl">
        <nav className="text-sm text-gray-500 mb-4">
          <Link href="/" className="hover:text-amber-700">首页</Link>
          <span className="mx-2">›</span>
          <Link href="/shengxiao" className="hover:text-amber-700">十二生肖</Link>
          <span className="mx-2">›</span>
          <Link href={`/shengxiao/${sx.slug}`} className="hover:text-amber-700">属{sx.name}</Link>
          <span className="mx-2">›</span>
          <span className="text-amber-900">{year}年运势</span>
        </nav>

        {/* 头部 */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <div className="flex items-center justify-between flex-wrap gap-3 mb-3">
            <h1 className="text-2xl md:text-3xl font-bold text-amber-900">
              {year}年属{sx.name}运势详解
            </h1>
            <span className={`text-sm px-3 py-1 rounded-full font-semibold ${TONE_BADGE[ln.tone]}`}>
              {TONE_WORD[ln.tone]} · {ln.relation}太岁
            </span>
          </div>
          <p className="text-gray-600 leading-relaxed">{ln.relationText}</p>
          {isFanTaiSui && (
            <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded text-sm text-red-700">
              {year}年属{sx.name}{ln.relation === '值' ? '正值本命年（值太岁）' : `${ln.relation}太岁`}，
              民俗认为犯太岁之年宜安太岁、拜太岁、多行善事，重大决策宜审慎。犯太岁不等于必遭灾祸，心存敬畏、积极应对即可。
            </div>
          )}
        </div>

        {/* 运势板块 */}
        <FortuneSection title="全年总运" body={ln.overview} />
        <FortuneSection title="事业运势" body={ln.career} />
        <FortuneSection title="财运运势" body={ln.wealth} />
        <FortuneSection title="感情婚姻" body={ln.relationship} />
        <FortuneSection title="健康运势" body={ln.health} />

        {/* 开运建议 */}
        <div className="bg-amber-50 border border-amber-200 rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-bold text-amber-800 mb-3">{year}年开运建议</h2>
          <p className="text-gray-700 leading-loose text-[15px]">{ln.advice}</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mt-4 text-sm">
            <div className="bg-white rounded p-3 text-center">
              <div className="text-xs text-gray-500">幸运颜色</div>
              <div className="font-semibold text-amber-800 mt-1">{sx.luckyColor.split('、')[0]}</div>
            </div>
            <div className="bg-white rounded p-3 text-center">
              <div className="text-xs text-gray-500">幸运数字</div>
              <div className="font-semibold text-amber-800 mt-1">{sx.luckyNumber}</div>
            </div>
            <div className="bg-white rounded p-3 text-center col-span-2 sm:col-span-1">
              <div className="text-xs text-gray-500">本命佛</div>
              <div className="font-semibold text-amber-800 mt-1 text-xs">{sx.benmingfo}</div>
            </div>
          </div>
        </div>

        {/* 常见问题（SEO） */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-bold text-amber-800 mb-4">{year}年属{sx.name}常见问题</h2>
          <div className="space-y-4 text-sm">
            <div>
              <h3 className="font-semibold text-gray-800 mb-1">{year}年属{sx.name}犯太岁吗？</h3>
              <p className="text-gray-600 leading-relaxed">
                {isFanTaiSui
                  ? `${year}${ln.ganZhi}年，属${sx.name}为${ln.relation}太岁，属于犯太岁的一种。犯太岁主变动、波动，建议年初拜太岁、全年谨慎行事，多行善积德，平稳度过。`
                  : `${year}${ln.ganZhi}年，属${sx.name}与太岁无刑冲${ln.relation === '合' ? '，且为合太岁，是得贵人相助的年份' : '害关系，整体运势平稳'}，不属于犯太岁。`}
              </p>
            </div>
            <div>
              <h3 className="font-semibold text-gray-800 mb-1">{year}年属{sx.name}财运怎么样？</h3>
              <p className="text-gray-600 leading-relaxed">{ln.wealth}</p>
            </div>
            <div>
              <h3 className="font-semibold text-gray-800 mb-1">属{sx.name}{year}年适合结婚/跳槽/创业吗？</h3>
              <p className="text-gray-600 leading-relaxed">
                {ln.tone === '吉'
                  ? `合太岁之年整体顺利、贵人相助，是适合推进婚恋、合作与事业布局的年份，可顺势而为、把握机遇。`
                  : ln.tone === '动'
                    ? `冲太岁之年变动本身多，重大决定（结婚、跳槽、创业）需充分准备、深思熟虑，主动规划的"变"优于被动的"变"。`
                    : `这一年整体${ln.tone === '凶' ? '宜守不宜攻' : '平稳'}，重大决定建议结合个人完整八字与实际情况理性判断，不宜仅因生肖运势冲动决策。`}
              </p>
            </div>
          </div>
        </div>

        {/* 年份切换 */}
        <div className="flex justify-between mb-6">
          {prevYear ? (
            <Link href={`/shengxiao/${sx.slug}/${prevYear}`} className="text-amber-700 hover:text-amber-900 text-sm">
              ← {prevYear}年属{sx.name}运势
            </Link>
          ) : <span />}
          {nextYear ? (
            <Link href={`/shengxiao/${sx.slug}/${nextYear}`} className="text-amber-700 hover:text-amber-900 text-sm">
              {nextYear}年属{sx.name}运势 →
            </Link>
          ) : <span />}
        </div>

        {/* CTA */}
        <div className="bg-gradient-to-r from-amber-500 to-amber-600 rounded-lg shadow-lg p-6 text-white text-center">
          <h2 className="text-xl font-bold mb-2">想看更准确的{year}年个人运势？</h2>
          <p className="text-amber-100 text-sm mb-4">
            生肖运势是12分之一的共性参考，结合您完整八字（四柱、大运、流年）分析的个人运势才精准。
          </p>
          <Link
            href="/"
            className="inline-block bg-white text-amber-700 px-8 py-2.5 rounded-md font-bold hover:bg-amber-50 transition-colors"
          >
            输入时辰，排我的八字 →
          </Link>
        </div>

        <p className="text-center text-xs text-gray-400 mt-6">
          本文为传统命理民俗内容，仅供参考娱乐，不构成任何决策建议。
        </p>
      </div>
    </main>
  )
}

function FortuneSection({ title, body }: { title: string; body: string }) {
  return (
    <div className="bg-white rounded-lg shadow p-6 mb-4">
      <h2 className="text-lg font-bold text-amber-800 mb-2">{title}</h2>
      <p className="text-gray-700 leading-loose text-[15px]">{body}</p>
    </div>
  )
}
