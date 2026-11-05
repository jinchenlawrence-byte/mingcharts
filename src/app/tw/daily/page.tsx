import Link from 'next/link'
import DailyShareCard from '@/components/DailyShareCard'
import ShareLink from '@/components/ShareLink'
import PersonalDailySection from '@/components/PersonalDailySection'
import { dailySignFor } from '@/lib/daily'
import { DAILY_SIGN_DAY_BOUNDARY } from '@/data/daily-signs'
import { toHant } from '@/lib/hant'
import { hantAlternates } from '@/lib/hant-seo'
import type { Metadata } from 'next'

// 每日日籤（繁體）：與 /daily 同源，文案經 toHant 派生。
// ★ 導航由 /tw 佈局提供（不重複渲染簡體 Nav）。
export const metadata: Metadata = {
  title: '每日日籤：今日一省 · 免費通用日籤',
  description: '按當日干支取傳統曆法意象的每日一省，非吉凶預測；子時（23:00）起為次日，免費查看與分享。',
  alternates: { canonical: '/tw/daily', languages: hantAlternates('/daily') },
}

// 常用时区建议（可键入任意 IANA 时区）
const ZONE_SUGGESTIONS = [
  'Asia/Shanghai', 'Asia/Hong_Kong', 'Asia/Taipei', 'Asia/Singapore', 'Asia/Tokyo',
  'Asia/Seoul', 'Asia/Bangkok', 'Asia/Singapore', 'Asia/Dubai', 'Europe/London',
  'Europe/Paris', 'America/New_York', 'America/Chicago', 'America/Denver',
  'America/Los_Angeles', 'America/Vancouver', 'Australia/Sydney', 'Pacific/Auckland',
]

const L = (s: string) => toHant(s)

function chineseDate(date: string): string {
  const [y, m, d] = date.split('-').map(Number)
  return `${y}年${m}月${d}日`
}

export default async function HantDailyPage({
  searchParams,
}: {
  searchParams: Promise<{ zone?: string | string[] }>
}) {
  const sp = await searchParams
  const rawZone = Array.isArray(sp.zone) ? sp.zone[0] : sp.zone
  const view = dailySignFor(rawZone ?? null)
  // 用户传了时区但被降级（非法），如实提示，不静默
  const fellBack = !!rawZone && rawZone !== view.zone

  return (
    <main className="hw-page">
      <div className="hw-wrap hw-c-pg">
        <div className="hw-narrow">
        <Link href="/tw" className="hw-c-back">{L('‹ 首頁')}</Link>

        <header className="text-center mb-8">
          <h1 className="hw-c-h1">{L('今日一省')}</h1>
          <p className="hw-lede hw-ledeC">
            {L('日籤取當日干支的曆法意象，是一面自省的小鏡子，不是吉凶判決。')}
          </p>
        </header>

        {/* 日簽卡 */}
        <section className="hw-d-card">
          <div className="text-center">
            <div className="text-ink font-semibold text-lg">
              {chineseDate(view.date)} · {view.liuRi}{L('日')}
            </div>
            <div className="text-xs text-ink-light mt-1">{L(`六十甲子第 ${view.jiaziIndex} 位`)}</div>

            <div className="my-8 mx-auto w-16 h-px bg-hw-line" />

            <p className="text-2xl leading-relaxed text-stone-800 font-serif tracking-wide">
              「{L(view.sign)}」
            </p>

            <div className="my-8 mx-auto w-16 h-px bg-hw-line" />

            <p className="text-xs text-ink/70/80 mb-1.5">★ {L(DAILY_SIGN_DAY_BOUNDARY)}</p>
            <p className="hw-alert hw-alert--note">{L(view.disclaimer)}</p>
          </div>

          <DailyShareCard
            dateLabel={chineseDate(view.date)}
            liuRi={view.liuRi}
            jiaziIndex={view.jiaziIndex}
            sign={view.sign}
            disclaimer={view.disclaimer}
            boundary={DAILY_SIGN_DAY_BOUNDARY}
            locale="zh-Hant"
          />

          {/* 分享链接：带 utm_source=share，用于统计分享带来的访问 */}
          <div className="mt-4 text-center">
            <ShareLink
              path="/tw/daily"
              title={L('明理 · 每日日籤')}
              text={L('今日一省：看看今天的干支給了什麼提醒')}
              label={L('分享今日日籤')}
              locale="zh-Hant"
            />
          </div>
        </section>

        {/* 个性化日运段（已登录有命盘才显示；HANDOFF-个性化日运 §6.2） */}
        <PersonalDailySection zone={view.zone} locale="zh-Hant" />

        {/* 时区切换 */}
        <form method="get" className="mt-6 hw-c-box">
          <label htmlFor="zone" className="block text-sm font-semibold text-ink mb-2">
            {L('按所在時區歸日（IANA 時區名）')}
          </label>
          <div className="flex flex-col sm:flex-row gap-2">
            <input
              id="zone"
              name="zone"
              list="zone-suggestions"
              defaultValue={view.zone}
              className="hw-c-input flex-1"
            />
            <button
              type="submit"
              className="rounded-full bg-ink px-5 py-2 text-sm font-bold text-white transition hover:brightness-110"
            >
              {L('切換時區')}
            </button>
          </div>
          <datalist id="zone-suggestions">
            {ZONE_SUGGESTIONS.map((z) => <option key={z} value={z} />)}
          </datalist>
          <p className="text-xs text-ink-light mt-2">
            {L(`當前按 ${view.zone} 歸日；`)}{L(DAILY_SIGN_DAY_BOUNDARY)}{L('（與排盤的晚子時約定一致）。')}
          </p>
          {fellBack && (
            <p className="text-xs text-red-500 mt-1">
              {L(`未識別的時區名「${rawZone}」，已降級為 ${view.zone}。`)}
            </p>
          )}
        </form>

        <div className="text-center mt-8">
          <Link href="/tw" className="hw-c-btnBig">
            {L('免費排八字命盤 →')}
          </Link>
        </div>
        </div>
      </div>
    </main>
  )
}
