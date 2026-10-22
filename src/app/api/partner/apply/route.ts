import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabase } from '@/lib/supabase'
import { normalizeApplication } from '@/lib/partnerApply'
import { APPLY_RULES, checkRateLimit, clientKey, rateLimitedBody } from '@/lib/rateLimit'

// 伙伴申请（命理师白标 v1）
//
// ★ 这是全站唯一【匿名可写】的端点，所以顺序是：限流 → 校验 → 落库。
//   限流在写库之前：被刷时不产生任何写入（与 /api/track 同一口径）。
// ★ 蜜罐命中时返回 200「已收到」但【不写库】：不给机器人任何可学习的反馈。
// ★ 落库失败也返回 500（不假装成功）——申请是真实商机，丢了必须让人知道。
export async function POST(request: NextRequest) {
  try {
    const admin = createServerSupabase()

    const limited = await checkRateLimit(admin, clientKey(null, request), APPLY_RULES)
    if (!limited.allowed) {
      return NextResponse.json(rateLimitedBody(limited), { status: 429 })
    }

    const body = await request.json().catch(() => null)
    const { data, errors, bot } = normalizeApplication(body)

    if (bot) return NextResponse.json({ ok: true })
    if (!data) {
      return NextResponse.json({ error: errors[0] ?? '表单填写有误', errors }, { status: 400 })
    }

    const { error } = await admin.from('partner_applications').insert(data as never)
    if (error) {
      console.error('[partner-apply] 写入失败:', error.message)
      return NextResponse.json(
        { error: '提交失败，请稍后重试，或直接邮件 hello@mingcharts.com' },
        { status: 500 },
      )
    }

    return NextResponse.json({ ok: true })
  } catch (e) {
    console.error('[partner-apply] 异常:', e instanceof Error ? e.message : e)
    return NextResponse.json({ error: '提交失败，请稍后重试' }, { status: 500 })
  }
}
