import { NextRequest, NextResponse } from 'next/server'
import { signPayload, validatePayload, SHARE_TTL_SEC, shareSecretReady, SHARE_SECRET_ENV } from '@/lib/hemunShare'

// 生成合婚分享令牌。payload 由客户端从结果里抽取，但服务端严格校验：
// 只允许 模式/日支/日主/配偶星透干 四类字段，越界即拒。
export async function POST(request: NextRequest) {
  try {
    if (!shareSecretReady()) {
      console.error(`[hemun-share] 签发失败：未配置 ${SHARE_SECRET_ENV}`)
      return NextResponse.json({ error: `未配置 ${SHARE_SECRET_ENV}，分享链接不可用` }, { status: 500 })
    }
    const body = await request.json()
    const payload = validatePayload(body?.payload)
    if (!payload) return NextResponse.json({ error: '分享内容不合法' }, { status: 400 })
    const exp = Math.floor(Date.now() / 1000) + SHARE_TTL_SEC
    const d = Buffer.from(JSON.stringify(payload), 'utf8').toString('base64url')
    return NextResponse.json({ ok: true, d, exp, sig: signPayload(d, exp) })
  } catch (e) {
    console.error('合婚分享令牌生成失败:', e)
    return NextResponse.json({ error: '生成失败' }, { status: 500 })
  }
}
