'use client'

// Cloudflare Turnstile 人机验证（B 层防恶意注册：配合 Supabase Captcha protection）
// 设计要点：
//  - NEXT_PUBLIC_TURNSTILE_SITE_KEY 未配置 → 渲染 null，登录/注册/找回行为与从前完全一致（本地开发零影响）
//  - 与 Supabase 后台「Attack Protection → Captcha protection」的开关强耦合：
//    后台一旦开启，所有 auth 请求都必须带 captchaToken——两端必须同步切换（先发代码、再开后台）
//  - Turnstile token 一次性：resetKey 变化即 reset，供提交失败后重试时取新 token
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
    s.onerror = () => reject(new Error('turnstile script failed to load'))
    document.head.appendChild(s)
  })
  return scriptLoading
}

export default function Turnstile({ onToken, resetKey }: { onToken: (t: string | null) => void; resetKey: number }) {
  const holderRef = useRef<HTMLDivElement | null>(null)
  const widgetIdRef = useRef<string | null>(null)
  const onTokenRef = useRef(onToken)
  onTokenRef.current = onToken

  useEffect(() => {
    if (!SITE_KEY || !holderRef.current) return
    let cancelled = false
    loadTurnstile()
      .then(() => {
        if (cancelled || !holderRef.current || !window.turnstile) return
        widgetIdRef.current = window.turnstile.render(holderRef.current, {
          sitekey: SITE_KEY,
          language: 'zh-cn',
          callback: (token: string) => onTokenRef.current(token),
          'expired-callback': () => onTokenRef.current(null),
          'error-callback': () => onTokenRef.current(null),
        })
      })
      .catch(() => {
        // 脚本加载失败：保持无 token（提交按钮保持禁用），不做降级放行
      })
    return () => {
      cancelled = true
      if (widgetIdRef.current && window.turnstile) {
        try { window.turnstile.remove(widgetIdRef.current) } catch { /* 已被移除 */ }
        widgetIdRef.current = null
      }
    }
  }, [])

  useEffect(() => {
    if (widgetIdRef.current && window.turnstile) {
      onTokenRef.current(null)
      try { window.turnstile.reset(widgetIdRef.current) } catch { /* 尚未渲染完成 */ }
    }
  }, [resetKey])

  if (!SITE_KEY) return null
  return <div ref={holderRef} className="flex justify-center" aria-label="人机验证" />
}
