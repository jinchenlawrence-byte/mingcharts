'use client'

import Link from 'next/link'
import BirthForm from '@/components/BirthForm'
import { SKUS, formatPriceUSD } from '@/lib/pricing'
import { toHant } from '@/lib/hant'

// 命書報告（繁體）：與 /mingshu 的 MingShuContent 同構、同資訊量。
// ★ 導航由 /tw 佈局提供；排盤表單走 /tw/chart。
const H = (s: string) => toHant(s)

const FATEBOOK_PRICE = formatPriceUSD(SKUS.fatebook.priceUSD)
const MEMBER_MONTHLY_PRICE = formatPriceUSD(SKUS.member_monthly.priceUSD)

const SECTIONS: Array<{ title: string; desc: string }> = [
  { title: '八字總覽', desc: '日主、月令、旺衰、格局與五行分布，一句話點明人生主題' },
  { title: '性格天賦', desc: '日主五行本性與十神組合，優勢、短板與天賦所在' },
  { title: '用神喜忌', desc: '明確用神、喜神、忌神，對應方位、顏色與行業建議' },
  { title: '格局成敗', desc: '按《子平真詮》論格局，相神有無、忌神透藏與層次' },
  { title: '調候用神', desc: '按《窮通寶鑑》論寒暖燥濕之病與調候之藥' },
  { title: '大運流年', desc: '逐運點評吉凶基調，重點展開當前大運與近三年流年' },
  { title: '事業財運', desc: '格局、用神與財官配置，行業方向與財富層次趨勢' },
  { title: '婚姻感情', desc: '妻星／夫星與夫妻宮，感情模式、配偶特徵與注意事項' },
  { title: '子女六親', desc: '子女星與子女宮，及與父母、兄弟姊妹的六親關係' },
  { title: '健康提示', desc: '五行偏旺偏弱對應臟腑養護，與生活方式建議' },
]

const FAQS = [
  {
    q: '命書報告怎麼生成？',
    a: '先輸入出生資訊排盤，系統算出你的四柱、十神、大運、旺衰與格局，再由 AI 命理師結合六部經典把這些資訊展開成萬字解讀。排盤資料是確定性演算法，解讀內容緊扣你的具體命局，不是套話。',
  },
  {
    q: '要提供哪些資訊？',
    a: '出生年、月、日、時（精確到分）、性別即可。出生時間越準確，時柱與命盤越精準；時間不確定時，解讀精度會相應下降。',
  },
  {
    q: '多久能生成？',
    a: '通常 30 秒左右。AI 服務偶發不可用時，會自動回退到規則引擎，仍能給出完整的十大板塊解讀。',
  },
  {
    q: '命書能保存嗎？',
    a: '購買後自動保存到你的帳號「我的命盤」，永久可查，重新整理或換裝置都不遺失。',
  },
  {
    q: '能保證準確嗎？',
    a: '不能。命理無法保證某事一定發生，也不替代醫療、法律、財務或心理健康建議。它是一套有結構的自我觀察視角，請理性看待。',
  },
]

export default function HantMingShuContent() {
  const scrollToForm = () => {
    document.getElementById('paipan')?.scrollIntoView({ behavior: 'smooth' })
  }

  return (
    <main className="hw-page">
      {/* Hero */}
      <section className="hw-wrap pt-14 pb-8 text-center">
        <div className="max-w-3xl mx-auto">
          <span className="inline-block bg-gold/10 text-ink text-xs font-semibold px-3 py-1 rounded-full mb-5">
            {H('六書精要 · AI 深度解讀')}
          </span>
          <h1 className="hw-c-h1">
            {H('命書報告')}
          </h1>
          <p className="text-xl text-ink font-medium mb-3">
            {H('一份萬字深度詳批，看懂你的八字命盤')}
          </p>
          <p className="hw-lede mx-auto!">
            {H('先排盤、再解讀。系統算出你的四柱、十神、旺衰與格局，AI 命理師把盤中的關係，以清晰、克制、現代化的語言講清楚——從性格、事業到婚姻、健康，一次看清全局。')}
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <button
              onClick={scrollToForm}
              className="bg-ink text-white px-8 py-3 rounded-full font-bold hover:opacity-85 transition"
            >
              {H(`立即生成我的命書 ${FATEBOOK_PRICE}`)}
            </button>
            <Link
              href="/tw"
              className="bg-white text-ink px-8 py-3 rounded-full font-semibold border border-gold/20 hover:bg-gold/5 transition"
            >
              {H('先免費排盤')}
            </Link>
          </div>
          <div className="mt-4">
            <Link href="/tw/mingshu/demo" className="hw-c-link text-sm">
              {H('先看公開示例命書（虛構資料 · 展示前約 30%）→')}
            </Link>
          </div>
          <p className="text-xs text-ink-light/40 mt-3">
            {H('已生成命盤永久保存 · 30 秒左右出結果 · 可反覆查看')}
          </p>
        </div>
      </section>

      {/* 报告包含什么 */}
      <section className="hw-wrap py-10">
        <h2 className="hw-c-secTitle hw-c-h2C mb-8">
          {H('命書報告包含十大板塊')}
        </h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-4">
          {SECTIONS.map((s, i) => (
            <div key={s.title} className="hw-c-box p-5!">
              <div className="text-amber-600 font-bold text-sm mb-2">
                {String(i + 1).padStart(2, '0')}
              </div>
              <div className="font-bold text-ink mb-1">{s.title}</div>
              <p className="text-xs text-ink-light leading-relaxed">{s.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* 为什么值得 / 信任点 */}
      <section className="hw-wrap py-10">
        <div className="grid md:grid-cols-3 gap-6">
          <div className="hw-c-box text-center">
            <div className="text-3xl mb-3">📖</div>
            <h3 className="font-bold text-ink mb-2">{H('六書為據')}</h3>
            <p className="text-sm text-ink-light leading-relaxed">
              {H('基於《子平真詮》《滴天髓》《窮通寶鑑》《淵海子平》《三命通會》《千里命稿》，解讀有經典原文可循。')}
            </p>
          </div>
          <div className="hw-c-box text-center">
            <div className="text-3xl mb-3">🧮</div>
            <h3 className="font-bold text-ink mb-2">{H('先算後講')}</h3>
            <p className="text-sm text-ink-light leading-relaxed">
              {H('排盤、旺衰、格局均為確定性演算法，AI 只做解讀，不改盤面結論——結論有出處，不是「編」出來的。')}
            </p>
          </div>
          <div className="hw-c-box text-center">
            <div className="text-3xl mb-3">🔒</div>
            <h3 className="font-bold text-ink mb-2">{H('克制不嚇唬')}</h3>
            <p className="text-sm text-ink-light leading-relaxed">
              {H('吉凶判詞分七檔、只描述時段傾向並標註結構依據；不作確定性承諾，不給行動指令，拒絕恐嚇式行銷。')}
            </p>
          </div>
        </div>
      </section>

      {/* 排盘表单 */}
      <section id="paipan" className="hw-wrap py-10 scroll-mt-20">
        <div className="hw-narrow">
          <div className="hw-c-box">
            <h2 className="hw-c-secTitle hw-c-h2C">
              {H('輸入出生資訊，生成你的命書')}
            </h2>
            <p className="text-sm text-ink-light/60 text-center mb-6">
              {H('免費排盤 → 查看命盤骨架 → 解鎖萬字命書詳批')}
            </p>
            <BirthForm ctaText={H('開始排盤（免費）')} locale="zh-Hant" chartPath="/tw/chart" />
          </div>
        </div>
      </section>

      {/* 价格 */}
      <section className="hw-wrap py-10">
        <div className="max-w-3xl mx-auto">
          <div className="bg-ink text-white rounded-xl p-8">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              <div>
                <h2 className="text-2xl font-bold mb-1">{H(`命書報告 ${FATEBOOK_PRICE} / 次`)}</h2>
                <p className="opacity-90 text-sm">
                  {H('十大板塊萬字詳批 · 永久保存 · AI 深度解讀')}
                </p>
              </div>
              <button
                onClick={scrollToForm}
                className="bg-white text-ink px-8 py-3 rounded-full font-bold hover:bg-gold/5 transition whitespace-nowrap"
              >
                {H('立即獲取')}
              </button>
            </div>
          </div>
          <p className="text-center text-sm text-ink-light/60 mt-4">
            {H('高頻用戶可選')} <Link href="/tw/pricing" className="hw-c-link">{H('會員訂閱')} {MEMBER_MONTHLY_PRICE}/{H('月')}</Link>{H('（訂閱權益見價目頁）')}
          </p>
        </div>
      </section>

      {/* FAQ */}
      <section className="hw-wrap py-10">
        <div className="max-w-3xl mx-auto">
          <h2 className="hw-c-secTitle hw-c-h2C mb-6">{H('常見問題')}</h2>
          <div className="space-y-3">
            {FAQS.map((f) => (
              <details key={f.q} className="hw-c-box p-5! group">
                <summary className="font-semibold text-ink cursor-pointer list-none flex justify-between items-center">
                  {f.q}
                  <span className="text-amber-500 group-open:rotate-45 transition-transform">＋</span>
                </summary>
                <p className="mt-3 text-sm text-ink-light leading-relaxed">{f.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* 底部 */}
      <footer className="hw-wrap pb-10 text-center">
        <p className="hw-alert hw-alert--note">
          {H('本站內容基於傳統命理文化整理，僅供學習參考與娛樂，不構成任何人生、醫療、法律、財務決策建議。')}
        </p>
        <p className="text-xs text-ink-light/40 mt-2">
          <Link href="/tw/pricing" className="hover:text-ink/70">{H('價格方案')}</Link>
          <span className="mx-2">·</span>
          <Link href="/tw/article" className="hover:text-ink/70">{H('命理知識')}</Link>
        </p>
      </footer>
    </main>
  )
}
