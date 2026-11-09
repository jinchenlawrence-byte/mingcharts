import Link from 'next/link'
import CheckoutButton from '@/components/CheckoutButton'
import MembershipButton from '@/components/MembershipButton'
import {
  SKUS,
  REPORT_GRANTS,
  SUBSCRIPTION_GRANTS,
  MEMBER_SKUS,
  formatPriceUSD,
  ONE_TIME_SKUS,
  ASK_PACK_SIZE,
  MEMBER_ASK_PER_MONTH,
  ASK_PER_REPORT,
  ASK_PER_INVITE,
  type GrantId,
  type SkuId,
} from '@/lib/pricing'
import { waffoProductId } from '@/lib/waffo-products'
import { GRANT_LABELS } from '@/lib/grantLabels'
import { toHant } from '@/lib/hant'
import { triAlternates } from '@/lib/lang'
import { skuAnchorId } from '@/lib/pricingFocus'
import PricingFocus from '@/components/PricingFocus'
import type { Metadata } from 'next'

// 價格方案（繁體）：與 /pricing 同構、同資訊量；價格一律取自 SKUS（單一事實源）。
// ★ 導航由 /tw 佈局提供。購買按鈕仍用既有 CheckoutButton / MembershipButton
//   （支付與權益程式不改；按鈕內部的載入態文案維持簡體，屬已知限制）。
const H = (s: string) => toHant(s)

export const metadata: Metadata = {
  title: `價格方案：免費排盤 · 命書報告 ${formatPriceUSD(SKUS.fatebook.priceUSD)} · 會員訂閱`,
  description: `八字命理服務價格：免費四柱排盤；${formatPriceUSD(SKUS.fatebook.priceUSD)} 解鎖萬字命書深度詳批（八字總覽、性格天賦、用神喜忌、格局成敗、調候、大運流年、事業財運、婚姻感情、子女六親、健康提示）；會員訂閱提供日運、流月等持續型內容，另含每月 ${MEMBER_ASK_PER_MONTH} 次追問，不含命書等報告。`,
  alternates: { canonical: '/tw/pricing', languages: triAlternates('/pricing') },
}

// 订阅类权益的中文名串（FAQ 用），逐项派生自 SUBSCRIPTION_GRANTS
const SUBSCRIPTION_LABELS = H(SUBSCRIPTION_GRANTS.map((g) => GRANT_LABELS[g]).join('、'))
// 报告类 SKU 名称串（FAQ 用）：报告 grant 与报告 SkuId 同 id
const REPORT_SKU_NAMES = H(REPORT_GRANTS.map((g) => SKUS[g as keyof typeof SKUS].name).join('、'))

// 单项报告 → 繁中模組頁直達入口
const SKU_HREF: Partial<Record<SkuId, string>> = {
  annual_report: '/tw/liunian',
  hemun: '/tw/hemun',
  ziwei_deep: '/tw/ziwei',
  geo: '/tw/geo',
}

const SECTIONS = [
  '八字總覽',
  '性格天賦',
  '用神喜忌',
  '格局成敗',
  '調候用神',
  '大運流年',
  '事業財運',
  '婚姻感情',
  '子女六親',
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
  buySku?: SkuId
}

// ★ 展示卡片，非价目定义：价格全部派生自 pricing.ts 的 SKUS（单一事实源）
const CARDS: PriceCard[] = [
  {
    name: '免費排盤',
    price: '$0',
    unit: '永久免費',
    desc: '先看命盤，再決定要不要深入解讀',
    highlight: false,
    membership: false,
    features: [
      '四柱八字排盤（干支 / 十神 / 藏干）',
      '旺衰判定 · 格局定格',
      '九步大運（起運時間）',
    ],
    cta: { text: '免費排盤', href: '/tw' },
  },
  {
    name: H(SKUS.fatebook.name),
    price: formatPriceUSD(SKUS.fatebook.priceUSD),
    unit: '/ 次',
    desc: H(SKUS.fatebook.desc),
    highlight: true,
    membership: false,
    features: [
      '包含免費排盤全部內容',
      'AI 命理師深度解讀（DeepSeek 驅動）',
      '十大板塊萬字詳批，引用六書原文',
      '格局成敗 · 調候用神逐項拆解',
      '近三年流年具體趨勢',
      '事業財運 / 婚姻感情 / 子女六親 / 健康提示',
      '永久保存到「我的命盤」，可反覆查看',
    `購買後贈送 ${ASK_PER_REPORT} 次 AI 追問（終身有效，不重置）`,
    ],
    buySku: 'fatebook',
    cta: { text: '購買命書詳批', href: '/tw/mingshu' },
  },
  {
    name: '會員訂閱',
    price: formatPriceUSD(SKUS.member_monthly.priceUSD),
    unit: '/ 月起',
    desc: H(SKUS.member_monthly.desc),
    highlight: false,
    membership: true,
    features: [
      ...SUBSCRIPTION_GRANTS.map((g) => H(GRANT_LABELS[g])),
      `每月 ${MEMBER_ASK_PER_MONTH} 次 AI 追問`,
      `年度會員 ${formatPriceUSD(SKUS.member_yearly.priceUSD)}/年（主推，更划算）`,
      '命書 / 年運等深度報告需按次單獨購買',
    ],
    cta: { text: '了解會員', href: '/tw/pricing' },
  },
]

const FAQS = [
  {
    q: '命書報告和免費排盤有什麼區別？',
    a: '免費排盤給出的是四柱、十神、大運、旺衰、格局這些「骨架」；命書報告則在此基礎上，由 AI 命理師結合《子平真詮》《滴天髓》《窮通寶鑑》等六部經典，把格局成敗、調候用神、大運流年、事業婚姻等內容展開成萬字深度解讀，說清楚「結論是怎麼來的」。',
  },
  {
    q: '命書報告多久能生成？',
    a: '通常在 30 秒左右。生成期間請勿關閉頁面；若 AI 服務暫時不可用，系統會自動回退到規則引擎，仍會給出完整的十大板塊解讀。',
  },
  {
    q: '會員包含命書等報告嗎？',
    a: `不包含。會員是持續型內容訂閱，權益為${SUBSCRIPTION_LABELS}，另含每月 ${MEMBER_ASK_PER_MONTH} 次 AI 追問（按自然月重置、不累計）；${REPORT_SKU_NAMES}等深度報告均需按次單獨購買（命書 ${formatPriceUSD(SKUS.fatebook.priceUSD)}/次）。購買任一報告或開通會員後，即可在命盤頁就你的命盤向 AI 追問；每份報告另贈 ${ASK_PER_REPORT} 次，用完可買追問包。續費時會員有效期會從原到期日向後疊加。`,
  },
  {
    q: '購買後可以反覆查看嗎？',
    a: '可以。命書會保存到你的帳號（「我的命盤」），隨時登入查看，不會因為重新整理或換裝置而遺失。',
  },
  {
    q: '命理分析能保證準確嗎？',
    a: '不能。命理解讀無法保證某件事一定發生，也不替代醫療、法律、財務或心理健康方面的專業建議。它提供的是一套有結構的自我觀察視角，用於理解和規劃，請理性看待。',
  },
  {
    q: '如何付款？',
    a: '支援國際信用卡（Visa / Mastercard 等），由 Waffo 託管收銀台安全處理；付款完成後報告自動解鎖，可在「我的報告」中隨時回看。',
  },
  {
    q: '會員怎麼自動續費？不想續了怎麼取消？',
    a: `開通時需勾選同意自動續費：月度會員 ${formatPriceUSD(SKUS.member_monthly.priceUSD)}/月、年度會員 ${formatPriceUSD(SKUS.member_yearly.priceUSD)}/年，到期由支付渠道自動扣費續訂。取消可在「會員中心」一鍵自助完成（也可透過收銀台郵件入口聯絡我們）；取消後本計費週期內仍可繼續使用，到期自動失效並不再扣費。退款政策見《服務條款》。`,
  },
]

interface CompareRow {
  label: string
  free: boolean
  grant?: GrantId
  member?: boolean
  note?: string
}

const COMPARE_ROWS: CompareRow[] = [
  { label: '四柱八字排盤', free: true },
  { label: '旺衰 · 格局判定', free: true },
  { label: '萬字命書詳批（十大板塊）', free: false, grant: 'fatebook' },
  { label: 'AI 命理師深度解讀', free: false, grant: 'fatebook' },
  { label: '近三年流年趨勢', free: false, grant: 'fatebook' },
  { label: '報告永久保存，可反覆查看', free: false, grant: 'fatebook' },
  {
    label: H(GRANT_LABELS.annual_report), free: false, grant: 'annual_report',
    note: `單項購買 ${formatPriceUSD(SKUS.annual_report.priceUSD)} · 覆蓋今年/明年/後年三年，各含流月節奏`,
  },
  ...SUBSCRIPTION_GRANTS.map((g) => ({
    label: H(GRANT_LABELS[g]), free: false, grant: g,
  })),
  {
    label: 'AI 命理師追問', free: false, member: true,
    note: `購買任一報告或開通會員即可用 · 會員每月 ${MEMBER_ASK_PER_MONTH} 次 · 每份報告贈 ${ASK_PER_REPORT} 次 · 每邀請 1 人贈 ${ASK_PER_INVITE} 次 · 追問包 ${formatPriceUSD(SKUS.ask_pack.priceUSD)}/${ASK_PACK_SIZE} 次`,
  },
]

function compareCells(row: CompareRow): [boolean, boolean, boolean] {
  const inFatebook = row.grant ? SKUS.fatebook.grants.includes(row.grant) : true
  const inMember = row.member ?? (row.grant ? SUBSCRIPTION_GRANTS.includes(row.grant) : true)
  return [row.free, inFatebook, inMember]
}

export default function HantPricingPage() {
  return (
    <main className="hw-page">
      <div className="hw-wrap hw-c-pg">
        <Link href="/tw" className="hw-c-back">{H('‹ 首頁')}</Link>

        <header className="mb-12">
          <h1 className="hw-c-h1">{H('先排盤，再深入')}</h1>
          <p className="hw-lede">
            {H('免費排盤看清命盤骨架，命書報告展開萬字詳批。基於六部經典命理著作，結合 AI 與規則引擎雙重解讀。')}
          </p>
        </header>

        {/* 從免費報告「解鎖」帶 ?sku= 落地：頂部確認語 + 目標卡持續高亮（非法參數安靜回退） */}
        <PricingFocus locale="zh-Hant" />

        {/* 价格卡片 */}
        <div className="grid md:grid-cols-3 gap-6 items-start">
          {CARDS.map((card) => (
            <div key={card.name} id={card.buySku ? skuAnchorId(card.buySku) : undefined} className={`hw-c-plan${card.highlight ? ' hw-c-planHot' : ''}`}>
              {card.highlight && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-hw-water text-white text-xs font-semibold px-3 py-1 rounded-full">
                  {H('最受歡迎')}
                </span>
              )}

              <h2 className="text-lg font-bold">{card.name}</h2>
              <div className="flex items-baseline gap-1">
                <span className="hw-c-pr">{card.price}</span>
                <span className="text-ink-light text-sm">{card.unit}</span>
              </div>
              <p className="text-sm text-ink-light">{card.desc}</p>

              <ul className="space-y-2 text-sm text-ink/70 my-2">
                {card.features.map((f) => (
                  <li key={f} className="flex gap-2">
                    <span className="text-hw-water shrink-0">✓</span>
                    <span>{f}</span>
                  </li>
                ))}
              </ul>

              {card.membership ? (
                <div className="space-y-3">
                  {MEMBER_SKUS.map((s) => (
                    <div key={s.id} id={skuAnchorId(s.id)}>
                      <MembershipButton
              className="w-full border border-ink/25 bg-white text-ink py-2.5 rounded-full font-semibold hover:bg-ink/5 transition disabled:opacity-60 disabled:cursor-not-allowed"
                        plan={s.id === 'member_monthly' ? 'monthly' : 'yearly'}
                        locale="zh-Hant"
                      />
                    </div>
                  ))}
                </div>
              ) : card.buySku ? (
                <div>
                  <CheckoutButton
                    sku={card.buySku}
                    available={waffoProductId(card.buySku) !== null}
                    highlight={card.highlight}
                    authPath="/tw/auth"
                    locale="zh-Hant"
                    returnTo="/tw/chart"
                  >
                    {card.cta.text}
                  </CheckoutButton>
                  <Link
                    href={card.cta.href}
                    className="block text-center text-sm text-ink/70 hover:text-ink mt-2"
                  >
                    {H('查看命書詳情')}
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

        {/* 单项报告价目 */}
        <section className="hw-sec">
          <h2 className="hw-c-h2 hw-c-h2C">{H('單項報告')}</h2>
          <p className="text-sm text-ink-light text-center mb-6">
            {H('除命書外的深度報告，均可單獨購買；也可選三合一套餐更划算。')}
          </p>
          <div className="grid sm:grid-cols-2 gap-4 max-w-3xl mx-auto">
            {ONE_TIME_SKUS.filter((s) => s.id !== 'fatebook').map((s) => (
              <div key={s.id} id={skuAnchorId(s.id)} className="hw-c-box flex flex-col gap-4">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h3 className="font-bold text-ink">{H(s.name)}</h3>
                    <p className="text-sm text-ink-light mt-1">{H(s.desc)}</p>
                    {SKU_HREF[s.id] && (
                      <Link
                        href={SKU_HREF[s.id]!}
                        className="hw-c-blue inline-block text-sm hover:brightness-110 mt-2"
                      >
                        {H('去體驗 →')}
                      </Link>
                    )}
                  </div>
                  <div className="text-right shrink-0">
                    <div className="text-2xl font-bold text-ink">{formatPriceUSD(s.priceUSD)}</div>
                    <div className="text-xs text-ink-light mt-1">/ 次</div>
                  </div>
                </div>
                {/* ★ 追問額度為所有單項報告共有（entitlement 按每份報告派生 ASK_PER_REPORT 次），
                    與命書卡同一措辭；.hw-alert 強調，避免使用者誤以為只有命書才贈。 */}
                <p className="hw-alert hw-alert--info text-xs">
                  {H(`購買後贈送 ${ASK_PER_REPORT} 次 AI 追問（終身有效，不重置）`)}
                </p>
                <CheckoutButton
                  sku={s.id}
                  available={waffoProductId(s.id) !== null}
                  requireChart={false}
                  authPath="/tw/auth"
                  locale="zh-Hant"
                  returnTo="/tw/reports"
                >
                  {H('立即購買')}
                </CheckoutButton>
              </div>
            ))}
          </div>
          <p className="text-xs text-ink-light text-center mt-4">
            {H('購買後報告永久保存，可隨時反覆查看（會員訂閱不含單項報告）。')}
          </p>
        </section>

        {/* 追问包 */}
        <section className="hw-sec">
          <h2 className="hw-c-h2 hw-c-h2C">{H('追問包')}</h2>
          <p className="text-sm text-ink-light text-center mb-6">
            {H('購買任一報告或開通會員後，即可在命盤頁就你的命盤向 AI 命理師追問；每份報告贈')} {ASK_PER_REPORT} {H('次（終身有效）、每邀請 1 位好友註冊贈')} {ASK_PER_INVITE} {H('次、會員每月')} {MEMBER_ASK_PER_MONTH} {H('次，用完後可購買追問包續用。')}
          </p>
          <div id={skuAnchorId('ask_pack')} className="hw-c-box flex flex-col gap-4 max-w-3xl mx-auto">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="font-bold text-ink">{H(SKUS.ask_pack.name)}</h3>
                <p className="text-sm text-ink-light mt-1">{H(SKUS.ask_pack.desc)}</p>
                <p className="text-xs text-ink-light mt-2">
                  {H('涉醫療、法律、投資、生死與重大取捨的「該不該」類問題不作判決，只講命局傾向；每條回答均附免責說明。')}
                </p>
              </div>
              <div className="text-right shrink-0">
                <div className="text-2xl font-bold text-ink">{formatPriceUSD(SKUS.ask_pack.priceUSD)}</div>
                <div className="text-xs text-ink-light mt-1">/ {ASK_PACK_SIZE} 次</div>
              </div>
            </div>
            <CheckoutButton
              sku="ask_pack"
              available={waffoProductId('ask_pack') !== null}
              requireChart={false}
              authPath="/tw/auth"
              locale="zh-Hant"
              returnTo="/tw/chart"
            >
              {H('購買追問包')}
            </CheckoutButton>
          </div>
        </section>

        {/* 命书十大板块 */}
        <section className="hw-sec">
          <h2 className="hw-c-h2 hw-c-h2C">{H('命書報告包含什麼')}</h2>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            {SECTIONS.map((s, i) => (
              <div key={s} className="hw-c-tile text-center">
                <div className="text-hw-water font-bold text-sm mb-1">{String(i + 1).padStart(2, '0')}</div>
                <div className="font-semibold text-ink text-sm">{s}</div>
              </div>
            ))}
          </div>
        </section>

        {/* 对比表 */}
        <section className="hw-sec">
          <h2 className="hw-c-h2 hw-c-h2C">{H('權益對比')}</h2>
          <div className="hw-c-box hw-c-boxFlush hw-c-tableWrap">
            <table className="hw-c-table">
              <thead>
                <tr>
                  <th className="text-left">{H('權益')}</th>
                  <th>{H('免費')}</th>
                  <th>{H('命書報告')}</th>
                  <th>{H('會員')}</th>
                </tr>
              </thead>
              <tbody>
                {COMPARE_ROWS.map((row) => {
                  const cells = compareCells(row)
                  return (
                    <tr key={row.label}>
                      <td>
                        {row.label}
                        {row.note && (
                          <span className="ml-2 text-xs text-ink-light whitespace-normal">{row.note}</span>
                        )}
                      </td>
                      {cells.map((on, i) => (
                        <td key={i}>
                          {on ? (
                            <span className="text-hw-water">✓</span>
                          ) : (
                            <span className="text-ink-light">—</span>
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
            {H('年運 / 合婚 / 紫微 / 地理為單項報告，按次單獨購買（會員不含報告），價目見上方「單項報告」。')}
          </p>
        </section>

        {/* FAQ */}
        <section className="hw-sec max-w-3xl mx-auto">
          <h2 className="hw-c-h2 hw-c-h2C">{H('常見問題')}</h2>
          <div className="space-y-3">
            {FAQS.map((f) => (
              <details key={f.q} className="hw-c-box group">
                <summary className="font-semibold text-ink cursor-pointer list-none flex justify-between items-center">
                  {f.q}
                  <span className="text-hw-water group-open:rotate-45 transition-transform">＋</span>
                </summary>
                <p className="mt-3 text-sm text-ink-light leading-relaxed">{f.a}</p>
              </details>
            ))}
          </div>
        </section>

        {/* 底部 CTA */}
        <div className="hw-c-cta">
          <h2 className="hw-c-h2 mt-0">{H('先免費排盤，看看你的命盤')}</h2>
          <p className="hw-note mb-6">{H('輸入出生資訊，30 秒內生成你的專屬命書報告')}</p>
          <Link href="/tw" className="hw-c-btnBig">
            {H('免費排盤 →')}
          </Link>
        </div>

        <p className="hw-alert hw-alert--note">
          {H('本站內容基於傳統命理文化整理，僅供學習參考與娛樂，不構成任何人生、醫療、法律、財務決策建議。')}
        </p>
      </div>
    </main>
  )
}
