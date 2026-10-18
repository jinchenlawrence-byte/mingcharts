import Link from 'next/link'
import Nav from '@/components/Nav'
import CheckoutButton from '@/components/CheckoutButton'
import {
  SKUS,
  REPORT_GRANTS,
  SUBSCRIPTION_GRANTS,
  formatPriceUSD,
  ONE_TIME_SKUS,
  type GrantId,
  type SkuId,
} from '@/lib/pricing'
import { waffoProductId } from '@/lib/waffo-products'
import { GRANT_LABELS } from '@/lib/grantLabels'

export const metadata = {
  title: `价格方案：免费排盘 · 命书报告 ${formatPriceUSD(SKUS.fatebook.priceUSD)} · 会员订阅`,
  description: `八字命理服务价格：免费四柱排盘；${formatPriceUSD(SKUS.fatebook.priceUSD)} 解锁万字命书深度详批（八字总览、性格天赋、用神喜忌、格局成败、调候、大运流年、事业财运、婚姻感情、子女六亲、健康提示）；会员订阅提供日运、流月等持续型内容（即将推出），不含命书等报告。`,
}

// ★ 纯展示层：grant → 中文标签已抽到 @/lib/grantLabels（单一事实源，会员中心页共用）。
//   「会员含哪些权益」的事实只认 SUBSCRIPTION_GRANTS（pricing.ts），本文件不得出现本地硬编码权益字面量。

// 订阅类权益的中文名串（FAQ 用），逐项派生自 SUBSCRIPTION_GRANTS
const SUBSCRIPTION_LABELS = SUBSCRIPTION_GRANTS.map((g) => GRANT_LABELS[g]).join('、')
// 报告类 SKU 名称串（FAQ 用）：报告 grant 与报告 SkuId 同 id（pricing.ts 已保证）
const REPORT_SKU_NAMES = REPORT_GRANTS
  .map((g) => SKUS[g as keyof typeof SKUS].name)
  .join('、')

// 单项报告 → 模块页直达入口（bundle3 为套餐组合无独立模块页，不设链接）
const SKU_HREF: Partial<Record<SkuId, string>> = {
  annual_report: '/liunian',
  hemun: '/hemun',
  ziwei_deep: '/ziwei',
  geo: '/geo',
}

const SECTIONS = [
  '八字总览',
  '性格天赋',
  '用神喜忌',
  '格局成败',
  '调候用神',
  '大运流年',
  '事业财运',
  '婚姻感情',
  '子女六亲',
  '健康提示',
]

interface PriceCard {
  name: string
  price: string
  unit: string
  desc: string
  highlight: boolean
  membership: boolean
  features: string[]
  cta: { text: string; href: string }
  // 设了 buySku 的卡片渲染 Waffo 购买按钮（productId 是否已登记决定可用/即将推出）
  buySku?: SkuId
}

// ★ 展示卡片，非价目定义：价格全部派生自 pricing.ts 的 SKUS（单一事实源）
const CARDS: PriceCard[] = [
  {
    name: '免费排盘',
    price: '$0',
    unit: '永久免费',
    desc: '先看命盘，再决定要不要深入解读',
    highlight: false,
    membership: false,
    features: [
      '四柱八字排盘（干支 / 十神 / 藏干）',
      '胎元 · 命宫 · 身宫',
      '旺衰判定 · 格局定格',
      '九步大运（起运时间）',
      '生肖 / 节气 / 命理知识全站内容',
    ],
    cta: { text: '免费排盘', href: '/' },
  },
  {
    name: SKUS.fatebook.name,
    price: formatPriceUSD(SKUS.fatebook.priceUSD),
    unit: '/ 次',
    desc: SKUS.fatebook.desc,
    highlight: true,
    membership: false,
    features: [
      '包含免费排盘全部内容',
      'AI 命理师深度解读（DeepSeek 驱动）',
      '十大板块万字详批，引用六书原文',
      '格局成败 · 调候用神逐项拆解',
      '近三年流年具体趋势',
      '事业财运 / 婚姻感情 / 子女六亲 / 健康提示',
      '永久保存到「我的命盘」，可反复查看',
    ],
    // 命书购买走 Waffo 卡支付；productId 未登记时按钮显示「即将推出」（见 waffo-products.ts）
    buySku: 'fatebook',
    cta: { text: '购买命书详批', href: '/mingshu' },
  },
  {
    name: '会员订阅',
    price: formatPriceUSD(SKUS.member_monthly.priceUSD),
    unit: '/ 月起',
    // ★ desc 直接取价目单一事实源（订阅＝持续型内容，不含报告，定价方案 §4.2）
    desc: SKUS.member_monthly.desc,
    highlight: false,
    membership: true,
    // ★ 权益逐项派生自 SUBSCRIPTION_GRANTS：grants 表改了这里自动跟着变，不另写字面量
    features: [
      ...SUBSCRIPTION_GRANTS.map((g) => `${GRANT_LABELS[g]}（即将推出）`),
      `年度会员 ${formatPriceUSD(SKUS.member_yearly.priceUSD)}/年（主推，更划算）`,
      '命书 / 年运等深度报告需按次单独购买',
    ],
    cta: { text: '了解会员', href: '/pricing' },
  },
]

const FAQS = [
  {
    q: '命书报告和免费排盘有什么区别？',
    a: '免费排盘给出的是四柱、十神、大运、旺衰、格局这些「骨架」；命书报告则在此基础上，由 AI 命理师结合《子平真诠》《滴天髓》《穷通宝鉴》等六部经典，把格局成败、调候用神、大运流年、事业婚姻等内容展开成万字深度解读，说清楚「结论是怎么来的」。',
  },
  {
    q: '命书报告多久能生成？',
    a: '通常在 30 秒左右。生成期间请勿关闭页面；若 AI 服务暂时不可用，系统会自动回退到规则引擎，仍会给出完整的十大板块解读。',
  },
  {
    q: '会员包含命书等报告吗？',
    a: `不包含。会员是持续型内容订阅，权益为${SUBSCRIPTION_LABELS}（功能陆续上线，现阶段标「即将推出」）；${REPORT_SKU_NAMES}等深度报告均需按次单独购买（命书 ${formatPriceUSD(SKUS.fatebook.priceUSD)}/次）。续费时会员有效期会从原到期日向后叠加。`,
  },
  {
    q: '购买后可以反复查看吗？',
    a: '可以。命书会保存到你的账号（「我的命盘」），随时登录查看，不会因为刷新或换设备丢失。',
  },
  {
    q: '命理分析能保证准确吗？',
    a: '不能。命理解读无法保证某件事一定发生，也不替代医疗、法律、财务或心理健康方面的专业建议。它提供的是一套有结构的自我观察视角，用于理解和规划，请理性看待。',
  },
  {
    q: '如何支付？',
    a: '支持国际信用卡（Visa / Mastercard 等），由 Waffo 托管收银台安全处理；支付完成后报告自动解锁，可在「我的报告」中随时回看。',
  },
]

// ★ 权益对比表行：免费列描述免费层；命书列与会员列一律由 grants 派生——
//   命书列＝SKUS.fatebook.grants 是否覆盖；会员列＝SUBSCRIPTION_GRANTS 是否覆盖。
//   不再保留任何本地布尔字面量（旧表的 ['不限次数', false, false, true] 即由此跑偏）。
interface CompareRow {
  label: string
  free: boolean
  /** 本行对应的能力；缺省表示免费层自带，两付费列都打勾 */
  grant?: GrantId
  /** 订阅类能力尚未上线，标签缀「即将推出」 */
  coming?: boolean
  /** 行尾补充说明（如单项报告的「单项购买 $19.99」） */
  note?: string
}

const COMPARE_ROWS: CompareRow[] = [
  { label: '四柱八字排盘', free: true },
  { label: '旺衰 · 格局判定', free: true },
  { label: '万字命书详批（十大板块）', free: false, grant: 'fatebook' },
  { label: 'AI 命理师深度解读', free: false, grant: 'fatebook' },
  { label: '近三年流年趋势', free: false, grant: 'fatebook' },
  { label: '报告永久保存，可反复查看', free: false, grant: 'fatebook' },
  // 年运报告为独立单项 SKU：不属于免费/命书/会员任何一方，标注「单项购买」防止误读为缺漏
  {
    label: GRANT_LABELS.annual_report, free: false, grant: 'annual_report',
    // ★ 补披露（HANDOFF-年运披露与报告缓存 §二）：明确一次购买覆盖三年
    note: `单项购买 ${formatPriceUSD(SKUS.annual_report.priceUSD)} · 覆盖今年/明年/后年三年`,
  },
  ...SUBSCRIPTION_GRANTS.map((g) => ({
    label: GRANT_LABELS[g], free: false, grant: g, coming: true,
  })),
]

function compareCells(row: CompareRow): [boolean, boolean, boolean] {
  // 免费层行（无 grant）两付费列天然包含；其余逐 grants 表现查
  const inFatebook = row.grant ? SKUS.fatebook.grants.includes(row.grant) : true
  const inMember = row.grant ? SUBSCRIPTION_GRANTS.includes(row.grant) : true
  return [row.free, inFatebook, inMember]
}

export default function PricingPage() {
  return (
    <main className="hw-page">
      <Nav />

      <div className="hw-wrap hw-c-pg">
        {/* 返回 */}
        <Link href="/" className="hw-c-back">‹ 首页</Link>

        {/* 标题 */}
        <header className="mb-12">
          <h1 className="hw-c-h1">先排盘，再深入</h1>
          <p className="hw-lede">
            免费排盘看清命盘骨架，命书报告展开万字详批。基于六部经典命理著作，结合 AI 与规则引擎双重解读。
          </p>
        </header>

        {/* 价格卡片 */}
        <div className="grid md:grid-cols-3 gap-4 mb-14">
          {CARDS.map((card) => (
            <div key={card.name} className={`hw-c-plan${card.highlight ? ' hw-c-planHot' : ''}`}>
              {card.highlight && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-[#3a66ff] text-white text-xs font-semibold px-3 py-1 rounded-full">
                  最受欢迎
                </span>
              )}

              <h2 className="text-lg font-bold">{card.name}</h2>
              <div className="flex items-baseline gap-1">
                <span className="hw-c-pr">{card.price}</span>
                <span className="text-ink-light/60 text-sm">{card.unit}</span>
              </div>
              <p className="text-sm text-ink-light">{card.desc}</p>

              <ul className="space-y-2 text-sm text-ink/70 flex-1 my-2">
                {card.features.map((f) => (
                  <li key={f} className="flex gap-2">
                    <span className="text-[#3a66ff] shrink-0">✓</span>
                    <span>{f}</span>
                  </li>
                ))}
              </ul>

              {card.membership ? (
                // ★ 订阅权益（日运等）尚未上线，暂不开放购买（会员权益修复 §二）——本轮不动
                <div className="block text-center py-2.5 rounded-full font-semibold bg-paper-dark/40 text-ink-light/40 cursor-not-allowed">
                  即将推出
                </div>
              ) : card.buySku ? (
                <div>
                  <CheckoutButton
                    sku={card.buySku}
                    available={waffoProductId(card.buySku) !== null}
                    highlight={card.highlight}
                  >
                    {card.cta.text}
                  </CheckoutButton>
                  <Link
                    href={card.cta.href}
                    className="hw-c-blue block text-center text-sm hover:brightness-110 mt-2"
                  >
                    查看命书详情
                  </Link>
                </div>
              ) : (
                <Link
                  href={card.cta.href}
                  className="block text-center py-2.5 rounded-full font-semibold transition bg-ink text-white hover:brightness-110"
                >
                  {card.cta.text}
                </Link>
              )}
            </div>
          ))}
        </div>

        {/* ★ 单项报告价目：5 个非命书的单项 SKU（命书已有卡片，此处排除）*/}
        <section className="mb-14">
          <h2 className="hw-c-h2 hw-c-h2C">单项报告</h2>
          <p className="text-sm text-ink-light text-center mb-6">
            除命书外的深度报告，均可单独购买；也可选三合一套餐更划算。
          </p>
          <div className="grid sm:grid-cols-2 gap-4 max-w-3xl mx-auto">
            {ONE_TIME_SKUS.filter((s) => s.id !== 'fatebook').map((s) => (
              <div key={s.id} className="hw-c-box flex flex-col gap-4">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h3 className="font-bold text-ink">{s.name}</h3>
                    <p className="text-sm text-ink-light mt-1">{s.desc}</p>
                    {SKU_HREF[s.id] && (
                      <Link
                        href={SKU_HREF[s.id]!}
                        className="hw-c-blue inline-block text-sm hover:brightness-110 mt-2"
                      >
                        去体验 →
                      </Link>
                    )}
                  </div>
                  <div className="text-right shrink-0">
                    <div className="text-2xl font-bold text-ink">{formatPriceUSD(s.priceUSD)}</div>
                    <div className="text-xs text-ink-light/60 mt-1">/ 次</div>
                  </div>
                </div>
                {/* ★ 2026-10-15：五个单次商品 productId 已登记（waffo-products.ts），
                    购买入口与命书卡同模式（未登记时 CheckoutButton 自动显示「即将推出」）。
                    bundle3 无模块页，这里的按钮是它唯一的购买入口。 */}
                <CheckoutButton sku={s.id} available={waffoProductId(s.id) !== null}>
                  立即购买
                </CheckoutButton>
              </div>
            ))}
          </div>
          <p className="text-xs text-ink-light/60 text-center mt-4">
            购买后报告永久保存，可随时反复查看（会员订阅不含单项报告）。
          </p>
        </section>

        {/* 命书报告包含的十大板块 */}
        <section className="mb-14">
          <h2 className="hw-c-h2 hw-c-h2C">命书报告包含什么</h2>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            {SECTIONS.map((s, i) => (
              <div key={s} className="rounded-2xl border border-[#dedcf0] bg-white p-4 text-center">
                <div className="text-[#3a66ff] font-bold text-sm mb-1">{String(i + 1).padStart(2, '0')}</div>
                <div className="font-semibold text-ink text-sm">{s}</div>
              </div>
            ))}
          </div>
        </section>

        {/* 对比表 */}
        <section className="mb-14">
          <h2 className="hw-c-h2 hw-c-h2C">权益对比</h2>
          <div className="hw-c-box hw-c-boxFlush hw-c-tableWrap">
            <table className="hw-c-table">
              <thead>
                <tr>
                  <th className="text-left">权益</th>
                  <th>免费</th>
                  <th>命书报告</th>
                  <th>会员</th>
                </tr>
              </thead>
              <tbody>
                {COMPARE_ROWS.map((row) => {
                  const cells = compareCells(row)
                  return (
                    <tr key={row.label}>
                      <td>
                        {row.label}
                        {row.coming && (
                          <span className="ml-2 text-xs text-[#3a66ff]">即将推出</span>
                        )}
                        {row.note && (
                          <span className="ml-2 text-xs text-ink-light/40 whitespace-normal">{row.note}</span>
                        )}
                      </td>
                      {cells.map((on, i) => (
                        <td key={i}>
                          {on ? (
                            <span className="text-[#3a66ff]">✓</span>
                          ) : (
                            <span className="text-ink-light/30">—</span>
                          )}
                        </td>
                      ))}
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
          <p className="hw-note text-center">
            年运 / 合婚 / 紫微 / 地理为单项报告，按次单独购买（会员不含报告），价目见上方「单项报告」。
          </p>
        </section>

        {/* FAQ */}
        <section className="mb-14 max-w-3xl mx-auto">
          <h2 className="hw-c-h2 hw-c-h2C">常见问题</h2>
          <div className="space-y-3">
            {FAQS.map((f) => (
              <details key={f.q} className="hw-c-box group">
                <summary className="font-semibold text-ink cursor-pointer list-none flex justify-between items-center">
                  {f.q}
                  <span className="text-[#3a66ff] group-open:rotate-45 transition-transform">＋</span>
                </summary>
                <p className="mt-3 text-sm text-ink-light leading-relaxed">{f.a}</p>
              </details>
            ))}
          </div>
        </section>

        {/* 底部 CTA */}
        <div className="hw-c-cta">
          <h2 className="hw-c-h2" style={{ marginTop: 0 }}>先免费排盘，看看你的命盘</h2>
          <p className="hw-note" style={{ marginBottom: 24 }}>输入出生信息，30 秒内生成你的专属命书报告</p>
          <Link
            href="/"
            className="hw-c-btnBig"
          >
            免费排盘 →
          </Link>
        </div>

        {/* 免责声明 */}
        <p className="hw-note text-center pb-8">
          本站内容基于传统命理文化整理，仅供学习参考与娱乐，不构成任何人生、医疗、法律、财务决策建议。
        </p>
      </div>
    </main>
  )
}
