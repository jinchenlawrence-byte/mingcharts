import type { CSSProperties } from 'react'
import Link from 'next/link'
import DailyShareCard from '@/components/DailyShareCard'
import ShareLink from '@/components/ShareLink'
import PersonalDailySection from '@/components/PersonalDailySection'
import { dailySignFor, dayBoundaryFor } from '@/lib/daily'
import { dayElement, ELEMENT_PALETTE, inkOn, elementLabel } from '@/lib/dailyElement'
import { ganZhiEn } from '@/lib/enTerms'
import { localize } from '@/lib/hant'
import { pathForLang } from '@/lib/lang'
import type { SiteLang } from '@/lib/lang'

// 每日日签：三语共用一套结构（2026-11-09 收敛）
//
// ★ 英文此前没有 /en/daily（404）。现在三语都渲染本组件，页面文件只剩外壳与 metadata，
//   避免再出现「补齐英文时复制一份英文专用页面」的第二套实现。
// ★ 五行配色只落在日签卡片内层：tint 背景 ＋ 左/顶色带 ＋ 五行标签；
//   页面底色仍由 .hw-page / body 的 --hw-bg 决定，这里不写任何页面级背景。
const ZONE_SUGGESTIONS = [
  'Asia/Shanghai', 'Asia/Hong_Kong', 'Asia/Taipei', 'Asia/Singapore', 'Asia/Tokyo',
  'Asia/Seoul', 'Asia/Bangkok', 'Asia/Dubai', 'Europe/London',
  'Europe/Paris', 'America/New_York', 'America/Chicago', 'America/Denver',
  'America/Los_Angeles', 'America/Vancouver', 'Australia/Sydney', 'Pacific/Auckland',
]

const MONTHS_EN = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

function dateLabel(date: string, locale: SiteLang): string {
  const [y, m, d] = date.split('-').map(Number)
  if (locale === 'en') return `${d} ${MONTHS_EN[m - 1]} ${y}`
  return `${y}年${m}月${d}日`
}

export default function DailyView({
  locale,
  rawZone,
  now,
}: {
  locale: SiteLang
  rawZone: string | null
  /** 仅测试注入用：真实页面不传，走服务器当前时间 */
  now?: Date
}) {
  const L = (s: string) => localize(s, locale)
  const view = dailySignFor(rawZone, now ?? new Date(), locale === 'en' ? 'en' : 'zh-Hans')
  const fellBack = !!rawZone && rawZone !== view.zone
  const boundary = locale === 'en' ? dayBoundaryFor('en') : L(dayBoundaryFor('zh-Hans'))

  // 当日日柱【天干】定五行（复用排盘同一套 GAN_WUXING，不另写表）
  const el = dayElement(view.liuRi[0])
  const palette = ELEMENT_PALETTE[el]
  const ink = inkOn(palette.tint)
  const inkDark = inkOn(palette.tintDark)
  const cardStyle = {
    '--d-tint': palette.tint,
    '--d-tint-dark': palette.tintDark,
    '--d-on': ink,
    '--d-on-dark': inkDark,
    '--d-bar': palette.bar,
  } as CSSProperties

  const dateText = dateLabel(view.date, locale)
  const liuRiText = locale === 'en' ? ganZhiEn(view.liuRi) : L(view.liuRi)
  const home = pathForLang('/', locale)

  return (
    <div className="hw-wrap hw-c-pg" data-section="daily">
      <div className="hw-narrow">
        <Link href={home} className="hw-c-back">‹ {L('首页')}</Link>

        <header className="text-center mb-8" data-section="daily-hero">
          <h1 className="hw-c-h1">{L('今日一省')}</h1>
          <p className="hw-lede hw-ledeC">
            {L('日签取当日干支的历法意象，是一面自省的小镜子，不是吉凶判决。')}
          </p>
        </header>

        {/* 日签卡：五行 tint 只作用于这一层 */}
        <section
          className="hw-d-card hw-d-card--el"
          data-section="daily-card"
          data-daily-element={el}
          style={cardStyle}
        >
          <div className="text-center">
            <div className="hw-d-strong">
              {dateText} · {liuRiText}{locale === 'en' ? ' day' : L('日')}
            </div>
            <div className="hw-d-meta mt-1">
              {locale === 'en'
                ? `Jiazi cycle no. ${view.jiaziIndex} of 60`
                : L(`六十甲子第 ${view.jiaziIndex} 位`)}
            </div>

            {/* 五行标签：色带边框 ＋ 按背景亮度自动选的深/浅字色 */}
            <div className="mt-3">
              <span className="hw-d-el" data-element-label={el}>
                {L('今日五行')} · {elementLabel(el, locale)}
              </span>
            </div>

            <div className="hw-d-rule my-8" />

            <p className="hw-d-quote">
              「{L(view.sign)}」
            </p>

            <div className="hw-d-rule my-8" />

            <p className="hw-d-meta mb-1.5">★ {boundary}</p>
            <p className="hw-alert hw-alert--note">{L(view.disclaimer)}</p>
          </div>

          <DailyShareCard
            dateLabel={dateText}
            liuRi={view.liuRi}
            liuRiLabel={liuRiText}
            jiaziIndex={view.jiaziIndex}
            sign={L(view.sign)}
            disclaimer={L(view.disclaimer)}
            boundary={boundary}
            locale={locale}
          />

          <div className="mt-4 text-center">
            <ShareLink
              path={pathForLang('/daily', locale)}
              title={L('明理 · 每日日签')}
              text={L('今日一省：看看今天的干支给了什么提醒')}
              label={L('分享今日日签')}
              locale={locale}
            />
          </div>
        </section>

        <PersonalDailySection zone={view.zone} locale={locale} />

        {/* 时区切换 */}
        <form method="get" className="mt-6 hw-c-box" data-section="daily-zone">
          <label htmlFor="zone" className="block text-sm font-semibold text-ink mb-2">
            {L('按所在时区归日（IANA 时区名）')}
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
              {L('切换时区')}
            </button>
          </div>
          <datalist id="zone-suggestions">
            {ZONE_SUGGESTIONS.map((z) => <option key={z} value={z} />)}
          </datalist>
          <p className="text-xs text-ink-light mt-2">
            {locale === 'en'
              ? `Currently using ${view.zone} for day boundaries; ${boundary} (same late-Zi-hour convention as the chart engine).`
              : `${L('当前按')} ${view.zone} ${L('归日；')}${boundary}${L('（与排盘的晚子时约定一致）。')}`}
          </p>
          {fellBack && (
            <p className="text-xs text-red-500 mt-1">
              {locale === 'en'
                ? `Unrecognized time zone "${rawZone}" — fell back to ${view.zone}.`
                : `${L('未识别的时区名')}「${rawZone}」，${L('已降级为')} ${view.zone}。`}
            </p>
          )}
        </form>

        <div className="text-center mt-8" data-section="daily-cta">
          <Link href={home} className="hw-c-btnBig">
            {L(locale === 'en' ? 'Cast a free Bazi chart →' : '免费排八字命盘 →')}
          </Link>
        </div>
      </div>
    </div>
  )
}
