import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabase } from '@/lib/supabase'
import { PLANS, getMembership, type PlanId } from '@/lib/membership'
import { ENTITLEMENT_ENFORCE } from '@/lib/entitlement'

// 从请求中提取访问令牌：优先 Authorization 头，其次 query 参数
function getToken(req: NextRequest): string | null {
  const auth = req.headers.get('authorization')
  if (auth?.startsWith('Bearer ')) return auth.slice(7)
  return req.nextUrl.searchParams.get('token')
}

/** GET /api/membership?token=xxx —— 查询当前会员状态 */
export async function GET(req: NextRequest) {
  const token = getToken(req)
  if (!token) {
    return NextResponse.json({ error: '未登录' }, { status: 401 })
  }

  const admin = createServerSupabase()
  const { data: { user }, error: authError } = await admin.auth.getUser(token)
  if (authError || !user) {
    return NextResponse.json({ error: '登录无效，请重新登录' }, { status: 401 })
  }

  const status = await getMembership(admin, user.id)
  return NextResponse.json({ success: true, data: status })
}

/** POST /api/membership —— 开通/续费会员（MVP 模拟支付，接入真实支付时替换） */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { token, plan: planId } = body as { token?: string; plan?: string }

    if (!token || !planId) {
      return NextResponse.json({ error: '参数缺失' }, { status: 400 })
    }
    const plan = PLANS[planId as PlanId]
    if (!plan) {
      return NextResponse.json({ error: '未知套餐' }, { status: 400 })
    }

    const admin = createServerSupabase()
    const { data: { user }, error: authError } = await admin.auth.getUser(token)
    if (authError || !user) {
      return NextResponse.json({ error: '登录无效，请重新登录' }, { status: 401 })
    }

    // ★★★ 关键：本路由【不写任何库】。
    //
    // 为什么：内测期的"免费开通"必须由 ENTITLEMENT_ENFORCE = false 表达，
    //   而不能靠 update profiles.is_member —— 那会把"临时免费"写成
    //   持久层的既成事实，接入真实支付后【无法回收、也无法与真实购买区分】。
    //
    // 接入支付后的正确做法（第 6–7 步）：
    //   本路由只负责【发起】支付（创建 Waffo checkout session），
    //   会员状态与支付流水由 Waffo 的回调 webhook 写入 —— 那才是真实权益的来源。

    if (ENTITLEMENT_ENFORCE) {
      // 尚未接入真实支付：明确返回"未开放"，不要伪造开通成功
      return NextResponse.json(
        { success: false, error: '支付通道尚未开放', code: 'PAYMENT_NOT_READY' },
        { status: 501 }
      )
    }

    // 内测期：不落库，仅告知前端"当前处于内测期免费开放"
    // ★ 必须带 trial 标志，让前端能如实显示"内测期免费"，而不是"已购买"
    return NextResponse.json({
      success: true,
      data: {
        active: true,
        trial: true,
        plan: plan.id,
        message: '内测期免费开放，未产生任何扣费，也未开通正式订阅',
      },
    })
  } catch (error) {
    console.error('开通会员错误:', error)
    const msg = error instanceof Error ? error.message : String(error)
    return NextResponse.json({ error: `开通失败：${msg}` }, { status: 500 })
  }
}
