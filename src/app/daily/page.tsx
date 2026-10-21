import Link from 'next/link'
import Nav from '@/components/Nav'
import DailyShareCard from '@/components/DailyShareCard'
import ShareLink from '@/components/ShareLink'
import PersonalDailySection from '@/components/PersonalDailySection'
import { dailySignFor } from '@/lib/daily'
import { DAILY_SIGN_DAY_BOUNDARY } from '@/data/daily-signs'

export const metadata = {
  title: '每日日签：今日一省 · 免费通用日签',
  description: '按当日干支取传统历法意象的每日一省，非吉凶预测；子时（23:00）起为次日，免费查看与分享。',
}

// 常用时区建议（可键入任意 IANA 时区）
const ZONE_SUGGESTIONS = [
  'Asia/Shanghai', 'Asia/Hong_Kong', 'Asia/Taipei', 'Asia/Singapore', 'Asia/Tokyo',
  'Asia/Seoul', 'Asia/Bangkok', 'Asia/Singapore', 'Asia/Dubai', 'Europe/London',
  'Europe/Paris', 'America/New_York', 'America/Chicago', 'America/Denver',
  'America/Los_Angeles', 'America/Vancouver', 'Australia/Sydney', 'Pacific/Auckland',
]

function chineseDate(date: string): string {
  const [y, m, d] = date.split('-').map(Number)
  return `${y}年${m}月${d}日`
}

export default async function DailyPage({
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
      <Nav />

      <div className="hw-wrap hw-c-pg">
        <div className="hw-narrow">
        <Link href="/" className="hw-c-back">‹ 首页</Link>

        <header className="text-center mb-8">
          <h1 className="hw-c-h1">今日一省</h1>
          <p className="hw-lede hw-ledeC">
            日签取当日干支的历法意象，是一面自省的小镜子，不是吉凶判决。
          </p>
        </header>

        {/* 日签卡 */}
        <section className="hw-d-card">
          <div className="text-center">
            <div className="text-ink font-semibold text-lg">
              {chineseDate(view.date)} · {view.liuRi}日
            </div>
            <div className="text-xs text-ink-light/40 mt-1">六十甲子第 {view.jiaziIndex} 位</div>

            <div className="my-8 mx-auto w-16 h-px bg-[#dedcf0]" />

            <p className="text-2xl leading-relaxed text-stone-800 font-serif tracking-wide">
              「{view.sign}」
            </p>

            <div className="my-8 mx-auto w-16 h-px bg-[#dedcf0]" />

            <p className="text-xs text-ink/70/80 mb-1.5">★ {DAILY_SIGN_DAY_BOUNDARY}</p>
            <p className="text-xs text-ink-light/40">{view.disclaimer}</p>
          </div>

          <DailyShareCard
            dateLabel={chineseDate(view.date)}
            liuRi={view.liuRi}
            jiaziIndex={view.jiaziIndex}
            sign={view.sign}
            disclaimer={view.disclaimer}
            boundary={DAILY_SIGN_DAY_BOUNDARY}
          />

          {/* 分享链接：带 utm_source=share，用于统计分享带来的访问 */}
          <div className="mt-4 text-center">
            <ShareLink
              path="/daily"
              title="明理 · 每日日签"
              text="今日一省：看看今天的干支给了什么提醒"
              label="分享今日日签"
            />
          </div>
        </section>

        {/* 个性化日运段（已登录有命盘才显示；HANDOFF-个性化日运 §6.2） */}
        <PersonalDailySection zone={view.zone} />

        {/* 时区切换 */}
        <form method="get" className="mt-6 hw-c-box">
          <label htmlFor="zone" className="block text-sm font-semibold text-ink mb-2">
            按所在时区归日（IANA 时区名）
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
              切换时区
            </button>
          </div>
          <datalist id="zone-suggestions">
            {ZONE_SUGGESTIONS.map((z) => <option key={z} value={z} />)}
          </datalist>
          <p className="text-xs text-ink-light/40 mt-2">
            当前按 {view.zone} 归日；{DAILY_SIGN_DAY_BOUNDARY}（与排盘的晚子时约定一致）。
          </p>
          {fellBack && (
            <p className="text-xs text-red-500 mt-1">
              未识别的时区名「{rawZone}」，已降级为 {view.zone}。
            </p>
          )}
        </form>

        <div className="text-center mt-8">
          <Link
            href="/"
            className="hw-c-btnBig"
          >
            免费排八字命盘 →
          </Link>
        </div>
        </div>
      </div>
    </main>
  )
}
