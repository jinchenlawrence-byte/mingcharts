'use client'

// 三棵树共用的导航链接行（2026-11-04 统一第一批）
// 只负责把 site-nav 表渲染成链接；不写任何一条手写清单。
// 移动端：整行横向滚动，不做断点隐藏——任一入口都不允许在手机上消失。
//
// ★ 2026-10-30（一）右端渐隐：12 项在 1100px 下把「定价」挤出可视区，
//   而滚动条被隐藏 → 用户看不出右边还有内容。
// ★ 2026-10-30（二）冷门项收进「更多」：渐隐只提示能滑，没解决拥挤本身。
// ★ 2026-10-30（三）修「点更多没反应」：原实现把下拉放在 overflow-x-auto 里。
//   按 CSS 规范，一个轴为 auto 时另一轴不能是 visible → 面板被竖直裁掉，
//   表现为「点了没反应」（其实是打开了但看不见）。
//   现在把按钮与面板移到横滑容器【外面】：横滑只负责主栏链接，
//   「更多」按钮常驻可见，面板相对外层定位，不再被 overflow 裁剪。

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import type { SiteLang } from '@/lib/lang'
import { primaryNav, moreNav, hrefFor, MORE_LABEL } from '@/lib/site-nav'

export default function SiteNav({ locale }: { locale: SiteLang }) {
  const primary = primaryNav(locale)
  const more = moreNav(locale)
  const [open, setOpen] = useState(false)
  const boxRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const onDown = (e: MouseEvent) => {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false) }
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  return (
    <div ref={boxRef} className="relative flex min-w-0 items-center gap-2 sm:gap-3">
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
      </div>

      {more.length > 0 && (
        <>
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-expanded={open}
            aria-haspopup="menu"
            className="shrink-0 whitespace-nowrap text-[13px] text-ink/45 transition-colors hover:text-ink sm:text-[15px]"
          >
            {MORE_LABEL[locale]}
            <span
              aria-hidden="true"
              className={`ml-1 inline-block text-[10px] transition-transform ${open ? 'rotate-180' : ''}`}
            >
              ▾
            </span>
          </button>

          {open && (
            <div
              role="menu"
              className="absolute right-0 top-full z-50 mt-2 min-w-[150px] rounded-xl border border-ink/10 bg-white py-1 shadow-[0_12px_32px_-16px_rgba(27,24,56,0.35)]"
            >
              {more.map((item) => (
                <Link
                  key={item.path}
                  href={hrefFor(item, locale)}
                  onClick={() => setOpen(false)}
                  className="block whitespace-nowrap px-3.5 py-2 text-[13px] text-ink/70 transition-colors hover:bg-ink/5 hover:text-ink sm:text-[14px]"
                >
                  {item.label[locale]}
                </Link>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  )
}
