import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabase } from '@/lib/supabase'
import { getWaffo } from '@/lib/waffo'
import { createWaffoRepo } from '@/lib/waffo-repo'
import { reconcilePayment, normalizeGraphqlPayment } from '@/lib/waffo-events'
import { getEntitlements } from '@/lib/entitlement'

// GraphQL：按业务单号反查 Waffo 支付节点。
// ★ 字段名以联调时真实 schema 为准（任务书 §5.4 出处
// docs.waffo.ai/api-reference/endpoints/graphql/orders-and-payments.md）；
// normalizeGraphqlPayment 对候选字段名做了容错，若联调发现 schema 差异，在这一处校正即可。
const PAYMENTS_QUERY = `
  query ($ref: String!) {
    payments(filter: { orderMerchantExternalId: { eq: $ref } }) {
      id
      status
      paymentId
      chargedAmount
      paymentDate
      orderMerchantExternalId
    }
  }
`

// POST /api/verify-payment { token, orderMerchantExternalId }
// 兜底对账：webhook 可能丢失（3 次重试后无手动重发），成功页轮询无果后调本接口。
export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => null)
    const token = typeof body?.token === 'string' ? body.token.trim() : ''
    const ref =
      typeof body?.orderMerchantExternalId === 'string'
        ? body.orderMerchantExternalId.trim()
        : ''
    if (!token || !ref) {
      return NextResponse.json({ error: '参数缺失或格式错误' }, { status: 400 })
    }

    const admin = createServerSupabase()
    const {
      data: { user },
      error: authError,
    } = await admin.auth.getUser(token)
    if (authError || !user) {
      return NextResponse.json({ error: '登录无效，请重新登录' }, { status: 401 })
    }

    const repo = createWaffoRepo(admin)
    const remote = {
      async findSucceededPayment(orderMerchantExternalId: string) {
        try {
          const result = await getWaffo().graphql.query({
            query: PAYMENTS_QUERY,
            variables: { ref: orderMerchantExternalId },
          })
          if (result.errors && result.errors.length > 0) {
            console.error('[verify-payment] GraphQL errors:', result.errors)
            return null
          }
          return normalizeGraphqlPayment(result.data)
        } catch (e) {
          // 渠道查询失败不阻塞接口：返回 pending，由成功页文案兜底（任务书 §5.6 ④）
          console.error('[verify-payment] GraphQL 反查失败:', e)
          return null
        }
      },
    }

    const outcome = await reconcilePayment({
      repo,
      remote,
      userId: user.id,
      ref,
    })

    if (outcome.status === 'rejected') {
      // 单号无法解析或不属于当前用户 → 拒绝（防越权查询）
      return NextResponse.json({ error: '订单号无效' }, { status: 403 })
    }
    if (outcome.status === 'pending') {
      return NextResponse.json({ status: 'pending' })
    }

    // 已拥有：回最新权益（与 getEntitlements 单一来源保持一致）
    const ent = await getEntitlements(admin, user.id)
    return NextResponse.json({
      status: 'owned',
      ownedSkus: [...ent.ownedSkus],
      memberSkus: ent.memberSkus,
      ref,
    })
  } catch (error) {
    console.error('[verify-payment] 对账失败:', error)
    const msg = error instanceof Error ? error.message : String(error)
    return NextResponse.json({ error: `对账失败：${msg}` }, { status: 500 })
  }
}
