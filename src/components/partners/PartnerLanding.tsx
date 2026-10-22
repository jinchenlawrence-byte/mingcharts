// 伙伴落地页（命理师白标 v1）
//
// 文案策略：正文用简体写、繁体由 lib/hant 的 toHant 转换（一套事实源，避免两份文案漂移）。
// ★ 已知局限：转换器能保证术语与字形正确，但语感仍是「简体的语感」。
//   若台港伙伴反馈读着别扭，把 COPY 里的文案人工重写成繁体即可 —— 代码不用动。
import Link from 'next/link'
import { localize } from '@/lib/hant'
import type { OutputLocale } from '@/lib/locale'
import PartnerApplyForm from './PartnerApplyForm'

/** 批发价目表：与 docs/推广-命理师白标方案.md §4-2 同源（改价先改文档再改这里） */
const PRICE_ROWS = [
  { name: '命书报告 / 合婚详批', retail: 29.99, t10: 15, t50: 12, t200: 9 },
  { name: '紫微深度', retail: 24.99, t10: 13, t50: 10, t200: 7.5 },
  { name: '年运报告 / 方位城市', retail: 19.99, t10: 10, t50: 8, t200: 6 },
  { name: '三合一套餐', retail: 59.99, t10: 30, t50: 24, t200: 18 },
]

const usd = (n: number) => `$${n % 1 === 0 ? n.toFixed(0) : n.toFixed(2)}`

export default function PartnerLanding({ locale }: { locale: OutputLocale }) {
  const L = (s: string) => localize(s, locale)
  const hant = locale === 'zh-Hant'

  return (
    <>
      <section className="hw-c-box mb-6">
        <h1 className="hw-c-h1">{L('你批一份命要三小时，我们十分钟出万字命书')}</h1>
        <p className="hw-c-lede">
          {L('你排盘、你定价、你收款、你的客户；报告由我们出，页眉挂你的品牌。')}
        </p>
        <div className="flex flex-wrap gap-3 mt-4">
          <a href="#apply" className="hw-c-btnBig">{L('申请合作 →')}</a>
          <span className="self-center text-xs text-ink-light/60">
            {L('通过审核送 2 份免费额度，先看报告再决定')}
          </span>
        </div>
      </section>

      <section className="hw-c-box mb-6">
        <h2 className="hw-c-secTitle">{L('你现在大概是这样')}</h2>
        <ul className="text-sm text-ink-light space-y-2">
          <li>• {L('批一份完整命要 3 小时，一天最多 3 份，接单量被自己的时间锁死')}</li>
          <li>• {L('客户付了钱要等三天才拿到报告，中间还得回几次「快好了」')}</li>
          <li>• {L('讲得出，但写不出一份体面的长文，交付物撑不起你的报价')}</li>
          <li>• {L('想涨价，怕客户觉得不值')}</li>
        </ul>
      </section>

      <section className="hw-c-box mb-6">
        <h2 className="hw-c-secTitle">{L('你能拿到什么')}</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
          {[
            ['万字命书', '格局、调候、用神、大运流年、事业、财运、婚姻、子女、健康十卷，逐条注明典籍出处（《子平真诠》《滴天髓》《穷通宝鉴》等）'],
            ['四个品类', '紫微斗数、合婚详批、年运报告、方位城市 —— 客户换一种问法，你不用换一套手艺'],
            ['你的品牌', '报告页眉可挂你的名字与联系方式；客户打开链接就能读，也能直接打印成 PDF'],
            ['你自己定价', '卖多少、怎么打包、怎么谈，全归你。我们只设一个价格地板，防止市场被砸穿'],
          ].map(([title, body]) => (
            <div key={title} className="border border-gold/15 rounded p-3">
              <div className="font-semibold text-ink mb-1">{L(title)}</div>
              <p className="text-xs text-ink-light leading-relaxed">{L(body)}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="hw-c-box mb-6">
        <h2 className="hw-c-secTitle">{L('批发价（USD，按份）')}</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="text-left text-ink-light/70 border-b border-gold/20">
                <th className="py-2 pr-3">{L('品类')}</th>
                <th className="py-2 pr-3">{L('你直售价参考')}</th>
                <th className="py-2 pr-3">{L('10 份档')}</th>
                <th className="py-2 pr-3">{L('50 份档')}</th>
                <th className="py-2">{L('200 份档')}</th>
              </tr>
            </thead>
            <tbody>
              {PRICE_ROWS.map((r) => (
                <tr key={r.name} className="border-b border-gold/10">
                  <td className="py-2 pr-3 text-ink">{L(r.name)}</td>
                  <td className="py-2 pr-3 text-ink-light/70">{usd(r.retail)}</td>
                  <td className="py-2 pr-3">{usd(r.t10)}</td>
                  <td className="py-2 pr-3">{usd(r.t50)}</td>
                  <td className="py-2 font-semibold text-ink">{usd(r.t200)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="text-xs text-ink-light/60 mt-3">
          {L('按 200 份档算：命书 $9 进货，你卖 $25 毛利 64%，卖到 $45 毛利 80%。额度 24 个月有效，用不完不浪费。')}
        </p>
      </section>

      <section className="hw-c-box mb-6">
        <h2 className="hw-c-secTitle">{L('怎么开始（三步）')}</h2>
        <ol className="text-sm text-ink-light space-y-2">
          <li>① {L('填下面的表，我们 48 小时内联系你（LINE / WeChat / Email 都行）')}</li>
          <li>② {L('审核通过送你 2 份，拿你自己的盘或熟客的盘试，报告不满意就别合作')}</li>
          <li>③ {L('满意了买额度，我们给你开通入口，之后每一份你自己出')}</li>
        </ol>
      </section>

      <section className="hw-c-box mb-6">
        <h2 className="hw-c-secTitle">{L('你可能担心的几件事')}</h2>
        <div className="space-y-3 text-sm">
          {[
            ['你会不会抢我的客户？', '不会。我们不接触你的客户、不做你的客户名单、也不在报告里放引导注册的广告 —— 页脚只有一行「由明理 mingcharts.com 引擎生成」，这是唯一的要求。'],
            ['报告内容我能改吗？', '品牌位可以改，正文不行。正文里有合规过滤（不用「必」「一定」这类承诺措辞），这也是你敢把报告直接发给客户的原因。'],
            ['客户退款怎么办？', '钱在你那，退款由你处理。我们只负责「报告没生成 / 打不开 / 乱码」这类技术问题，出问题补发。'],
            ['我先买 10 份试试行不行？', '行。10 份档就是给试水的，$15/份；跑顺了再上 50 档。'],
            ['大陆的客户能做吗？', '目前不行。我们只收国际卡，大陆客户付款走不通；台港马新与海外华人没问题。'],
          ].map(([q, a]) => (
            <div key={q}>
              <p className="font-semibold text-ink">{L(q)}</p>
              <p className="text-xs text-ink-light leading-relaxed">{L(a)}</p>
            </div>
          ))}
        </div>
      </section>

      <section id="apply" className="mb-6">
        <PartnerApplyForm hant={hant} />
      </section>

      <p className="text-center text-xs text-ink-light/40">
        {L('报告内容为传统命理民俗文化分析，仅供参考娱乐。')}
        {' '}
        <Link href={hant ? '/tw' : '/'} className="hw-c-link">{L('返回首页')}</Link>
      </p>
    </>
  )
}
