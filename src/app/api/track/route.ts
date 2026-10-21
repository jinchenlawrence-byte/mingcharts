// 埋点上报接口（2026-10-21）：前端 sendBeacon 直接打这里，写入 events 表。
// ★ 安全口径：
//   · events 表开了 RLS 且【零策略】，只有 service_role 能写，客户端拿到 anon key 也写不进去；
//   · 本接口只接受白名单事件名 + 短标量 props，拒绝嵌套对象，避免被当作免费存储刷容量；
//   · 任何写库失败都返回 success（埋点不能影响主流程，也不能给攻击者反馈）。
import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabase } from '@/lib/supabase'

const ALLOWED = new Set(['page_view', 'paipan_submit', 'preview_view', 'pay_click'])

function clipString(value: unknown, max: number): string | undefined {
  return typeof value === 'string' ? value.slice(0, max) : undefined
}

export async function POST(req: NextRequest) {
  let body: any
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ success: false }, { status: 400 })
  }

  const name = clipString(body?.name, 40)
  const sid = clipString(body?.sid, 64)
  if (!name || !ALLOWED.has(name) || !sid) {
    return NextResponse.json({ success: false }, { status: 400 })
  }

  // props 只留短标量（最多 8 个键），字符串截断到 120 字符
  const props: Record<string, string | number | boolean> = {}
  const rawProps = body?.props
  if (rawProps && typeof rawProps === 'object' && !Array.isArray(rawProps)) {
    for (const [key, value] of Object.entries(rawProps).slice(0, 8)) {
      const k = key.slice(0, 32)
      if (typeof value === 'string') props[k] = value.slice(0, 120)
      else if (typeof value === 'number' && Number.isFinite(value)) props[k] = value
      else if (typeof value === 'boolean') props[k] = value
    }
  }

  try {
    const supabase = createServerSupabase()
    await supabase.from('events').insert({
      sid,
      name,
      path: clipString(body?.path, 200) ?? null,
      // 首次触达归因（会话内固定），由前端计算后随事件上送
      utm_source: clipString(body?.utm?.source, 80) || null,
      utm_medium: clipString(body?.utm?.medium, 80) || null,
      utm_campaign: clipString(body?.utm?.campaign, 120) || null,
      referrer: clipString(body?.referrer, 300) || null,
      props,
    })
  } catch {
    // 静默：表未创建、网络失败等都不向调用方报错
  }

  return NextResponse.json({ success: true })
}
