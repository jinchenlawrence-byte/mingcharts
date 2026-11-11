'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { getAuthToken } from '@/lib/authToken'

export interface ReportActionLabels {
  back: string
  share: string
  export: string
  copied: string
  shareTitle: string
}

/**
 * 报告页右上操作区：返回列表 / 分享 / 导出 PDF。
 * 分享优先调用系统分享面板，不支持时复制当前链接；导出走浏览器打印（可另存为 PDF）。
 */
export default function ReportActions({ backHref, labels, reportId }: {
  backHref: string
  labels: ReportActionLabels
  /** 有值时向服务端换取签名分享链接；接收者无需登录即可看试读层 */
  reportId?: string
}) {
  const [copied, setCopied] = useState(false)

  // 打印前展开所有折叠的「依据」，打印结束后还原（避免 PDF 里丢内容）
  useEffect(() => {
    const opened: HTMLDetailsElement[] = []
    const expand = () => {
      opened.length = 0
      document.querySelectorAll<HTMLDetailsElement>('details:not([open])').forEach((el) => {
        el.open = true
        opened.push(el)
      })
    }
    const restore = () => {
      opened.forEach((el) => { el.open = false })
      opened.length = 0
    }
    // Chrome / Edge / Firefox 走 beforeprint；Safari 只触发 matchMedia('print')
    const mq = window.matchMedia('print')
    const onMq = (e: MediaQueryListEvent) => (e.matches ? expand() : restore())
    window.addEventListener('beforeprint', expand)
    window.addEventListener('afterprint', restore)
    mq.addEventListener('change', onMq)
    return () => {
      window.removeEventListener('beforeprint', expand)
      window.removeEventListener('afterprint', restore)
      mq.removeEventListener('change', onMq)
    }
  }, [])

  async function share() {
    let url = window.location.href
    // ★ 2026-11-11：原实现直接复制当前 URL，而报告页登录后才渲染，
    //   接收者只会看到「请先登录后查看报告」。改为向服务端换取带 exp + 签名的只读链接。
    if (reportId) {
      try {
        const token = await getAuthToken()
        if (token) {
          const r = await fetch('/api/reports/share', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ token, id: reportId }),
          })
          const j = await r.json()
          if (j?.ok) {
            url = `${window.location.origin}${window.location.pathname}?s=${j.sig}&e=${j.exp}`
          }
        }
      } catch {
        // 换取失败就退回原链接，不阻断分享动作
      }
    }
    try {
      if (typeof navigator.share === 'function') {
        await navigator.share({ title: labels.shareTitle, url })
        return
      }
      await navigator.clipboard.writeText(url)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 2000)
    } catch {
      // 用户取消分享或剪贴板被拒时不打断阅读
    }
  }

  return (
    <div className="hw-report-actions hw-print-hide">
      <Link href={backHref}>{labels.back}</Link>
      <button type="button" onClick={share}>{copied ? labels.copied : labels.share}</button>
      <button type="button" onClick={() => window.print()}>{labels.export}</button>
    </div>
  )
}
