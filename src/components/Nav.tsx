'use client'

// ★ 全局导航（2026-10-16 首页新版设计同步重塑：胶囊式悬浮导航）
// 设计稿：docs/design/mingcharts-home-v2.html（设计师初稿 + v2 完善）
// 纪律：链接清单与登录态逻辑不变；test-account-auth.mjs ③ 断言
//   · href="/account" ≥ 1 且所在行不得含 hidden（移动端可点）
//   · 全部站内 href 必须是真实路由（test-site-audit.mjs ③ 静态检查）
import { useEffect, useState } from 'react'
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

  const handleLogout = async () => {
    await getSupabase().auth.signOut()
    router.push('/')
  }

  const linkCls = (hide?: 'md' | 'lg') =>
    `text-ink/60 transition-colors hover:text-ink${
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
      <div className="flex items-center gap-3 text-[13px] sm:gap-4 sm:text-[15px]">
        {NAV_LINKS.map((l) => (
          <Link key={l.href} href={l.href} className={linkCls(l.hide)}>
            {l.label}
          </Link>
        ))}
        {email ? (
          <>
            <Link href="/charts" className={linkCls('md')}>
              我的命盘
            </Link>
            <Link href="/reports" className={linkCls('md')}>
              我的报告
            </Link>
            <Link href="/account" className="text-ink/60 transition-colors hover:text-ink">
              账号设置
            </Link>
            <span className="max-w-[160px] truncate text-ink/40 hidden sm:inline">
              {email}
            </span>
            <button
              onClick={handleLogout}
              className="text-ink/50 transition-colors hover:text-ink"
            >
              退出
            </button>
          </>
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
