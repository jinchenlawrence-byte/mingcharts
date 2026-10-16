'use client'

// Cloudflare Turnstile 人机验证（B 层防恶意注册：配合 Supabase Captcha protection）
// 设计要点：
//  - NEXT_PUBLIC_TURNSTILE_SITE_KEY 未配置 → 渲染 null，登录/注册/找回行为与从前完全一致（本地开发零影响）
//  - 与 Supabase 后台「Attack Protection → Captcha protection」的开关强耦合：
//    后台一旦开启，所有 auth 请求都必须带 captchaToken——两端必须同步切换（先发代码、再开后台）
//  - Turnstile token 一次性：resetKey 变化即整只重渲染（含脚本重新加载），供提交失败后重试时取新 token
//  - 脚本被浏览器拦截/加载失败 → onError 通知页面给出中文指引＋重试入口
//    （2026-10-16：手机端脚本被拦后按钮静默禁用、无任何解释的锁死问题修复）
//  - secret key 只填在 Supabase 后台，绝不进代码库
import { useEffect, useRef } from 'react'

const SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY

declare global {
  interface Window {
    turnstile?: {
      render: (el: HTMLElement, opts: Record<string, unknown>) => string
      reset: (id?: string) => void
      remove: (id: string) => void
    }
  }
}

let scriptLoading: Promise<void> | null = null
function loadTurnstile(): Promise<void> {
  if (typeof window === 'undefined') return Promise.reject(new Error('no window'))
  if (window.turnstile) return Promise.resolve()
  if (scriptLoading) return scriptLoading
  scriptLoading = new Promise((resolve, reject) => {
    const s = document.createElement('script')
    s.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit'
    s.async = true
    s.onload = () => resolve()
    s.onerror = () => {
      // ★ 失败清缓存：否则 rejected promise 被永久缓存，之后重试只会立刻再失败
      scriptLoading = null
      reject(new Error('turnstile script failed to load'))
    }
    document.head.appendChild(s)
  })
  return scriptLoading
}

export default function Turnstile({ onToken, resetKey, onError }: { onToken: (t: string | null) => void; resetKey: number; onError?: () => void }) {
  const holderRef = useRef<HTMLDivElement | null>(null)
  const widgetIdRef = useRef<string | null>(null)
  const onTokenRef = useRef(onToken)
  onTokenRef.current = onToken
  const onErrorRef = useRef(onError)
  onErrorRef.current = onError

  // resetKey 变化 = 重试：清旧 widget → 重新加载脚本（若上次失败）→ 重新渲染
  useEffect(() => {
    if (!SITE_KEY || !holderRef.current) return
    let cancelled = false
    onTokenRef.current(null)
    loadTurnstile()
      .then(() => {
        if (cancelled || !holderRef.current || !window.turnstile) return
        widgetIdRef.current = window.turnstile.render(holderRef.current, {
          sitekey: SITE_KEY,
          language: 'zh-cn',
          callback: (token: string) => onTokenRef.current(token),
          'expired-callback': () => onTokenRef.current(null),
          'error-callback': () => {
            onTokenRef.current(null)
            onErrorRef.current?.()
          },
        })
      })
      .catch(() => {
        // 脚本加载失败（被浏览器拦截/网络问题）：保持无 token——按钮保持禁用不放行
        // （Supabase 端强制校验 captcha，放行只会得到更莫名的报错），通知页面显示指引
        if (cancelled) return
        onTokenRef.current(null)
        onErrorRef.current?.()
      })
    return () => {
      cancelled = true
      if (widgetIdRef.current && window.turnstile) {
        try { window.turnstile.remove(widgetIdRef.current) } catch { /* 已被移除 */ }
        widgetIdRef.current = null
      }
    }
  }, [resetKey])

  if (!SITE_KEY) return null
  return <div ref={holderRef} className="flex justify-center" aria-label="人机验证" />
}
