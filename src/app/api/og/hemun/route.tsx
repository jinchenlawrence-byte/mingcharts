import { NextRequest } from 'next/server'
import { ImageResponse } from 'next/og'
import { verifyPayload, shareRows } from '@/lib/hemunShare'

export const runtime = 'nodejs'
export const revalidate = 3600

// OG 图：1200×630，内容即分享卡本身，不透露生日。
// 中文字形由 public/fonts/hemun-og.woff（Noto Sans SC 子集，OFL）提供。
export async function GET(request: NextRequest) {
  const sp = request.nextUrl.searchParams
  const check = verifyPayload(sp.get('d') ?? '', Number(sp.get('e')), sp.get('s') ?? '')
  if (!check.ok || !check.payload) {
    return new Response(check.reason ?? 'invalid', { status: 400 })
  }
  const p = check.payload
  const rows = shareRows(p)

  const font = await fetch(new URL('/fonts/hemun-og.woff', request.url), { cache: 'force-cache' })
    .then(r => r.arrayBuffer())

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%', height: '100%', display: 'flex', flexDirection: 'column',
          justifyContent: 'space-between', padding: '64px 72px',
          background: 'linear-gradient(135deg, #14110F 0%, #221C16 55%, #2C231A 100%)',
          color: '#F5EFE4', fontFamily: 'Noto',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ fontSize: 30, letterSpacing: 6, color: '#C9A96A' }}>合婚分享卡</div>
          <div style={{ fontSize: 24, color: '#9C8E7A' }}>{p.m === '3' ? '三柱合婚摘要' : '四柱合婚摘要'}</div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 26 }}>
          {[
            { k: '夫妻宫', v: rows.spouse },
            { k: '双方日干', v: rows.gan },
            { k: '配偶星', v: rows.star },
          ].map(r => (
            <div key={r.k} style={{ display: 'flex', alignItems: 'baseline', gap: 28, borderBottom: '1px solid #3A3025', paddingBottom: 16 }}>
              <div style={{ fontSize: 28, color: '#9C8E7A', width: 150 }}>{r.k}</div>
              <div style={{ fontSize: 44, color: '#F5EFE4' }}>{r.v}</div>
            </div>
          ))}
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ fontSize: 22, color: '#9C8E7A' }}>只含日支与日主，不含出生信息</div>
          <div style={{ fontSize: 24, color: '#C9A96A' }}>mingcharts.com 明理</div>
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
      fonts: [{ name: 'Noto', data: font, weight: 700, style: 'normal' }],
    }
  )
}
