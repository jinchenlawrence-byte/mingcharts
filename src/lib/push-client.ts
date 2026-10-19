'use client'

// Web Push 客户端助手（浏览器端）。
// ★ 只引用 NEXT_PUBLIC_VAPID_PUBLIC_KEY（公钥，公开无害）；私钥/CRON_SECRET 绝不进客户端。
// ★ 权限申请必须由【用户手势】触发（on-mount 申请会被 Safari 拒绝）。
import { getSupabase } from '@/lib/supabase'

export interface PushPayloadKeys {
  p256dh: string
  auth: string
}

/** VAPID 公钥（base64url）→ Uint8Array（65 字节，首字节 0x04） */
export function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const raw = atob(base64)
  const out = new Uint8Array(raw.length)
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i)
  return out
}

/** 浏览器是否具备 Web Push 能力 */
export function pushSupported(): boolean {
  return (
    typeof window !== 'undefined' &&
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    'Notification' in window
  )
}

/** iOS/iPadOS 判定（含 iPadOS 13+ 伪装成 Mac 的触屏设备） */
export function isIOS(): boolean {
  if (typeof navigator === 'undefined') return false
  const ua = navigator.userAgent
  const iPadOS = /Macintosh/.test(ua) && typeof document !== 'undefined' && 'ontouchend' in document
  return /iPhone|iPad|iPod/.test(ua) || iPadOS
}

/** 是否已「添加到主屏幕」以独立模式运行 */
export function isStandalone(): boolean {
  if (typeof window === 'undefined') return false
  const mm = window.matchMedia?.('(display-mode: standalone)')
  return Boolean((navigator as unknown as { standalone?: boolean }).standalone) || Boolean(mm?.matches)
}

/**
 * iOS 需先加主屏才能收推送：iOS 浏览器标签页里没有 pushManager。
 * 返回 true ⇒ 界面必须如实引导「先添加到主屏幕」，绝不假装可订阅。
 */
export function needsAddToHomeScreen(): boolean {
  if (!isIOS()) return false
  return !isStandalone()
}

async function accessToken(): Promise<string | null> {
  const { data: { session } } = await getSupabase().auth.getSession()
  return session?.access_token ?? null
}

/** 当前设备的 PushSubscription（未订阅 → null） */
export async function currentSubscription(): Promise<PushSubscription | null> {
  if (!pushSupported()) return null
  const reg = await navigator.serviceWorker.ready
  return reg.pushManager.getSubscription()
}

/** 订阅并上报服务端（必须由用户手势调用） */
export async function subscribe(): Promise<{ ok: boolean; error?: string }> {
  if (!pushSupported()) return { ok: false, error: '当前浏览器不支持通知' }
  if (needsAddToHomeScreen()) return { ok: false, error: 'iPhone / iPad 需先「添加到主屏幕」再开启' }

  const vapid = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
  if (!vapid) return { ok: false, error: '推送服务未配置' }

  const perm = await Notification.requestPermission()
  if (perm !== 'granted') return { ok: false, error: '未获得通知权限' }

  const token = await accessToken()
  if (!token) return { ok: false, error: '请先登录' }

  const reg = await navigator.serviceWorker.ready
  const sub = await reg.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(vapid) as BufferSource,
  })

  const res = await fetch('/api/push/subscribe', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ subscription: sub.toJSON() }),
  })
  if (!res.ok) {
    await sub.unsubscribe().catch(() => {})
    const j = await res.json().catch(() => null)
    return { ok: false, error: j?.error || '订阅登记失败' }
  }
  return { ok: true }
}

/** 退订并从服务端停用 */
export async function unsubscribe(): Promise<{ ok: boolean; error?: string }> {
  if (!pushSupported()) return { ok: false, error: '当前浏览器不支持通知' }
  const token = await accessToken()
  if (!token) return { ok: false, error: '请先登录' }

  const sub = await currentSubscription()
  if (!sub) return { ok: true }

  const endpoint = sub.endpoint
  await sub.unsubscribe().catch(() => {})

  const res = await fetch('/api/push/subscribe', {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ endpoint }),
  })
  if (!res.ok) return { ok: false, error: '退订登记失败' }
  return { ok: true }
}
