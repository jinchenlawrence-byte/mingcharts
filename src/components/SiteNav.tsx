'use client'

// 三棵树共用的导航链接行（2026-11-04 统一第一批）
// 只负责把 site-nav 表渲染成链接；不写任何一条手写清单。
// 移动端：整行横向滚动，不做断点隐藏——任一入口都不允许在手机上消失。
//
// ★ 2026-10-30（一）右端渐隐遮罩。
//   起因：三语统一后条目变多（12 项），在 1100px 左右宽度下「定价」被挤出可视区，
//   而滚动条被刻意隐藏（scrollbar-width:none）——用户看不到「右边还有内容」，
//   体感等于这一项被删掉了（线上 HTML 里其实还在）。
//
// ★ 2026-10-30（二）冷门项收进「更多」。
//   渐隐只是提示「能滑」，没解决拥挤本身。把 /daily、/bazi 两个冷门入口
//   收进「更多」下拉，主栏回到 10 项，常见视口下不再需要横滑。
//   ★ 断言守着：任何入口都不允许从导航里消失（只是换了个位置）。

import Link from 'next/link'
import type { SiteLang } from '@/lib/lang'
import { primaryNav, moreNav, hrefFor, MORE_LABEL } from '@/lib/site-nav'

export default function SiteNav({ locale }: { locale: SiteLang }) {
  const primary = primaryNav(locale)
  const more = moreNav(locale)

  return (
    <div className="flex min-w-0 items-center gap-3 overflow-x-auto text-[13px] [scrollbar-width:none] sm:gap-4 sm:text-[15px] [&::-webkit-scrollbar]:hidden [mask-image:linear-gradient(to_right,#000_0%,#000_calc(100%-28px),transparent_100%)] [-webkit-mask-image:linear-gradient(to_right,#000_0%,#000_calc(100%-28px),transparent_100%)]">
      {primary.map((item) => (
        <Link
          key={item.path}
          href={hrefFor(item, locale)}
          className="whitespace-nowrap text-ink/60 transition-colors hover:text-ink"
        >
          {item.label[locale]}
        </Link>
      ))}

      {/* 冷门入口：用 details/summary 实现，零 JS 状态、键盘可达、点击外部自动收起 */}
      {more.length > 0 && (
        <details className="group relative shrink-0">
          <summary className="cursor-pointer list-none whitespace-nowrap text-ink/45 transition-colors hover:text-ink [&::-webkit-details-marker]:hidden">
            {MORE_LABEL[locale]}
            <span aria-hidden="true" className="ml-1 text-[10px]">▾</span>
          </summary>
          <div className="absolute right-0 z-50 mt-3 min-w-[140px] rounded-xl border border-ink/10 bg-white py-1 shadow-[var(--sh-2)]">
            {more.map((item) => (
              <Link
                key={item.path}
                href={hrefFor(item, locale)}
                className="block whitespace-nowrap px-3.5 py-2 text-[13px] text-ink/70 transition-colors hover:bg-ink/5 hover:text-ink sm:text-[14px]"
              >
                {item.label[locale]}
              </Link>
            ))}
          </div>
        </details>
      )}
    </div>
  )
}
