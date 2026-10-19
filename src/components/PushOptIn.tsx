'use client'

// 每日提醒开关（Web Push 授权）。
//   ★ 四态如实呈现，绝不「开关开着但收不到」误导用户：
//     guest      —— 未登录：先登录
//     unsupported—— 浏览器不支持（如国内 Android 浏览器依赖 FCM，基本收不到）
//     ios-install—— iPhone/iPad 未加主屏幕：先添加到主屏幕（iOS 16.4+ 仅主屏 PWA 可收）
//     off / on   —— 可开启 / 已开启
//   权限申请由按钮 onClick（用户手势）触发 —— on-mount 申请会被 Safari 直接拒绝。
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { getSupabase } from '@/lib/supabase'
import {
  pushSupported,
  needsAddToHomeScreen,
  currentSubscription,
  subscribe,
  unsubscribe,
} from '@/lib/push-client'

type State = 'loading' | 'guest' | 'unsupported' | 'ios-install' | 'off' | 'on'

export default function PushOptIn() {
  const [state, setState] = useState<State>('loading')
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState('')

  useEffect(() => {
    ;(async () => {
      try {
        const { data: { session } } = await getSupabase().auth.getSession()
        if (!session) {
          setState('guest')
          return
        }
        if (!pushSupported()) {
          setState('unsupported')
          return
        }
        if (needsAddToHomeScreen()) {
          setState('ios-install')
          return
        }
        const sub = await currentSubscription()
        setState(sub ? 'on' : 'off')
      } catch {
        setState('unsupported')
      }
    })()
  }, [])

  if (state === 'loading') return null

  const enable = async () => {
    setBusy(true)
    setMsg('')
    try {
      const r = await subscribe()
      if (r.ok) {
        setState('on')
        setMsg('已开启，每天日运更新时会收到提醒。')
      } else {
        setMsg(r.error || '开启失败')
      }
    } finally {
      setBusy(false)
    }
  }

  const disable = async () => {
    setBusy(true)
    setMsg('')
    try {
      const r = await unsubscribe()
      if (r.ok) {
        setState('off')
        setMsg('已关闭每日提醒。')
      } else {
        setMsg(r.error || '关闭失败')
      }
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="hw-c-box">
      <h2 className="font-bold text-ink mb-1">每日日运提醒</h2>

      {state === 'guest' && (
        <p className="text-sm text-ink/70 mt-1">
          登录后可开启每日提醒，日运更新时在手机上收到通知。
          <Link href="/auth" className="hw-c-blue ml-2 hover:brightness-110">去登录 →</Link>
        </p>
      )}

      {state === 'unsupported' && (
        <p className="text-sm text-ink/70 mt-1">
          当前浏览器不支持网页通知，无法开启每日提醒。可改用 iPhone 的 Safari、或桌面 Chrome 打开本站并「添加到主屏幕」后再开启。
        </p>
      )}

      {state === 'ios-install' && (
        <>
          <p className="text-sm text-ink/70 mt-1">
            在 iPhone / iPad 上，需先把这个站点「添加到主屏幕」，再从主屏幕打开后才能收到通知（iOS 16.4 以上）。
          </p>
          <p className="text-xs text-ink-light/70 mt-2">
            操作：用 Safari 打开本页 → 点底部「分享」→「添加到主屏幕」→ 从主屏幕图标打开本页 → 回到这里开启提醒。
          </p>
        </>
      )}

      {state === 'off' && (
        <>
          <p className="text-sm text-ink/70 mt-1">开启后，每天日运更新时会在你的设备上弹出提醒。</p>
          <button
            onClick={enable}
            disabled={busy}
            className="mt-3 rounded-full bg-ink px-4 py-2 text-sm font-bold text-white transition hover:brightness-110 disabled:opacity-60"
          >
            {busy ? '处理中…' : '开启每日提醒'}
          </button>
        </>
      )}

      {state === 'on' && (
        <>
          <p className="text-sm text-ink/70 mt-1">已开启：每天日运更新时会收到提醒。</p>
          <button
            onClick={disable}
            disabled={busy}
            className="mt-3 rounded-full border border-[#dedcf0] px-4 py-2 text-sm font-semibold text-ink transition hover:bg-paper-dark/40 disabled:opacity-60"
          >
            {busy ? '处理中…' : '关闭提醒'}
          </button>
        </>
      )}

      {msg && <p className="text-xs mt-3 text-ink-light">{msg}</p>}
    </section>
  )
}
