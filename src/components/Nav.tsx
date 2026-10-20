'use client'

// ★ 全局导航（2026-10-16 首页新版设计同步重塑：胶囊式悬浮导航）
// 设计稿：docs/design/mingcharts-home-v2.html（设计师初稿 + v2 完善）
// 纪律：链接清单与登录态逻辑不变；test-account-auth.mjs ③ 断言
//   · href="/account" ≥ 1 且所在行不得含 hidden（移动端可点）
//   · 全部站内 href 必须是真实路由（test-site-audit.mjs ③ 静态检查）
import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { getSupabase } from '@/lib/supabase'

// 五行点 · 品牌标识（木火土金水）
const DOTS = ['#3CC796', '#FF6B5B', '#F6C24F', '#D6DBE6', '#3A66FF']

const NAV_LINKS: { href: string; label: string; hide?: 'md' | 'lg' }[] = [
  { href: '/', label: '排盘' },
  { href: '/daily', label: '每日日签' },
  { href: '/hemun', label: '合婚配对' },
  { href: '/ziwei', label: '紫微斗数', hide: 'md' },
  { href: '/liunian', label: '年运报告', hide: 'lg' },
  { href: '/geo', label: '方位城市', hide: 'lg' },
  { href: '/bazi', label: '出生日期', hide: 'lg' },
  { href: '/shengxiao', label: '生肖运势', hide: 'lg' },
  { href: '/article', label: '命理知识', hide: 'md' },
  { href: '/pricing', label: '定价' },
]

export default function Nav() {
  const router = useRouter()
  const [email, setEmail] = useState<string | null>(null)
  // ★ 账号下拉开合（2026-10-20）：已登录的账号入口收成一个菜单，腾出顶栏横向空间
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

  // ★ 点菜单外部 / 按 Esc 自动收起（防菜单"粘住"）
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

  const linkCls = (hide?: 'md' | 'lg') =>
    `whitespace-nowrap text-ink/60 transition-colors hover:text-ink${
      hide === 'md' ? ' hidden md:inline' : hide === 'lg' ? ' hidden lg:inline' : ''
    }`

  return (
    <nav
      aria-label="主导航"
      className="sticky top-3 z-50 mx-auto mt-4 flex w-[calc(100%-2rem)] max-w-[1080px] items-center justify-between gap-2 rounded-full border border-ink/10 bg-white/90 py-2 pl-5 pr-2 shadow-[0_8px_28px_-18px_rgba(27,24,56,0.35)] backdrop-blur-md sm:gap-3"
    >
      <Link href="/" className="flex shrink-0 items-center gap-2.5 font-serif-sc text-xl font-black leading-none text-ink">
        <span>明理</span>
        <span className="flex gap-[3px]" aria-hidden="true">
          {DOTS.map((c) => (
            <i key={c} className="h-[7px] w-[7px] rounded-full" style={{ background: c }} />
          ))}
        </span>
      </Link>
      <div className="flex min-w-0 flex-1 items-center justify-end gap-2 sm:gap-3">
        <div className="flex min-w-0 items-center gap-3 overflow-x-auto text-[13px] [scrollbar-width:none] sm:gap-4 sm:text-[15px] [&::-webkit-scrollbar]:hidden">
          {NAV_LINKS.map((l) => (
            <Link key={l.href} href={l.href} className={linkCls(l.hide)}>
              {l.label}
            </Link>
          ))}
        </div>
        {/* ★ 已登录 → 账号下拉（2026-10-20）：把 6 个账号入口收成一个菜单。
            背景：顶栏 16 项需约 1300px，而宽度上限 1080px —— 平铺必然有项被挤出屏幕
            （用户两次实测：先「账号设置」被裁，钉住它之后「我的报告」又被裁）。
            收起后内容链接一个不动、文字全保留（用户偏好：不以省略文字换空间）。
            注意：菜单里的 /account 链接单独成行且不带 hidden 类（test-account-auth ③ 守护）。 */}
        {email ? (
          <div ref={menuRef} className="relative shrink-0">
            <button
              type="button"
              onClick={() => setOpen((v) => !v)}
              aria-haspopup="menu"
              aria-expanded={open}
              className="flex items-center gap-1.5 whitespace-nowrap rounded-full border border-ink/10 bg-white px-3 py-1.5 text-[13px] font-medium text-ink/70 transition-colors hover:border-ink/25 hover:text-ink sm:text-[15px]"
            >
              账号
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
                  ? 'absolute right-0 top-full z-50 mt-2 w-[212px] rounded-2xl border border-ink/10 bg-white py-1.5 shadow-[0_18px_44px_-20px_rgba(27,24,56,0.45)]'
                  : 'hidden'
              }
            >
              <p className="truncate border-b border-ink/10 px-3.5 pb-2.5 text-[12px] text-ink/40">
                {email}
              </p>
              <Link
                href="/member"
                onClick={() => setOpen(false)}
                className="block px-3.5 py-2 text-[14px] text-ink/70 transition-colors hover:bg-ink/5 hover:text-ink"
              >
                会员中心
              </Link>
              <Link
                href="/charts"
                onClick={() => setOpen(false)}
                className="block px-3.5 py-2 text-[14px] text-ink/70 transition-colors hover:bg-ink/5 hover:text-ink"
              >
                我的命盘
              </Link>
              <Link
                href="/reports"
                onClick={() => setOpen(false)}
                className="block px-3.5 py-2 text-[14px] text-ink/70 transition-colors hover:bg-ink/5 hover:text-ink"
              >
                我的报告
              </Link>
              <Link
                href="/account"
                onClick={() => setOpen(false)}
                className="block px-3.5 py-2 text-[14px] text-ink/70 transition-colors hover:bg-ink/5 hover:text-ink"
              >
                账号设置
              </Link>
              <div className="my-1 h-px bg-ink/10" />
              <button
                type="button"
                onClick={handleLogout}
                className="block w-full px-3.5 py-2 text-left text-[14px] text-ink/50 transition-colors hover:bg-ink/5 hover:text-ink"
              >
                退出登录
              </button>
            </div>
          </div>
        ) : (
          <Link
            href="/auth"
            className="shrink-0 rounded-full bg-ink px-3.5 py-2 text-[13px] font-bold text-white transition hover:brightness-110 sm:px-5 sm:text-[15px]"
          >
            登录 / 注册
          </Link>
        )}
      </div>
    </nav>
  )
}
