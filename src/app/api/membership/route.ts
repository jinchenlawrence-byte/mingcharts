import { NextRequest, NextResponse } from 'next/server'
import { WaffoPancakeError } from '@waffo/pancake-ts'
import { createServerSupabase } from '@/lib/supabase'
import { PLANS, getMembership, type PlanId } from '@/lib/membership'
import { ENTITLEMENT_ENFORCE } from '@/lib/entitlement'
import { waffoProductId } from '@/lib/waffo-products'
import { createCheckoutSession } from '@/lib/checkout'
import { makeMerchantOrderId } from '@/lib/waffo-events'
import type { SkuId } from '@/lib/pricing'
import { localeFromRequest } from '@/lib/locale'

// 从请求中提取访问令牌：优先 Authorization 头，其次 query 参数
function getToken(req: NextRequest): string | null {
  const auth = req.headers.get('authorization')
  if (auth?.startsWith('Bearer ')) return auth.slice(7)
  return req.nextUrl.searchParams.get('token')
}

/** 旧 PlanId → 订阅 SKU（价格/权益只从 pricing.ts 单一事实源取） */
const PLAN_SKU: Record<PlanId, SkuId> = {
  monthly: 'member_monthly',
  yearly: 'member_yearly',
}

/** GET /api/membership?token=xxx —— 查询当前会员状态（含订阅自助管理所需字段） */
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

  // ★ 档 C：补「自动续费 / 正在取消 / 下次续费日」三个字段供 /member 页自助管理。
  //   ★ 只 select 需要展示的列 —— member_order_id（渠道订阅单号 ORD_）【绝不下发客户端】，
  //   取消/恢复一律由服务端读它再调渠道（见 /api/membership/cancel）。
  const { data: row } = await admin
    .from('profiles')
    .select('member_expire_at, member_auto_renew, member_cancel_at')
    .eq('id', user.id)
    .maybeSingle()

  const cancelAt = (row?.member_cancel_at as string | null) ?? null
  return NextResponse.json({
    success: true,
    data: {
      ...status,
      autoRenew: row?.member_auto_renew === true,
      canceling: cancelAt !== null,
      cancelAt,
      nextBillingAt: status.active ? status.expiresAt : null,
    },
  })
}

/**
 * POST /api/membership —— 开通会员（档 C：接入真实订阅收银台）
 *
 * 三条铁律（务必保留）：
 *   ① 本路由【不写任何会员状态】：会员权益与支付流水一律由 Waffo webhook（subscription.* 事件）
 *      写入 profiles/payments —— 那才是真实权益的来源。把「已开通」写在这里会无法回收、
 *      也无法与真实购买区分。
 *   ② 开闸判据 = 会员 SKU 的 PROD_ 【是否已登记】（waffo-products.ts 唯一登记处），不是 env 开关：
 *      未登记 → 内测期免费开放（不落库、不伪造已购买）；已登记 → 创建真实收银台会话。
 *   ③ 自动续费必须【明确同意】：agreeAutoRenew !== true 直接拒绝（档 C 合规要求，
 *      不得默认勾选；托管收银台不可改文案，故同意放在按钮旁）。
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { token, plan: planId, agreeAutoRenew } = body as {
      token?: string
      plan?: string
      agreeAutoRenew?: boolean
    }

    if (!token || !planId) {
      return NextResponse.json({ error: '参数缺失' }, { status: 400 })
    }
    const plan = PLANS[planId as PlanId]
    if (!plan) {
      return NextResponse.json({ error: '未知套餐' }, { status: 400 })
    }

    // ★ ③ 自动续费同意校验（先于一切 IO）
    if (agreeAutoRenew !== true) {
      return NextResponse.json(
        {
          success: false,
          error: '请先勾选「同意自动续费」后再开通（订阅将按期自动扣费，可随时在会员中心取消）',
          code: 'CONSENT_REQUIRED',
        },
        { status: 400 },
      )
    }

    const admin = createServerSupabase()
    const { data: { user }, error: authError } = await admin.auth.getUser(token)
    if (authError || !user) {
      return NextResponse.json({ error: '登录无效，请重新登录' }, { status: 401 })
    }

    const sku = PLAN_SKU[plan.id]
    const productId = waffoProductId(sku)

    // ★ ② 未登记：还没接上真实商品
    if (!productId) {
      if (ENTITLEMENT_ENFORCE) {
        // 门禁已开但商品未上架 → 既不能免费放行，也不能伪造开通
        return NextResponse.json(
          { success: false, error: '支付通道尚未开放', code: 'PAYMENT_NOT_READY' },
          { status: 501 },
        )
      }
      // 内测期：不落库，仅如实告知「免费开放」
      return NextResponse.json({
        success: true,
        data: {
          active: true,
          trial: true,
          plan: plan.id,
          message: '内测期免费开放，未产生任何扣费，也未开通正式订阅',
        },
      })
    }

    const buyerEmail = (user.email ?? '').trim()
    if (!buyerEmail) {
      return NextResponse.json(
        { error: '当前账号缺少邮箱，无法发起支付，请先在账号设置中绑定邮箱' },
        { status: 400 },
      )
    }

    // ★ 复用与一次性购买同一套收银台（lib/checkout.ts）；成功后回 /member 看会员中心
    const session = await createCheckoutSession({
      productId,
      orderMerchantExternalId: makeMerchantOrderId(user.id),
      buyerEmail,
      userId: user.id,
      sku,
      returnTo: '/member',
      // 会员订阅同样按入口语言给收银台（body.locale ＞ cookie ＞ 默认）
      locale: localeFromRequest(req),
    })

    return NextResponse.json({
      success: true,
      data: {
        checkoutUrl: session.checkoutUrl,
        sessionId: session.sessionId,
        ref: session.ref,
        plan: plan.id,
      },
    })
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error)
    if (msg.includes('Waffo 支付未配置') || msg.includes('必须是 https')) {
      console.error('[membership] Waffo 未就绪:', msg)
      return NextResponse.json(
        { error: '支付服务尚未开放，请稍后再试', code: 'WAFFO_UNCONFIGURED' },
        { status: 503 },
      )
    }
    if (error instanceof WaffoPancakeError) {
      const status = error.status >= 500 ? 502 : 400
      console.error(`[membership] Waffo 渠道错误 ${error.status}:`, error.errors)
      return NextResponse.json(
        { error: `支付渠道错误：${error.errors?.[0]?.message ?? '未知错误'}` },
        { status },
      )
    }
    console.error('开通会员错误:', error)
    return NextResponse.json({ error: `开通失败：${msg}` }, { status: 500 })
  }
}
