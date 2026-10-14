'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { getSupabase } from '@/lib/supabase'

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

  return (
    <nav className="bg-paper/80 backdrop-blur-md border-b border-gold/15 sticky top-0 z-40">
      <div className="container mx-auto px-4 h-14 flex items-center justify-between">
        <Link href="/" className="text-lg font-serif-sc font-bold text-ink flex items-center gap-2">
          <span className="text-cinnabar text-2xl leading-none">明</span>
          <span>理</span>
        </Link>
        <div className="flex items-center gap-3 sm:gap-4 text-sm">
          <Link href="/" className="text-ink/70 hover:text-cinnabar transition-colors">
            排盘
          </Link>
          <Link href="/daily" className="text-ink/70 hover:text-cinnabar transition-colors">
            每日日签
          </Link>
          <Link href="/hemun" className="text-ink/70 hover:text-cinnabar transition-colors">
            合婚配对
          </Link>
          <Link href="/ziwei" className="text-ink/70 hover:text-cinnabar transition-colors">
            紫微斗数
          </Link>
          <Link href="/liunian" className="text-ink/70 hover:text-cinnabar transition-colors hidden sm:inline">
            年运报告
          </Link>
          <Link href="/geo" className="text-ink/70 hover:text-cinnabar transition-colors hidden sm:inline">
            方位城市
          </Link>
          <Link href="/bazi" className="text-ink/70 hover:text-cinnabar transition-colors hidden sm:inline">
            出生日期
          </Link>
          <Link href="/shengxiao" className="text-ink/70 hover:text-cinnabar transition-colors hidden sm:inline">
            生肖运势
          </Link>
          <Link href="/article" className="text-ink/70 hover:text-cinnabar transition-colors">
            命理知识
          </Link>
          <Link href="/pricing" className="text-ink/70 hover:text-cinnabar transition-colors">
            定价
          </Link>
          {email ? (
            <>
              <Link href="/charts" className="text-ink/70 hover:text-cinnabar transition-colors">
                我的命盘
              </Link>
              <Link href="/reports" className="text-ink/70 hover:text-cinnabar transition-colors">
                我的报告
              </Link>
              <Link href="/account" className="text-ink/70 hover:text-cinnabar transition-colors">
                账号设置
              </Link>
              <span className="text-ink/40 max-w-[160px] truncate hidden sm:inline">
                {email}
              </span>
              <button
                onClick={handleLogout}
                className="text-ink/50 hover:text-cinnabar transition-colors"
              >
                退出
              </button>
            </>
          ) : (
            <Link href="/auth" className="seal-btn px-4 py-1.5 rounded-md text-white transition">
              登录 / 注册
            </Link>
          )}
        </div>
      </div>
    </nav>
  )
}
