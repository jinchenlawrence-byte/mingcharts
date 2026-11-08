'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'

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
export default function ReportActions({ backHref, labels }: {
  backHref: string
  labels: ReportActionLabels
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
    const url = window.location.href
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
