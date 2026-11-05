'use client'

// Cloudflare Turnstile 人机验证（B 层防恶意注册：配合 Supabase Captcha protection）
// 设计要点：
//  - NEXT_PUBLIC_TURNSTILE_SITE_KEY 未配置 → 渲染 null，登录/注册/找回行为与从前完全一致（本地开发零影响）
//  - 与 Supabase 后台「Attack Protection → Captcha protection」的开关强耦合：
//    后台一旦开启，所有 auth 请求都必须带 captchaToken——两端必须同步切换（先发代码、再开后台）
//  - Turnstile token 一次性：resetKey 变化即整只重渲染，供提交失败后重试时取新 token
//  - 失败按【原因】区分（2026-11-05 线上「Success! 与失败提示同屏」修复）：
//      load      —— 挑战脚本 api.js 没加载下来（广告拦截/网络/插件）
//      challenge —— widget 报错回调，带 Cloudflare 错误码（可能是挑战请求被阻断、域名/sitekey 不匹配等）
//      timeout   —— widget 连 iframe 都没建出来（挑战请求 0 响应），旧版会一直空白、按钮永久禁用
//    ★ 任何失败都必须把出错的 widget 移除并清空容器：Cloudflare 在令牌签发后仍可能因自动刷新/
//      挑战请求失败再触发 error-callback，若只置页面错误态而不清 widget，会出现「左边绿色 Success!
//      右边红色失败提示」的自相矛盾界面（本文件曾如此）。
//  - secret key 只填在 Supabase 后台，绝不进代码库
import { useEffect, useRef } from 'react'

const SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY
// 挑战 iframe 迟迟建不出来（请求被阻断）时的兜底时限；只在容器里没有 iframe 时判超时，
// 这样用户在复选框上慢慢操作不会被误判。
const RENDER_TIMEOUT_MS = 12000

export type TurnstileFailure = {
  kind: 'load' | 'challenge' | 'timeout'
  code?: string
}

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

export default function Turnstile({
  onToken,
  resetKey,
  onError,
  ariaLabel = '人机验证',
}: {
  onToken: (t: string | null) => void
  resetKey: number
  onError?: (failure: TurnstileFailure) => void
  ariaLabel?: string
}) {
  const holderRef = useRef<HTMLDivElement | null>(null)
  const widgetIdRef = useRef<string | null>(null)
  const onTokenRef = useRef(onToken)
  onTokenRef.current = onToken
  const onErrorRef = useRef(onError)
  onErrorRef.current = onError

  // resetKey 变化 = 重试：清旧 widget（连残留 iframe 一起清）→ 重新加载脚本（若上次失败）→ 重新渲染
  useEffect(() => {
    if (!SITE_KEY || !holderRef.current) return
    let cancelled = false
    let timer: ReturnType<typeof setTimeout> | null = null

    const clearTimer = () => {
      if (timer) {
        clearTimeout(timer)
        timer = null
      }
    }
    // ★ 移除当前 widget + 清空容器：remove() 失败（或 Cloudflare 内部刷新过 iframe）会留下旧实例，
    //   下一次 render() 再追加一只，就会出现两枚 widget 并排（一枚 Success、一枚 Error）
    const detach = () => {
      if (widgetIdRef.current && window.turnstile) {
        try { window.turnstile.remove(widgetIdRef.current) } catch { /* 已被移除 */ }
        widgetIdRef.current = null
      }
      if (holderRef.current) holderRef.current.replaceChildren()
    }

    onTokenRef.current(null)
    detach()
    clearTimer()

    // 兜底：挑战请求被网络/插件阻断时（实测 challenges.cloudflare.com 请求 0 响应），
    // render() 既不回调也不报错，widget 永远空白、按钮永远禁用 → 超时给出可重试的提示。
    // 容器里已有 iframe 说明 widget 已正常渲染（可能正等用户勾选），不判超时。
    // ★ 计时从 useEffect 起就开始：api.js 请求挂死（onload/onerror 都不触发）时也能兜底。
    timer = setTimeout(() => {
      if (cancelled) return
      if (holderRef.current?.querySelector('iframe')) return
      detach()
      onTokenRef.current(null)
      if (!window.turnstile) {
        // 脚本本身没下来：清缓存，重试时重新插入 script
        scriptLoading = null
        onErrorRef.current?.({ kind: 'load' })
      } else {
        onErrorRef.current?.({ kind: 'timeout' })
      }
    }, RENDER_TIMEOUT_MS)

    loadTurnstile()
      .then(() => {
        if (cancelled || !holderRef.current || !window.turnstile) return
        try {
          widgetIdRef.current = window.turnstile.render(holderRef.current, {
            sitekey: SITE_KEY,
            language: 'zh-cn',
            callback: (token: string) => {
              if (cancelled) return
              clearTimer()
              onTokenRef.current(token)
            },
            'expired-callback': () => {
              if (cancelled) return
              onTokenRef.current(null)
            },
            'error-callback': (code?: string) => {
              if (cancelled) return
              clearTimer()
              onTokenRef.current(null)
              // ★ 出错即收掉 widget：否则它可能仍显示上一枚令牌的绿色 Success，和页面错误提示同屏
              detach()
              onErrorRef.current?.({ kind: 'challenge', code: code == null ? undefined : String(code) })
            },
          })
        } catch {
          // 同一容器重复 render 等异常：收掉残留后再交给页面提示重试
          clearTimer()
          detach()
          onTokenRef.current(null)
          onErrorRef.current?.({ kind: 'load' })
        }
      })
      .catch(() => {
        // 脚本加载失败（被浏览器拦截/网络问题）：保持无 token——按钮保持禁用不放行
        // （Supabase 端强制校验 captcha，放行只会得到更莫名的报错），通知页面显示指引
        if (cancelled) return
        onTokenRef.current(null)
        onErrorRef.current?.({ kind: 'load' })
      })

    return () => {
      cancelled = true
      clearTimer()
      detach()
    }
  }, [resetKey])

  if (!SITE_KEY) return null
  return <div ref={holderRef} className="flex justify-center" aria-label={ariaLabel} />
}
