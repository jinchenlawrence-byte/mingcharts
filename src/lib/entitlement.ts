// 门禁「单一判定函数」（HANDOFF-变现管道 §1.3；HANDOFF-会员权益修复 §1.3）
// 全局面禁只此一处：route/页面不得各自写判定（§8.5.1 同型错误）。
import type { SupabaseClient } from '@supabase/supabase-js'
import type { SkuId, GrantId } from './pricing'
import { SKUS } from './pricing'

/**
 * ★ 是否真正执行拦截（§1.1 不变量）。
 * 支付接入是第 6–7 步，本轮没做 —— 必须为 false，
 * 否则紫微/合婚/地理的用户永远拿不到内容，等于功能不可用。
 * 第 7 步（接 MoR/Stripe）完成后才改为 true。
 *
 * ★★ REPLY-23 复核 §五根因待办：ENFORCE=false 期间 canView 恒 true，
 *   「未解锁分支」在各 route 完全不可达——其正确性只能靠纯函数层断言守护
 *   （reportCache.resolveCachedHit 断言⑦：未解锁命中带全文缓存 → ai=null）。
 *   【开 ENFORCE 前必须补端到端未解锁验证】：实测「未解锁请求拿不到 ai 全文、
 *   不触发 AI 调用（route 的 unlocked 三元守卫）」，不得只信纯函数层。
 */
export const ENTITLEMENT_ENFORCE = false

export interface Entitlements {
  /**
   * 有效会员期内所持的订阅 SKU（如 ['member_yearly']）；无有效会员期为 []。
   * ★ 权益由「持有哪个会员 SKU 的 grants」决定，不再用 member 布尔全放行。
   */
  memberSkus: SkuId[]
  /** 已购单项 SKU 集合（会员 SKU 不入此集合） */
  ownedSkus: Set<SkuId>
}

/** 空权益（未登录/无购买时的默认值） */
export const EMPTY_ENTITLEMENTS: Entitlements = {
  memberSkus: [],
  ownedSkus: new Set<SkuId>()
}

/**
 * 唯一门禁判定：问「这些权益能否访问该 grant」。
 * ★ ENFORCE 关闭时无条件放行 —— 结构就位、默认全放行，等支付接入后统一开启。
 * 开启后：会员或已购 SKU 中，任一 SKU 的 grants 覆盖该 grant 即放行。
 *   · 会员不再是万能通行证：订阅 grants 不含报告（见 pricing.ts REPORT_GRANTS）
 *   · bundle3 的隐式放行已写进其 grants，不再需要特判
 */
export function canView(ent: Entitlements, grant: GrantId): boolean {
  if (!ENTITLEMENT_ENFORCE) return true
  const sources = [...ent.memberSkus, ...ent.ownedSkus]
  return sources.some((id) => SKUS[id].grants.includes(grant))
}

/**
 * ★ 权益的【唯一】来源是：
 *   · profiles 的会员状态（由支付回调维护）
 *   · payments 的【真实】已支付流水（transaction_id 非 MOCK_ 前缀）
 *   ✗ 绝不接受"内测期临时开通"写入的数据 —— 内测期的免费由
 *     ENTITLEMENT_ENFORCE = false 表达（见该常量注释）
 *
 * 现状：payments 表无 sku 列（见 supabase/schema.sql），
 *   payment_type='single' 的已支付流水＝旧版单次解锁命书 → 映射 fatebook；
 *   会员订阅流水（payment_type='monthly'/'yearly'）的权益以 profiles 会员状态为准。
 *   第 6 步加 sku 列后，改为直接按流水 sku 归集，此处是唯一改动点。
 */

/** profiles 行的类型（getEntitlements 查回的子集） */
export interface ProfileRow {
  is_member?: boolean | null
  member_plan?: string | null
  member_expire_at?: string | null
}

/** payments 行的类型（getEntitlements 查回的子集） */
export interface PaymentRow {
  payment_type?: string | null
  status?: string | null
  transaction_id?: string | null
}

/**
 * 纯函数：从 profiles 行 + payments 行算出 Entitlements。
 * ★ 抽出来的目的：让断言可以喂数据、真跑生产逻辑，而不是用测试自己造的字面量。
 * getEntitlements = 查库 + 调它。
 */
export function entitlementsFromRows(
  pays: PaymentRow[] | null,
  profile: ProfileRow | null,
  now: number = Date.now()
): Entitlements {
  // 有效会员期 → 持有对应订阅 SKU（旧数据缺 member_plan 时按月度计）
  const memberSkus: SkuId[] = []
  const expireMs = profile?.member_expire_at
    ? new Date(profile.member_expire_at).getTime()
    : NaN
  if (profile?.is_member === true && !Number.isNaN(expireMs) && expireMs > now) {
    memberSkus.push(profile.member_plan === 'yearly' ? 'member_yearly' : 'member_monthly')
  }

  const ownedSkus = new Set<SkuId>()
  for (const p of pays ?? []) {
    if (p.status !== 'paid') continue
    // ★★ 排除模拟流水：'MOCK_' 前缀的流水是接入支付前的占位数据，
    //    【不是真实购买】，绝不能据此授予权益（否则内测期用户会永久白拿）。
    //    真实流水由支付平台（Waffo）回调写入，transaction_id 为其真实单号。
    if (typeof p.transaction_id === 'string' && p.transaction_id.startsWith('MOCK_')) continue
    if (p.payment_type === 'single') ownedSkus.add('fatebook')
  }

  return { memberSkus, ownedSkus }
}

/**
 * 从 profiles + payments 读取用户权益（服务端用 service_role，绕过 RLS）。
 * ★ 只做查库 + 调 entitlementsFromRows —— 逻辑全在纯函数里，断言可直接测。
 */
export async function getEntitlements(
  admin: SupabaseClient,
  userId: string
): Promise<Entitlements> {
  const [{ data: profile }, { data: pays }] = await Promise.all([
    admin
      .from('profiles')
      .select('is_member, member_plan, member_expire_at')
      .eq('id', userId)
      .maybeSingle(),
    admin
      .from('payments')
      .select('payment_type, status, transaction_id')
      .eq('user_id', userId)
  ])

  return entitlementsFromRows(pays as PaymentRow[] | null, profile as ProfileRow | null)
}

/**
 * ★「用户最近一份命盘」的 id（HANDOFF-命书一份一付 §二，2026-10-13）。
 * 判定"有没有命盘"必须查 charts 表（§〇-6：localStorage 换设备/清缓存就没了）。
 * 「最近一份」= created_at DESC 第一条 —— charts 表只有 created_at（无 updated_at），
 * 且 schema 已有 idx_charts_created_at DESC 索引支撑此排序。
 * ★ 只查 id 列，供购买关联（步骤②）与门禁判定复用 —— 单一事实源，调用方不得散写同型查询。
 */
export async function latestChartIdOf(
  admin: SupabaseClient,
  userId: string
): Promise<string | null> {
  const { data } = await admin
    .from('charts')
    .select('id')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(1)
  return data?.[0]?.id ?? null
}

/**
 * ★★★ 命书「按盘」判定（HANDOFF-命书一份一付 §四，2026-10-13）
 *   第一层：ENTITLEMENT_ENFORCE —— 内测开关，false 时【一律放行】且【不查库】
 *           （保持内测期行为与成本与现状完全一致）
 *   第二层：该 chart 是否【已付款】—— 查 payments(user_id, chart_id, status='paid')
 * ★ 两层都要过；权益凭据是 payments.chart_id（§3.2 归属校验后写入），
 *   绝不用 charts.is_paid 当凭据（其语义是「解锁过」，不参与权益判定）。
 * ★ chartId 为 null/undefined → 不放行（§五：NULL 行天然不匹配任何「已付某盘」，
 *   且有守卫兜底——不带 chartId 的调用绝不放行，防旧数据 chart_id=NULL 被误判）。
 * ★ opts.enforce 仅供断言注入双层判定的 ENFORCE=true 分支（默认读全局开关），
 *   生产调用一律不传 —— ENFORCE 仍须为 false（§六：不得改它的值）。
 *   ★ 牙口锚点（三条，见 scripts/test-fatebook-onepay.mjs ③段）：
 *     · 去掉 `if (!enforce) return true` → 断言①（恒真＋零查询）翻红
 *     · 去掉 `if (!chartId) return false` → 断言④翻红
 *     · 删掉 .eq('chart_id', chartId) → 断言③翻红
 */
export async function canViewFatebookForChart(
  admin: SupabaseClient | null,
  userId: string,
  chartId: string | null | undefined,
  opts?: { enforce?: boolean }
): Promise<boolean> {
  const enforce = opts?.enforce ?? ENTITLEMENT_ENFORCE
  if (!enforce) return true // ★ 内测期：与现状完全一致，不查库
  if (!admin) return false // ★ 无客户端＝无凭据可查（paipan 匿名请求不建 Supabase 客户端，排盘不因此强依赖 Supabase 配置）
  if (!chartId) return false // ★ 无命盘归属 → 不放行（先于任何查询）
  const { data } = await admin
    .from('payments')
    .select('id')
    .eq('user_id', userId)
    .eq('chart_id', chartId)
    .eq('status', 'paid')
    .limit(1)
  return !!data?.length
}
