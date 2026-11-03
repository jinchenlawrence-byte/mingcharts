import type { Metadata } from 'next'
import Link from 'next/link'
import CheckoutButton from '@/components/CheckoutButton'
import MembershipButton from '@/components/MembershipButton'
import {
  SKUS, REPORT_GRANTS, SUBSCRIPTION_GRANTS, MEMBER_SKUS, formatPriceUSD,
  ONE_TIME_SKUS, ASK_PACK_SIZE, MEMBER_ASK_PER_MONTH, ASK_PER_REPORT, ASK_PER_INVITE,
  type GrantId, type SkuId,
} from '@/lib/pricing'
import { waffoProductId } from '@/lib/waffo-products'
import { GRANT_LABELS } from '@/lib/grantLabels'
import { tEn } from '@/lib/i18n'
import { triAlternates } from '@/lib/lang'

// 英文價目頁（第一批）：價格與權益全部派生自 pricing.ts（單一事實源），不新增付費牆。
// ★ 購買按鈕走既有 CheckoutButton / MembershipButton（支付與權益邏輯不改）；
//   按鈕內部的載入/同意文案仍是中文（已知限制，見回執）。
export const metadata: Metadata = {
  title: `Pricing: Free Bazi chart · Fate Book ${formatPriceUSD(SKUS.fatebook.priceUSD)} · Membership`,
  description:
    'Bazi service pricing: a free Four Pillars chart; a full-length Fate Book; single reports for annual pillars, synastry, Zi Wei Dou Shu and geomancy; membership for recurring content.',
  alternates: { canonical: '/en/pricing', languages: triAlternates('/pricing') },
}

const E = (s: string) => tEn(s)

const SUBSCRIPTION_LABELS = SUBSCRIPTION_GRANTS.map((g) => E(GRANT_LABELS[g])).join(' · ')
const REPORT_SKU_NAMES = REPORT_GRANTS.map((g) => E(SKUS[g as keyof typeof SKUS].name)).join(' · ')

const SKU_HREF: Partial<Record<SkuId, string>> = {
  annual_report: '/tw/liunian',
  hemun: '/tw/hemun',
  ziwei_deep: '/tw/ziwei',
  geo: '/tw/geo',
}

const SECTIONS = [
  'Chart overview', 'Temperament & gifts', 'Useful God', 'Structure outcomes',
  'Seasonal adjustment', 'Luck Pillars & annual pillars', 'Career & wealth',
  'Marriage & relationships', 'Children & kin', 'Health notes',
]

const FAQS = [
  {
    q: 'What is the difference between the free chart and the Fate Book?',
    a: 'The free chart gives the skeleton: Four Pillars, Ten Gods, Luck Pillars, strength and structure. The Fate Book expands that into a full-length reading, drawing on six classics (Zi Ping Zhen Quan, Di Tian Sui, Qiong Tong Bao Jian and others) to explain structure outcomes, seasonal adjustment, Luck and Annual Pillars, career and marriage.',
  },
  {
    q: 'How long does the Fate Book take?',
    a: 'Usually around 30 seconds. Keep the page open. If the AI service is unavailable, the system falls back to the rule engine and still provides all ten sections.',
  },
  {
    q: 'Does membership include reports?',
    a: `No. Membership is a subscription to recurring content: ${SUBSCRIPTION_LABELS}, plus ${MEMBER_ASK_PER_MONTH} AI questions per month. ${REPORT_SKU_NAMES} are bought per use (Fate Book ${formatPriceUSD(SKUS.fatebook.priceUSD)}). Each report includes ${ASK_PER_REPORT} questions; more can be bought as a pack.`,
  },
  {
    q: 'Can I review a purchase later?',
    a: 'Yes. Reports are stored in your account under "My Reports" (Fate Books under "My Charts") and can be reviewed on any device after signing in.',
  },
  {
    q: 'Is the reading guaranteed accurate?',
    a: 'No. A reading describes tendencies; it cannot guarantee events and does not replace medical, legal, financial or mental-health advice.',
  },
  {
    q: 'How do I pay?',
    a: 'International credit cards (Visa / Mastercard) through the Waffo hosted checkout. The report unlocks automatically after payment.',
  },
  {
    q: 'How do I cancel membership?',
    a: `Auto-renew must be ticked at checkout: ${formatPriceUSD(SKUS.member_monthly.priceUSD)}/month or ${formatPriceUSD(SKUS.member_yearly.priceUSD)}/year. You can cancel yourself in the member centre; access continues until the end of the paid period. Refunds follow the Terms of Service.`,
  },
]

interface CompareRow { label: string; free: boolean; grant?: GrantId; member?: boolean; note?: string }

const COMPARE_ROWS: CompareRow[] = [
  { label: 'Four Pillars chart', free: true },
  { label: 'Strength & structure', free: true },
  { label: 'Full Fate Book (ten sections)', free: false, grant: 'fatebook' },
  { label: 'In-depth AI astrologer reading', free: false, grant: 'fatebook' },
  { label: 'Next three Annual Pillars', free: false, grant: 'fatebook' },
  { label: 'Reports stored permanently', free: false, grant: 'fatebook' },
  {
    label: E(GRANT_LABELS.annual_report), free: false, grant: 'annual_report',
    note: `${formatPriceUSD(SKUS.annual_report.priceUSD)} · covers this year, next year and the year after, each with monthly rhythm`,
  },
  ...SUBSCRIPTION_GRANTS.map((g) => ({ label: E(GRANT_LABELS[g]), free: false, grant: g })),
  {
    label: 'AI astrologer questions', free: false, member: true,
    note: `Available after buying any report or subscribing · ${MEMBER_ASK_PER_MONTH}/month for members · ${ASK_PER_REPORT} per report · ${ASK_PER_INVITE} per referral · pack ${formatPriceUSD(SKUS.ask_pack.priceUSD)}/${ASK_PACK_SIZE}`,
  },
]

function compareCells(row: CompareRow): [boolean, boolean, boolean] {
  const inFatebook = row.grant ? SKUS.fatebook.grants.includes(row.grant) : true
  const inMember = row.member ?? (row.grant ? SUBSCRIPTION_GRANTS.includes(row.grant) : true)
  return [row.free, inFatebook, inMember]
}

export default function EnPricingPage() {
  return (
    <main className="hw-page">
      <div className="hw-wrap hw-c-pg">
        <Link href="/en" className="hw-c-back">‹ Home</Link>

        <header className="mb-12">
          <h1 className="hw-c-h1">Chart first, then go deeper</h1>
          <p className="hw-lede">
            The free chart reveals the skeleton; the Fate Book expands it into a full-length reading.
            Built on six classic texts, read by a rule engine and AI together.
          </p>
        </header>

        <div className="grid md:grid-cols-3 gap-4 mb-14">
          <div className="hw-c-plan">
            <h2 className="text-lg font-bold">Free chart</h2>
            <div className="flex items-baseline gap-1">
              <span className="hw-c-pr">$0</span>
              <span className="text-ink-light/60 text-sm">free forever</span>
            </div>
            <p className="text-sm text-ink-light">See the chart before deciding on a reading.</p>
            <ul className="space-y-2 text-sm text-ink/70 flex-1 my-2">
              {['Four Pillars chart (stems, Ten Gods, Hidden Stems)', 'Conception · Life Palace · Body Palace',
                'Strength assessment · structure typing', 'Nine Luck Pillars with start timing',
                'All zodiac, solar-term and knowledge articles'].map((f) => (
                <li key={f} className="flex gap-2"><span className="text-[#3a66ff] shrink-0">✓</span><span>{f}</span></li>
              ))}
            </ul>
            <Link href="/en" className="block text-center py-2.5 rounded-full font-semibold bg-ink text-white hover:brightness-110">
              Cast a free chart →
            </Link>
            <p className="text-xs text-ink-light/50 mt-2">English chart and English AI-written reports.</p>
          </div>

          <div className="hw-c-plan hw-c-planHot">
            <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-[#3a66ff] text-white text-xs font-semibold px-3 py-1 rounded-full">
              Most popular
            </span>
            <h2 className="text-lg font-bold">{E(SKUS.fatebook.name)}</h2>
            <div className="flex items-baseline gap-1">
              <span className="hw-c-pr">{formatPriceUSD(SKUS.fatebook.priceUSD)}</span>
              <span className="text-ink-light/60 text-sm">/ use</span>
            </div>
            <p className="text-sm text-ink-light">{E(SKUS.fatebook.desc)}</p>
            <ul className="space-y-2 text-sm text-ink/70 flex-1 my-2">
              {['Everything in the free chart', 'In-depth AI astrologer reading (DeepSeek)',
                'Ten sections, full length, quoting the six classics',
                'Structure outcomes and seasonal adjustment, item by item',
                'Concrete trends for the next three Annual Pillars',
                'Career & wealth / marriage / children & kin / health',
                'Stored under "My Charts" for repeat viewing'].map((f) => (
                <li key={f} className="flex gap-2"><span className="text-[#3a66ff] shrink-0">✓</span><span>{f}</span></li>
              ))}
            </ul>
            <CheckoutButton sku="fatebook" available={waffoProductId('fatebook') !== null} highlight authPath="/en/auth" returnTo="/en/checkout/success">
              Buy the Fate Book
            </CheckoutButton>
            <Link href="/en/mingshu" className="hw-c-blue block text-center text-sm hover:brightness-110 mt-2">
              Learn more
            </Link>
          </div>

          <div className="hw-c-plan">
            <h2 className="text-lg font-bold">Membership</h2>
            <div className="flex items-baseline gap-1">
              <span className="hw-c-pr">{formatPriceUSD(SKUS.member_monthly.priceUSD)}</span>
              <span className="text-ink-light/60 text-sm">/ month up</span>
            </div>
            <p className="text-sm text-ink-light">{E(SKUS.member_monthly.desc)}</p>
            <ul className="space-y-2 text-sm text-ink/70 flex-1 my-2">
              {SUBSCRIPTION_GRANTS.map((g) => (
                <li key={g} className="flex gap-2"><span className="text-[#3a66ff] shrink-0">✓</span><span>{E(GRANT_LABELS[g])}</span></li>
              ))}
              <li className="flex gap-2"><span className="text-[#3a66ff] shrink-0">✓</span><span>{MEMBER_ASK_PER_MONTH} AI questions per month</span></li>
              <li className="flex gap-2"><span className="text-[#3a66ff] shrink-0">✓</span><span>Annual membership {formatPriceUSD(SKUS.member_yearly.priceUSD)}/year (best value)</span></li>
              <li className="flex gap-2"><span className="text-[#3a66ff] shrink-0">✓</span><span>Fate Book and annual reports are bought per use</span></li>
            </ul>
            <div className="space-y-3">
              {MEMBER_SKUS.map((s) => (
                <MembershipButton key={s.id} plan={s.id === 'member_monthly' ? 'monthly' : 'yearly'} locale="en" />
              ))}
            </div>
          </div>
        </div>

        <section className="mb-14">
          <h2 className="hw-c-h2 hw-c-h2C">Single reports</h2>
          <p className="text-sm text-ink-light text-center mb-6">
            All deep reports except the Fate Book can be bought individually.
          </p>
          <div className="grid sm:grid-cols-2 gap-4 max-w-3xl mx-auto">
            {ONE_TIME_SKUS.filter((s) => s.id !== 'fatebook').map((s) => (
              <div key={s.id} className="hw-c-box flex flex-col gap-4">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h3 className="font-bold text-ink">{E(s.name)}</h3>
                    <p className="text-sm text-ink-light mt-1">{E(s.desc)}</p>
                    {SKU_HREF[s.id] && (
                      <Link href={SKU_HREF[s.id]!} className="hw-c-blue inline-block text-sm hover:brightness-110 mt-2">
                        Read a sample →
                      </Link>
                    )}
                  </div>
                  <div className="text-right shrink-0">
                    <div className="text-2xl font-bold text-ink">{formatPriceUSD(s.priceUSD)}</div>
                    <div className="text-xs text-ink-light/60 mt-1">/ use</div>
                  </div>
                </div>
                <CheckoutButton sku={s.id} available={waffoProductId(s.id) !== null} authPath="/en/auth" returnTo="/en/checkout/success">
                  Buy now
                </CheckoutButton>
              </div>
            ))}
          </div>
        </section>

        <section className="mb-14">
          <h2 className="hw-c-h2 hw-c-h2C">Question pack</h2>
          <p className="text-sm text-ink-light text-center mb-6">
            After buying any report or subscribing, you can ask the AI astrologer about your chart.
            Each report includes {ASK_PER_REPORT} questions, each referral grants {ASK_PER_INVITE},
            and membership includes {MEMBER_ASK_PER_MONTH} per month.
          </p>
          <div className="hw-c-box flex flex-col gap-4 max-w-3xl mx-auto">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="font-bold text-ink">{E(SKUS.ask_pack.name)}</h3>
                <p className="text-sm text-ink-light mt-1">{E(SKUS.ask_pack.desc)}</p>
                <p className="text-xs text-ink-light/60 mt-2">
                  Questions on medical, legal, investment, life-and-death or major trade-offs are not
                  judged — only tendencies are described, and every answer carries a disclaimer.
                </p>
              </div>
              <div className="text-right shrink-0">
                <div className="text-2xl font-bold text-ink">{formatPriceUSD(SKUS.ask_pack.priceUSD)}</div>
                <div className="text-xs text-ink-light/60 mt-1">/ {ASK_PACK_SIZE}</div>
              </div>
            </div>
            <CheckoutButton sku="ask_pack" available={waffoProductId('ask_pack') !== null} requireChart={false} authPath="/en/auth" returnTo="/en/checkout/success">
              Buy the pack
            </CheckoutButton>
          </div>
        </section>

        <section className="mb-14">
          <h2 className="hw-c-h2 hw-c-h2C">What the Fate Book contains</h2>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            {SECTIONS.map((s, i) => (
              <div key={s} className="rounded-2xl border border-[#dedcf0] bg-white p-4 text-center">
                <div className="text-[#3a66ff] font-bold text-sm mb-1">{String(i + 1).padStart(2, '0')}</div>
                <div className="font-semibold text-ink text-sm">{s}</div>
              </div>
            ))}
          </div>
        </section>

        <section className="mb-14">
          <h2 className="hw-c-h2 hw-c-h2C">Benefits comparison</h2>
          <div className="hw-c-box hw-c-boxFlush hw-c-tableWrap">
            <table className="hw-c-table">
              <thead>
                <tr>
                  <th className="text-left">Benefit</th>
                  <th>Free</th>
                  <th>Fate Book</th>
                  <th>Membership</th>
                </tr>
              </thead>
              <tbody>
                {COMPARE_ROWS.map((row) => {
                  const cells = compareCells(row)
                  return (
                    <tr key={row.label}>
                      <td>{row.label}{row.note && <span className="ml-2 text-xs text-ink-light/40 whitespace-normal">{row.note}</span>}</td>
                      {cells.map((on, i) => (
                        <td key={i}>{on ? <span className="text-[#3a66ff]">✓</span> : <span className="text-ink-light/30">—</span>}</td>
                      ))}
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </section>

        <section className="mb-14 max-w-3xl mx-auto">
          <h2 className="hw-c-h2 hw-c-h2C">FAQ</h2>
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

        <p className="hw-note text-center pb-8">
          All content is compiled from traditional Chinese metaphysics, for study and entertainment
          only; it is not life, medical, legal or financial advice.
        </p>
      </div>
    </main>
  )
}
