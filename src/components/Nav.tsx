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
    <nav className="bg-white/80 backdrop-blur border-b border-amber-100 sticky top-0 z-40">
      <div className="container mx-auto px-4 h-14 flex items-center justify-between">
        <Link href="/" className="text-lg font-bold text-amber-900">
          八字命理
        </Link>
        <div className="flex items-center gap-3 sm:gap-4 text-sm">
          <Link href="/" className="text-gray-700 hover:text-amber-700">
            排盘
          </Link>
          <Link href="/daily" className="text-gray-700 hover:text-amber-700">
            每日日签
          </Link>
          <Link href="/hemun" className="text-gray-700 hover:text-amber-700">
            合婚配对
          </Link>
          <Link href="/ziwei" className="text-gray-700 hover:text-amber-700">
            紫微斗数
          </Link>
          <Link href="/liunian" className="text-gray-700 hover:text-amber-700 hidden sm:inline">
            年运报告
          </Link>
          <Link href="/geo" className="text-gray-700 hover:text-amber-700 hidden sm:inline">
            方位城市
          </Link>
          <Link href="/bazi" className="text-gray-700 hover:text-amber-700 hidden sm:inline">
            出生日期
          </Link>
          <Link href="/shengxiao" className="text-gray-700 hover:text-amber-700 hidden sm:inline">
            生肖运势
          </Link>
          <Link href="/article" className="text-gray-700 hover:text-amber-700">
            命理知识
          </Link>
          <Link href="/pricing" className="text-gray-700 hover:text-amber-700">
            定价
          </Link>
          {email ? (
            <>
              <Link href="/charts" className="text-gray-700 hover:text-amber-700">
                我的命盘
              </Link>
              <Link href="/reports" className="text-gray-700 hover:text-amber-700">
                我的报告
              </Link>
              <span className="text-gray-400 max-w-[160px] truncate hidden sm:inline">
                {email}
              </span>
              <button
                onClick={handleLogout}
                className="text-gray-500 hover:text-amber-700"
              >
                退出
              </button>
            </>
          ) : (
            <Link href="/auth" className="bg-amber-600 text-white px-4 py-1.5 rounded-md hover:bg-amber-700 transition">
              登录 / 注册
            </Link>
          )}
        </div>
      </div>
    </nav>
  )
}
