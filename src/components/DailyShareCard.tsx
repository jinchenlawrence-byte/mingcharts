'use client'

// 通用日签分享卡：纯前端 canvas 绘制＋导出 PNG，带产品标识（HANDOFF §4.3，免费获客层）。
import { useState } from 'react'

interface Props {
  dateLabel: string      // 如 2026年10月8日
  liuRi: string          // 壬子
  jiaziIndex: number     // 49
  sign: string
  disclaimer: string
  boundary: string       // 子时（23:00）起为次日
}

const W = 750
const H = 1000

/** 按字宽折行（中日韩逐字量） */
function wrapText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const lines: string[] = []
  let line = ''
  for (const ch of text) {
    if (ctx.measureText(line + ch).width > maxWidth && line) {
      lines.push(line)
      line = ch
    } else {
      line += ch
    }
  }
  if (line) lines.push(line)
  return lines
}

export default function DailyShareCard(props: Props) {
  const [imgUrl, setImgUrl] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const draw = () => {
    setBusy(true)
    try {
      const canvas = document.createElement('canvas')
      canvas.width = W
      canvas.height = H
      const ctx = canvas.getContext('2d')
      if (!ctx) throw new Error('canvas 不可用')

      // 背景：米白渐变 ＋ 边框
      const bg = ctx.createLinearGradient(0, 0, 0, H)
      bg.addColorStop(0, '#fffaf0')
      bg.addColorStop(1, '#fdf3e3')
      ctx.fillStyle = bg
      ctx.fillRect(0, 0, W, H)
      ctx.strokeStyle = '#d6a35c'
      ctx.lineWidth = 3
      ctx.strokeRect(24, 24, W - 48, H - 48)

      const center = W / 2

      // 顶部产品标识
      ctx.textAlign = 'center'
      ctx.fillStyle = '#92400e'
      ctx.font = '600 34px "Songti SC", "SimSun", serif'
      ctx.fillText('明理', center, 92)
      ctx.fillStyle = '#a16207'
      ctx.font = '22px "PingFang SC", "Microsoft YaHei", sans-serif'
      ctx.fillText('八字命理 · 每日日签', center, 132)

      // 日期 ＋ 干支
      ctx.fillStyle = '#78350f'
      ctx.font = '600 34px "Songti SC", "SimSun", serif'
      ctx.fillText(`${props.dateLabel} · ${props.liuRi}日`, center, 232)
      ctx.fillStyle = '#a16207'
      ctx.font = '24px "PingFang SC", "Microsoft YaHei", sans-serif'
      ctx.fillText(`六十甲子第 ${props.jiaziIndex} 位`, center, 278)

      // 分隔细线
      ctx.strokeStyle = '#e7c48d'
      ctx.lineWidth = 1
      ctx.beginPath()
      ctx.moveTo(center - 120, 316)
      ctx.lineTo(center + 120, 316)
      ctx.stroke()

      // 日签正文（逐字折行）
      ctx.fillStyle = '#3f2d1a'
      ctx.font = '38px "Songti SC", "SimSun", serif'
      const lines = wrapText(ctx, props.sign, W - 180)
      const lineHeight = 62
      const startY = 420 - ((lines.length - 1) * lineHeight) / 2
      lines.forEach((ln, i) => ctx.fillText(ln, center, startY + i * lineHeight))

      // 晚子时约定 ＋ 免责
      ctx.fillStyle = '#8a6d4b'
      ctx.font = '22px "PingFang SC", "Microsoft YaHei", sans-serif'
      ctx.fillText(`★ ${props.boundary}`, center, H - 196)
      ctx.fillStyle = '#a98c66'
      ctx.font = '20px "PingFang SC", "Microsoft YaHei", sans-serif'
      const discLines = wrapText(ctx, props.disclaimer, W - 200)
      discLines.forEach((ln, i) => ctx.fillText(ln, center, H - 148 + i * 30))

      // 底部标识
      ctx.fillStyle = '#92400e'
      ctx.font = '600 24px "Songti SC", "SimSun", serif'
      ctx.fillText('明理 mingcharts.com · 免费排盘', center, H - 64)

      setImgUrl(canvas.toDataURL('image/png'))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="mt-6 text-center">
      <button
        type="button"
        onClick={draw}
        disabled={busy}
        className="inline-block bg-amber-600 text-white px-6 py-2.5 rounded-full font-semibold hover:bg-amber-700 transition disabled:opacity-60"
      >
        {busy ? '绘制中…' : '生成分享图'}
      </button>
      {imgUrl && (
        <div className="mt-5">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={imgUrl}
            alt="每日日签分享卡"
            className="max-w-full sm:max-w-sm mx-auto rounded-lg shadow-lg border border-amber-100"
          />
          <a
            href={imgUrl}
            download={`日签-${props.liuRi}.png`}
            className="inline-block mt-3 text-sm text-ink/70 underline underline-offset-2"
          >
            下载图片
          </a>
        </div>
      )}
    </div>
  )
}
