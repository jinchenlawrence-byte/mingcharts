'use client'

// 三棵树共用的页头（2026-11-04 统一第一批）
//
// 此前：简体 Nav.tsx 一个客户端胶囊；繁体 layout 手写 13 个链接；英文 layout 手写 10 个链接。
// 现在：一个组件 + locale 参数。三棵树只传 locale，链接清单统一来自 lib/site-nav.ts。
//
// 保留简体现有能力（用户硬要求）：
//   · Supabase 登录态胶囊（已登录 → 账号下拉：会员中心 / 我的命盘 / 我的报告 / 账号设置 / 退出登录）
//   · 移动端工具行横向滚动，登录与语言切换固定在右侧，不随工具行滚走
//   · 入口不做断点隐藏（任一树少一个入口都会被 scripts/test-nav-parity.mjs 判红）

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { getSupabase } from '@/lib/supabase'
import { BRAND_DOTS } from '@/lib/visual-tokens'
import type { SiteLang } from '@/lib/lang'
import { pathForLang } from '@/lib/lang'
import { itemsFor, hrefFor, ACCOUNT_ITEMS, BRAND, NAV_ARIA, AUTH_LABEL, ACCOUNT_BUTTON, SIGN_OUT_LABEL } from '@/lib/site-nav'
import SiteNav from '@/components/SiteNav'
import LangSwitcher from '@/components/LangSwitcher'

// 五行点 · 品牌标识（木火土金水）：色值与 --hw-* 令牌同源
const DOTS = BRAND_DOTS

export default function SiteHeader({ locale = 'zh-Hans' }: { locale?: SiteLang }) {
  const router = useRouter()
  const [email, setEmail] = useState<string | null>(null)
  const [open, setOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const supabase = getSupabase()
    supabase.auth.getSession().then(({ data: { session } }) => {
      setEmail(session?.user?.email ?? null)
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setEmail(session?.user?.email ?? null)
      }
    )
    return () => subscription.unsubscribe()
  }, [])

  // 点菜单外部 / 按 Esc 自动收起
  useEffect(() => {
    if (!open) return
    const onDown = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  const handleLogout = async () => {
    setOpen(false)
    await getSupabase().auth.signOut()
    router.push('/')
  }

  const accountItems = itemsFor(locale, ACCOUNT_ITEMS)

  return (
    <nav
      aria-label={NAV_ARIA[locale]}
      className="sticky top-3 z-50 mx-auto mt-4 flex w-[calc(100%-2rem)] max-w-[1240px] items-center justify-between gap-2 rounded-full border border-ink/10 bg-white/90 py-2 pl-3 pr-2 shadow-[var(--sh-2)] backdrop-blur-md sm:gap-3 sm:pl-5"
    >
      <Link
        href={pathForLang('/', locale)}
        className="flex shrink-0 items-center gap-2.5 font-serif-sc text-lg font-black leading-none text-ink sm:mr-4 sm:text-xl"
      >
        <span>{BRAND[locale]}</span>
        <span className="hidden gap-[3px] sm:flex" aria-hidden="true">
          {DOTS.map((c) => (
            <i key={c} className="h-[7px] w-[7px] rounded-full" style={{ background: c }} />
          ))}
        </span>
      </Link>
      <div className="flex min-w-0 flex-1 items-center justify-start gap-2 sm:gap-3">
        <SiteNav locale={locale} />
        {/* 语言切换固定在工具行之外，移动端横向滚动时仍始终可见 */}
        <LangSwitcher locale={locale} className="shrink-0 whitespace-nowrap text-ink/40 transition-colors hover:text-ink" />
        {email ? (
          <div ref={menuRef} className="relative shrink-0">
            <button
              type="button"
              onClick={() => setOpen((v) => !v)}
              aria-haspopup="menu"
              aria-expanded={open}
              className="flex items-center gap-1.5 whitespace-nowrap rounded-full border border-ink/10 bg-white px-3 py-1.5 text-[13px] font-medium text-ink/70 transition-colors hover:border-ink/25 hover:text-ink sm:text-[15px]"
            >
              {ACCOUNT_BUTTON[locale]}
              <svg
                viewBox="0 0 12 8"
                aria-hidden="true"
                className={`h-[7px] w-[11px] transition-transform ${open ? 'rotate-180' : ''}`}
              >
                <path d="M1 1.5 6 6.5l5-5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
            <div
              role="menu"
              className={
                open
                  ? 'absolute right-0 top-full z-50 mt-2 w-[212px] rounded-2xl border border-ink/10 bg-white py-1.5 shadow-[var(--sh-3)]'
                  : 'hidden'
              }
            >
              <p className="truncate border-b border-ink/10 px-3.5 pb-2.5 text-[12px] text-ink/40">
                {email}
              </p>
              {accountItems.map((item) => (
                <Link
                  key={item.path}
                  href={hrefFor(item, locale)}
                  onClick={() => setOpen(false)}
                  className="block px-3.5 py-2 text-[14px] text-ink/70 transition-colors hover:bg-ink/5 hover:text-ink"
                >
                  {item.label[locale]}
                </Link>
              ))}
              <div className="my-1 h-px bg-ink/10" />
              <button
                type="button"
                onClick={handleLogout}
                className="block w-full px-3.5 py-2 text-left text-[14px] text-ink/50 transition-colors hover:bg-ink/5 hover:text-ink"
              >
                {SIGN_OUT_LABEL[locale]}
              </button>
            </div>
          </div>
        ) : (
          <Link
            href={pathForLang('/auth', locale)}
            className="shrink-0 rounded-full bg-ink px-3.5 py-2 text-[13px] font-bold text-white transition hover:brightness-110 sm:px-5 sm:text-[15px]"
          >
            {AUTH_LABEL[locale]}
          </Link>
        )}
      </div>
    </nav>
  )
}
