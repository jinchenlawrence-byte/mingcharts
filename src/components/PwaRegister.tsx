'use client'

// PWA Service Worker 注册（挂 layout，全站生效）。
// 仅 https / localhost 注册（SW 要求安全上下文）；失败静默，不影响任何页面。
import { useEffect } from 'react'

export default function PwaRegister() {
  useEffect(() => {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return
    const https = location.protocol === 'https:'
    const local = location.hostname === 'localhost' || location.hostname === '127.0.0.1'
    if (!https && !local) return
    navigator.serviceWorker.register('/sw.js').catch(() => {
      // 静默：注册失败（如隐私模式）不影响站点功能
    })
  }, [])
  return null
}
