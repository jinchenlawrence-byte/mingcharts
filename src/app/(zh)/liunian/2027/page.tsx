import type { Metadata } from 'next'
import Link from 'next/link'
import Nav from '@/components/Nav'
import TaisuiTable, { TaisuiLegend } from '@/components/TaisuiTable'
import { hantAlternates } from '@/lib/hant-seo'
import { SHENGXIAO, getLiunian, getYearGanZhi } from '@/lib/shengxiaoData'

// 2027 丁未年落地页（第 35 轮）
//
// 为什么单独一页：12 个生肖的 2027 页是分散的，搜索「2027 运势」「2027 犯太岁」的人
// 需要一个能一眼看完「谁犯太岁、各是什么关系、该看哪一页」的汇总入口。
// 事实全部来自 getLiunian（唯一事实源），本页不另写一套生肖关系表。
//
// ★ 日期边界必须两个都说：民俗以春节 2027-02-06 为界，命理年柱以立春 2027-02-04 为界。

const YEAR = 2027

export const metadata: Metadata = {
  // 2026-11-18 GSC：「2027年运势」「2027年犯太岁生肖」的承接页，标题把年份与问句提到最前
  title: `2027年运势：${getYearGanZhi(YEAR)}年谁犯太岁，羊牛鼠狗四种关系`,
  description:
    '2027年为丁未年，太岁在未：属羊值太岁（本命年）、属牛冲兼刑、属狗刑、属鼠害，属马、猪、兔合太岁。一页看完 12 个生肖与太岁的关系，并说明春节 2/6 与立春 2/4 两个时间边界。',
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

const ARTICLES: Array<{ slug: string; title: string; desc: string }> = [
  {
    slug: '2027-fan-taisui-shengxiao',
    title: '2027 犯太岁生肖一次看：羊值、牛冲、鼠害、狗刑',
    desc: '四种关系的差别，以及各自的民俗应对。'
  },
  {
    slug: '2027-shuyang-benmingnian',
    title: '2027 属羊本命年要注意什么：值太岁的取舍清单',
    desc: '本命年不等于不顺，先分清哪些事该缓、哪些照常。'
  },
  {
    slug: '2027-shuniu-chongtaisui',
    title: '2027 属牛冲太岁怎么过：丑未冲的变动与应对',
    desc: '冲太岁的变动集中在哪些方面，怎么把被动变主动。'
  },
  {
    slug: '2027-shushu-haitaisui',
    title: '2027 属鼠害太岁怎么防：子未害的三条红线',
    desc: '害太岁的隐性消耗从哪来，三条具体做法。'
  },
  {
    slug: '2027-shugou-xingtaisui',
    title: '2027 属狗刑太岁：人际、合同与情绪的应对',
    desc: '刑太岁的反复与摩擦，先处理哪一环。'
  },
  {
    slug: '2027-an-taisui-zenme-zuo',
    title: '2027 安太岁怎么做：时间、流程、供品与常见误解',
    desc: '谁需要安、什么时候做、登记流程与供品，一次说清。'
  },
  {
    slug: 'an-taisui-yao-zhunbei-shenme',
    title: '安太岁要准备什么：一份可照着做的清单',
    desc: '资料三样、费用怎么看、太岁符事后怎么处理。'
  }
]

export default function Liunian2027Page() {
  const rows = SHENGXIAO.map((sx) => ({ sx, ln: getLiunian(sx, YEAR) }))
  const fan = rows.filter((r) => ['值', '冲', '害', '刑'].includes(r.ln.relation))
  const he = rows.filter((r) => r.ln.relation === '合')
  const ping = rows.filter((r) => r.ln.relation === '平')

  return (
    <div className="hw-page">
      <Nav />
      <main className="hw-wrap hw-c-pg">
        <Link href="/liunian" className="hw-c-back">‹ 年运报告</Link>

        <section className="hw-c-box mb-6 mt-2">
          <h1 className="hw-c-h1">2027年运势总览：{getYearGanZhi(YEAR)}年谁犯太岁</h1>
          <p className="hw-c-lede">
            这一年落在你身上是什么，看两件事：生肖与太岁的关系，决定「是否犯太岁」；
            完整八字里日主与流年干支的关系，决定「具体怎么应」。前者一页就能看完，后者需要排盘。
          </p>
          <p className="text-sm text-ink-light bg-paper-dark/30 border border-gold/15 rounded px-3 py-2 mt-3">
            ★ 时间边界有两个，别混用：民俗的过年是<b>春节 2 月 6 日</b>（安太岁、生肖轮替按此）；
            命理的年柱切换是<b>立春 2 月 4 日</b>（排八字按此）。两者相差两天，
            生日落在 2 月初的人尤其要先确认用哪个口径。
          </p>
          <div className="mt-4">
            <TaisuiTable focusYear={YEAR} />
            <TaisuiLegend />
          </div>
          <p className="text-xs text-ink-light mt-3">
            下表所列为 {YEAR} 年那一列，每一格都能点进该生肖当年的详细运势。
            <Link href="/liunian/taisui-biao" className="hw-c-link ml-1">看多年对照表 →</Link>
          </p>
        </section>

        <section className="hw-c-box mb-6">
          <h2 className="hw-c-secTitle">四类犯太岁：{fan.map((r) => '属' + r.sx.name).join('、')}</h2>
          <div className="space-y-4">
            {FAN_TAISUI.map((f) => {
              const hit = fan.filter((r) => r.ln.relation === f.relation)
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
          <h2 className="hw-c-secTitle">合太岁与无犯的 8 个属相</h2>
          <p className="text-sm text-ink-light mb-3">
            合太岁（{he.map((r) => '属' + r.sx.name).join('、')}）：与太岁六合或三合，民俗视为有人相助，
            适合主动谈合作、扩展人脉；机会多，也要有人去接。
          </p>
          <p className="text-sm text-ink-light mb-3">
            无犯（{ping.map((r) => '属' + r.sx.name).join('、')}）：与太岁没有明显刑冲害合，属平稳之年。
            平稳的正确用法是蓄力，把长期项目往前推。
          </p>
          <ul className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-sm">
            {[...he, ...ping].map((r) => (
              <li key={r.sx.slug}>
                <Link href={`/shengxiao/${r.sx.slug}/${YEAR}`} className="hw-c-link">
                  属{r.sx.name} 2027 运势 →
                </Link>
              </li>
            ))}
          </ul>
        </section>

        <section className="hw-c-box mb-6">
          <h2 className="hw-c-secTitle">犯太岁与安太岁：逐篇细读</h2>
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
          <h2 className="hw-c-secTitle">12 个属相的 2027 流年页</h2>
          <ul className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-sm">
            {rows.map((r) => (
              <li key={r.sx.slug}>
                <Link href={`/shengxiao/${r.sx.slug}/${YEAR}`} className="hw-c-link">
                  属{r.sx.name} 2027 →
                </Link>
              </li>
            ))}
          </ul>
          <p className="text-sm text-ink-light mt-4">
            需要看自己这一年的完整情况：<Link href="/liunian" className="hw-c-link">生成年运报告 →</Link>
          </p>
        </section>

        <p className="hw-alert hw-alert--note text-center">
          以上为传统命理民俗内容，仅供参考娱乐，不构成任何决策建议。生肖与太岁关系由规则引擎确定性计算，不含 AI 推断。
        </p>
        <p className="text-center text-xs text-ink-light mt-2">
          <Link href={`/tw/liunian/${YEAR}`} className="hw-c-link">繁體版：2027 丁未年運勢總覽 →</Link>
          <span className="text-ink-light mx-2">·</span>
          <Link href="/liunian/2028" className="hw-c-link">看 2028 戊申年运势总览 →</Link>
        </p>
      </main>
    </div>
  )
}
