'use client'

import { useEffect, useState } from 'react'

// 分享页操作条：打印/存 PDF + 转发到 Line / WhatsApp + 复制链接。
//
// ★ 边界（第 35 轮，A 侧决定）：这里只放"分享这份报告本身"的动作，
//   **不放任何指向 mingcharts.com 消费端的入口**。
//   原因：分享页是伙伴交付给他客户的页面，`/partners` 落地页对伙伴的书面承诺是
//   「不在报告里放引导注册的广告」。在伙伴客户的报告上导流＝抢伙伴的客户，
//   一次就足以毁掉整条伙伴渠道。
//   → 所以本组件里只有：打印、转发（带当前链接）、复制链接。
//
// 隐私：转发文案只带「品牌 + 报告类型 + 链接」，**不带出生日期**（标题里有出生日期，
//   但这里不取它）—— 预览卡片可能会被再次转发，生日不该出现在里面。

interface Props {
  /** 伙伴品牌（可空）。文案优先用它，没有则用「明理」 */
  brandName?: string | null
  /** 报告类型的人类可读名（八字命书 / 合婚详批 / …） */
  kindLabel: string
  /** 本站 URL（服务端传入，避免客户端拿 location 造成首屏差异） */
  shareUrl: string
}

function shareText(brandName: string, kindLabel: string) {
  // 不带生辰、不带营销语：只说是谁出的、是什么报告
  return `${brandName} · ${kindLabel}`
}

export default function SharePrintBar({ brandName, kindLabel, shareUrl }: Props) {
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    if (!copied) return
    const t = setTimeout(() => setCopied(false), 2000)
    return () => clearTimeout(t)
  }, [copied])

  const brand = (brandName ?? '').trim() || '明理'
  const text = shareText(brand, kindLabel)
  const lineHref = `https://social-plugins.line.me/lineit/share?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(text)}`
  const waHref = `https://wa.me/?text=${encodeURIComponent(`${text}\n${shareUrl}`)}`

  async function copy() {
    try {
      await navigator.clipboard.writeText(shareUrl)
      setCopied(true)
    } catch {
      // 剪贴板被拒（非 https / 权限）时退回 execCommand
      const el = document.createElement('textarea')
      el.value = shareUrl
      document.body.appendChild(el)
      el.select()
      try {
        document.execCommand('copy')
        setCopied(true)
      } finally {
        document.body.removeChild(el)
      }
    }
  }

  return (
    <div className="hw-print-hide flex flex-wrap items-center gap-3 mb-6">
      <button
        type="button"
        onClick={() => window.print()}
        className="hw-c-btnBig cursor-pointer"
      >
        打印 / 存为 PDF
      </button>

      <a href={lineHref} target="_blank" rel="noopener noreferrer" className="hw-c-back">
        转发到 Line
      </a>
      <a href={waHref} target="_blank" rel="noopener noreferrer" className="hw-c-back">
        转发到 WhatsApp
      </a>
      <button type="button" onClick={copy} className="hw-c-back cursor-pointer">
        {copied ? '已复制 ✓' : '复制链接'}
      </button>

      <span className="text-xs text-ink-light/60">
        提示：打印对话框里选「另存为 PDF」即可得到文件版。
      </span>
    </div>
  )
}
