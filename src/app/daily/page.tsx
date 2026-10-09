import Link from 'next/link'
import Nav from '@/components/Nav'
import DailyShareCard from '@/components/DailyShareCard'
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
    <main className="min-h-screen bg-gradient-to-b from-amber-50 to-white">
      <Nav />

      <div className="container mx-auto px-4 py-10 max-w-2xl">
        <nav className="text-sm text-gray-500 mb-4">
          <Link href="/" className="hover:text-amber-700">首页</Link>
          <span className="mx-2">›</span>
          <span className="text-amber-900">每日日签</span>
        </nav>

        <header className="text-center mb-8">
          <h1 className="text-3xl font-bold text-amber-900 mb-2">今日一省</h1>
          <p className="text-gray-600 text-sm">
            日签取当日干支的历法意象，是一面自省的小镜子，不是吉凶判决。
          </p>
        </header>

        {/* 日签卡 */}
        <section className="bg-white rounded-2xl shadow-lg ring-1 ring-amber-100 p-8 sm:p-10">
          <div className="text-center">
            <div className="text-amber-800 font-semibold text-lg">
              {chineseDate(view.date)} · {view.liuRi}日
            </div>
            <div className="text-xs text-gray-400 mt-1">六十甲子第 {view.jiaziIndex} 位</div>

            <div className="my-8 mx-auto w-16 h-px bg-amber-200" />

            <p className="text-2xl leading-relaxed text-stone-800 font-serif tracking-wide">
              「{view.sign}」
            </p>

            <div className="my-8 mx-auto w-16 h-px bg-amber-200" />

            <p className="text-xs text-amber-700/80 mb-1.5">★ {DAILY_SIGN_DAY_BOUNDARY}</p>
            <p className="text-xs text-gray-400">{view.disclaimer}</p>
          </div>

          <DailyShareCard
            dateLabel={chineseDate(view.date)}
            liuRi={view.liuRi}
            jiaziIndex={view.jiaziIndex}
            sign={view.sign}
            disclaimer={view.disclaimer}
            boundary={DAILY_SIGN_DAY_BOUNDARY}
          />
        </section>

        {/* 个性化日运段（已登录有命盘才显示；HANDOFF-个性化日运 §6.2） */}
        <PersonalDailySection zone={view.zone} />

        {/* 时区切换 */}
        <form method="get" className="mt-6 bg-white rounded-xl shadow p-4">
          <label htmlFor="zone" className="block text-sm font-semibold text-amber-900 mb-2">
            按所在时区归日（IANA 时区名）
          </label>
          <div className="flex flex-col sm:flex-row gap-2">
            <input
              id="zone"
              name="zone"
              list="zone-suggestions"
              defaultValue={view.zone}
              className="flex-1 border border-amber-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-300"
            />
            <button
              type="submit"
              className="bg-amber-100 text-amber-800 px-4 py-2 rounded-md text-sm font-semibold hover:bg-amber-200 transition"
            >
              切换时区
            </button>
          </div>
          <datalist id="zone-suggestions">
            {ZONE_SUGGESTIONS.map((z) => <option key={z} value={z} />)}
          </datalist>
          <p className="text-xs text-gray-400 mt-2">
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
            className="inline-block bg-amber-600 text-white px-6 py-2.5 rounded-full font-semibold hover:bg-amber-700 transition"
          >
            免费排八字命盘 →
          </Link>
        </div>
      </div>
    </main>
  )
}
