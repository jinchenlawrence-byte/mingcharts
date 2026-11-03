import type { Metadata } from 'next'
import Link from 'next/link'
import Nav from '@/components/Nav'
import TaisuiTable, { TaisuiLegend } from '@/components/TaisuiTable'
import { hantAlternates } from '@/lib/hant-seo'
import { SHENGXIAO, getLiunian, getYearGanZhi } from '@/lib/shengxiaoData'

// 2028 戊申年落地页（第 36 轮）：与 /liunian/2027 同构。
//
// 为什么现在做 2028：GSC 实测点击全部落在 2028 的生肖页，但那些页面没有 hub 收口。
// 12 个生肖的 2028 页是分散的，搜索「2028 运势」「2028 犯太岁」的人需要一个汇总入口。
// 事实全部来自 getLiunian（唯一事实源），本页不另写一套生肖关系表，标题里的生肖也由数据生成。
//
// ★ 日期边界必须两个都说：民俗以春节 2028-01-26 为界，命理年柱以立春 2028-02-04 15:31 为界。
//   立春是时刻不是整日：当天 15:31 之前出生仍按丁未年算。

const YEAR = 2028
const GANZHI = getYearGanZhi(YEAR)
const REL_ORDER = ['值', '冲', '害', '刑'] as const

const ROWS = SHENGXIAO.map((sx) => ({ sx, ln: getLiunian(sx, YEAR) }))
const FAN = ROWS.filter((r) => (REL_ORDER as readonly string[]).includes(r.ln.relation))
const HE = ROWS.filter((r) => r.ln.relation === '合')
const PING = ROWS.filter((r) => r.ln.relation === '平')
const FAN_BY_REL = REL_ORDER
  .map((rel) => ({ rel, hit: FAN.filter((r) => r.ln.relation === rel) }))
  .filter((x) => x.hit.length > 0)
const FAN_TITLE = FAN_BY_REL.map((x) => `${x.hit.map((r) => r.sx.name).join('、')}${x.rel}`).join('、')
const FAN_DESC = FAN_BY_REL.map((x) => `${x.hit.map((r) => r.sx.name).join('、')}${x.rel}太岁`).join('、')
const HE_NAMES = HE.map((r) => r.sx.name).join('、')

export const metadata: Metadata = {
  title: `${YEAR} ${GANZHI}年运势总览：${FAN_TITLE}怎么看`,
  description:
    `${YEAR} ${GANZHI}年运势总览：一页看完 12 个生肖与太岁的关系（${FAN_DESC}，${HE_NAMES}合太岁），` +
    '并说明春节 1/26 与立春 2/4 两个时间边界的差别。',
  alternates: {
    canonical: `/liunian/${YEAR}`,
    languages: hantAlternates(`/liunian/${YEAR}`),
  },
}

const FAN_TAISUI: Array<{ relation: '值' | '冲' | '害' | '刑'; note: string }> = [
  { relation: '值', note: '与太岁同支，也就是本命年。传统讲「守」：宜静不宜动，重大决定缓一缓。' },
  { relation: '冲', note: '与太岁正对，变动感最强。换岗、迁居、远行容易发生，主动规划胜过被动接受。' },
  { relation: '害', note: '与太岁相害，多暗损与口舌。合作条件易变，口头承诺要补成文字。' },
  { relation: '刑', note: '与太岁相刑，多摩擦与纠缠。同一件事反复拉扯，先降温再谈事。' }
]

// 安太岁是每年通用的民俗知识（第 35 轮成稿），其中两篇标题带 2027 属正常，本页不另写 2028 版。
const ARTICLES: Array<{ slug: string; title: string; desc: string }> = [
  {
    slug: '2027-an-taisui-zenme-zuo',
    title: '2027 安太岁怎么做：时间、流程、供品与常见误解',
    desc: '谁需要安、什么时候做、登记流程与供品，一次说清。'
  },
  {
    slug: '2027-fan-taisui-shengxiao',
    title: '2027 犯太岁生肖一次看：羊值、牛冲、鼠害、狗刑',
    desc: '四种关系的差别，以及各自的民俗应对。'
  },
  {
    slug: 'an-taisui-yao-zhunbei-shenme',
    title: '安太岁要准备什么：一份可照着做的清单',
    desc: '资料三样、费用怎么看、太岁符事后怎么处理。'
  }
]

export default function Liunian2028Page() {
  return (
    <div className="hw-page">
      <Nav />
      <main className="hw-wrap hw-c-pg">
        <Link href="/liunian" className="hw-c-back">‹ 年运报告</Link>

        <section className="hw-c-box mb-6 mt-2">
          <h1 className="hw-c-h1">{YEAR} {GANZHI}年运势总览</h1>
          <p className="hw-c-lede">
            这一年落在你身上是什么，看两件事：生肖与太岁的关系，决定「是否犯太岁」；
            完整八字里日主与流年干支的关系，决定「具体怎么应」。前者一页就能看完，后者需要排盘。
          </p>
          <p className="text-sm text-ink-light/70 bg-paper-dark/30 border border-gold/15 rounded px-3 py-2 mt-3">
            ★ 时间边界有两个，别混用：民俗的过年是<b>春节 1 月 26 日（2028-01-26）</b>
            （安太岁、生肖轮替按此）；命理的年柱切换是<b>立春 2 月 4 日 15:31（2028-02-04）</b>
            （排八字按此）。两者相差九天，比往年更明显。
            立春是<b>时刻</b>不是整日——当天 15:31 之前出生仍按丁未年算，之后才是戊申年。
            生日落在 2 月初的人尤其要先确认用哪个口径。
          </p>
          <div className="mt-4">
            <TaisuiTable focusYear={YEAR} />
            <TaisuiLegend />
          </div>
          <p className="text-xs text-ink-light/60 mt-3">
            下表所列为 {YEAR} 年那一列，每一格都能点进该生肖当年的详细运势。
            <Link href="/liunian/taisui-biao" className="hw-c-link ml-1">看多年对照表 →</Link>
          </p>
        </section>

        <section className="hw-c-box mb-6">
          <h2 className="hw-c-secTitle">
            四类犯太岁：{FAN_BY_REL.map((x) => x.hit.map((r) => '属' + r.sx.name).join('、')).join('、')}
          </h2>
          <div className="space-y-4">
            {FAN_TAISUI.map((f) => {
              const hit = FAN.filter((r) => r.ln.relation === f.relation)
              if (hit.length === 0) return null
              return (
                <div key={f.relation} className="border-b border-gold/10 pb-3">
                  <p className="font-semibold text-ink mb-1">
                    {f.relation === '值' ? '值太岁' : f.relation === '冲' ? '冲太岁' : f.relation === '害' ? '害太岁' : '刑太岁'}：
                    {hit.map((r, i) => (
                      <span key={r.sx.slug}>
                        {i > 0 && '、'}
                        <Link href={`/shengxiao/${r.sx.slug}/${YEAR}`} className="hw-c-link">属{r.sx.name}</Link>
                      </span>
                    ))}
                  </p>
                  <p className="text-sm text-ink-light">{f.note}</p>
                </div>
              )
            })}
          </div>
        </section>

        <section className="hw-c-box mb-6">
          <h2 className="hw-c-secTitle">合太岁与无犯的 {HE.length + PING.length} 个属相</h2>
          <p className="text-sm text-ink-light mb-3">
            合太岁（{HE.map((r) => '属' + r.sx.name).join('、')}）：与太岁六合或三合，民俗视为有人相助，
            适合主动谈合作、扩展人脉；机会多，也要有人去接。
          </p>
          <p className="text-sm text-ink-light mb-3">
            无犯（{PING.map((r) => '属' + r.sx.name).join('、')}）：与太岁没有明显刑冲害合，属平稳之年。
            平稳的正确用法是蓄力，把长期项目往前推。
          </p>
          <ul className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-sm">
            {[...HE, ...PING].map((r) => (
              <li key={r.sx.slug}>
                <Link href={`/shengxiao/${r.sx.slug}/${YEAR}`} className="hw-c-link">
                  属{r.sx.name} {YEAR} 运势 →
                </Link>
              </li>
            ))}
          </ul>
        </section>

        <section className="hw-c-box mb-6">
          <h2 className="hw-c-secTitle">安太岁怎么做：三篇细读</h2>
          <ul className="space-y-3 text-sm">
            {ARTICLES.map((a) => (
              <li key={a.slug}>
                <Link href={`/article/${a.slug}`} className="hw-c-link font-medium">• {a.title}</Link>
                <span className="block text-ink-light">{a.desc}</span>
              </li>
            ))}
          </ul>
        </section>

        <section className="hw-c-box mb-6">
          <h2 className="hw-c-secTitle">12 个属相的 {YEAR} 流年页</h2>
          <ul className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-sm">
            {ROWS.map((r) => (
              <li key={r.sx.slug}>
                <Link href={`/shengxiao/${r.sx.slug}/${YEAR}`} className="hw-c-link">
                  属{r.sx.name} {YEAR} →
                </Link>
              </li>
            ))}
          </ul>
          <p className="text-sm text-ink-light mt-4">
            需要看自己这一年的完整情况：<Link href="/liunian" className="hw-c-link">生成年运报告 →</Link>
          </p>
        </section>

        <p className="text-center text-xs text-ink-light/40">
          以上为传统命理民俗内容，仅供参考娱乐，不构成任何决策建议。生肖与太岁关系由规则引擎确定性计算，不含 AI 推断。
        </p>
        <p className="text-center text-xs text-ink-light/50 mt-2">
          <Link href="/liunian/2027" className="hw-c-link">看 2027 丁未年运势总览 →</Link>
          <span className="text-ink-light/40 mx-2">·</span>
          <Link href={`/tw/liunian/${YEAR}`} className="hw-c-link">繁體版：2028 戊申年運勢總覽 →</Link>
        </p>
      </main>
    </div>
  )
}
