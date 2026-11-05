'use client'

// 三棵树共用的导航链接行（2026-11-04 统一第一批）
// 只负责把 site-nav 表渲染成链接；不写任何一条手写清单。
// 移动端：整行横向滚动，不做断点隐藏——任一入口都不允许在手机上消失。
//
// ★ 2026-10-30：加右侧渐隐遮罩。
//   起因：三语统一后条目变多（12 项），在 1100px 左右宽度下「定价」被挤出可视区，
//   而滚动条被刻意隐藏（scrollbar-width:none）——用户看不到「右边还有内容」，
//   体感等于这一项被删掉了（线上 HTML 里其实还在）。
//   做法：mask-image 让容器右端 28px 渐隐，内容溢出时自然形成「还有更多」的暗示；
//   不用额外 DOM、不改条目顺序、不加宽度。

import Link from 'next/link'
import type { SiteLang } from '@/lib/lang'
import { itemsFor, hrefFor } from '@/lib/site-nav'

export default function SiteNav({ locale }: { locale: SiteLang }) {
  const items = itemsFor(locale)
  return (
    <div className="flex min-w-0 items-center gap-3 overflow-x-auto text-[13px] [scrollbar-width:none] sm:gap-4 sm:text-[15px] [&::-webkit-scrollbar]:hidden [mask-image:linear-gradient(to_right,#000_0%,#000_calc(100%-28px),transparent_100%)] [-webkit-mask-image:linear-gradient(to_right,#000_0%,#000_calc(100%-28px),transparent_100%)]">
      {items.map((item) => (
        <Link
          key={item.path}
          href={hrefFor(item, locale)}
          className="whitespace-nowrap text-ink/60 transition-colors hover:text-ink"
        >
          {item.label[locale]}
        </Link>
      ))}
    </div>
  )
}
