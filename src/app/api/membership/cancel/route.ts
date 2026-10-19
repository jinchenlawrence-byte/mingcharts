import { NextRequest, NextResponse } from 'next/server'
import { WaffoPancakeError } from '@waffo/pancake-ts'
import { createServerSupabase } from '@/lib/supabase'
import { getWaffo, getWaffoStoreId } from '@/lib/waffo'

// POST /api/membership/cancel { token, action: 'cancel' | 'reactivate' }
//
// 站内自助取消 / 恢复订阅（档 C 合规要求：不能只让用户发邮件取消）。
//
// ★★ 边界（务必保留）：
//   ① 渠道订阅单号 ORD_xxx 只存在服务端（profiles.member_order_id）——本路由自己读、自己用，
//      【绝不下发客户端】，响应里也不回 ORD_。
//   ② 取消 = orders.cancelSubscription（商户凭证即可）；恢复【只能】走 customer session
//      （client.orders 没有 reactivateSubscription，需 auth.issueSessionToken 签发会话令牌）。
//   ③ 本地 member_auto_renew 只做【乐观更新】，权威状态以 webhook（subscription.canceling /
//      uncanceled）为准；canceling 期间会员【仍然有效】，本路由不动 is_member。
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null)
    const token = typeof body?.token === 'string' ? body.token.trim() : ''
    const action = body?.action
    if (!token || (action !== 'cancel' && action !== 'reactivate')) {
      return NextResponse.json({ error: '参数缺失或格式错误' }, { status: 400 })
    }

    const admin = createServerSupabase()
    const { data: { user }, error: authError } = await admin.auth.getUser(token)
    if (authError || !user) {
      return NextResponse.json({ error: '登录无效，请重新登录' }, { status: 401 })
    }

    // ① 读渠道订阅单号（服务端内部使用，不出网）
    const { data: row, error: readErr } = await admin
      .from('profiles')
      .select('member_order_id')
      .eq('id', user.id)
      .maybeSingle()
    if (readErr) {
      throw new Error(`profiles 查询失败: ${readErr.code} ${readErr.message}`)
    }
    const orderId = typeof row?.member_order_id === 'string' ? row.member_order_id : ''
    if (!orderId) {
      return NextResponse.json(
        { success: false, error: '当前账号没有可管理的订阅', code: 'NO_SUBSCRIPTION' },
        { status: 400 },
      )
    }

    const client = getWaffo()

    if (action === 'cancel') {
      const res = await client.orders.cancelSubscription({ orderId })
      // 乐观更新（权威以 webhook 为准）：已请求取消 → 自动续费关；本期内仍有效，不动 is_member
      await admin.from('profiles').update({ member_auto_renew: false }).eq('id', user.id)
      return NextResponse.json({ success: true, data: { status: res.status, autoRenew: false } })
    }

    // action === 'reactivate'：恢复订阅必须由买家身份发起（customer session）
    const email = (user.email ?? '').trim()
    if (!email) {
      return NextResponse.json({ error: '当前账号缺少邮箱，无法恢复订阅' }, { status: 400 })
    }
    const session = await client.auth.issueSessionToken({
      storeId: getWaffoStoreId(),
      buyerIdentity: email,
    })
    const res = await client.customer(session.token).reactivateSubscription({ orderId })
    await admin
      .from('profiles')
      .update({ member_auto_renew: true, member_cancel_at: null })
      .eq('id', user.id)
    return NextResponse.json({ success: true, data: { status: res.status, autoRenew: true } })
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error)
    if (msg.includes('Waffo 支付未配置')) {
      console.error('[membership/cancel] Waffo 未就绪:', msg)
      return NextResponse.json(
        { error: '支付服务尚未开放，请稍后再试', code: 'WAFFO_UNCONFIGURED' },
        { status: 503 },
      )
    }
    if (error instanceof WaffoPancakeError) {
      const status = error.status >= 500 ? 502 : 400
      console.error(`[membership/cancel] Waffo 渠道错误 ${error.status}:`, error.errors)
      return NextResponse.json(
        { error: `渠道错误：${error.errors?.[0]?.message ?? '未知错误'}` },
        { status },
      )
    }
    console.error('[membership/cancel] 订阅管理失败:', error)
    return NextResponse.json({ error: `操作失败：${msg}` }, { status: 500 })
  }
}
