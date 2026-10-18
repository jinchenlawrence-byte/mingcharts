// ★ 价目「单一事实源」（HANDOFF-变现管道 §1.2）
// 全局价格与权益只此一份：pricing 页、MembershipButton、membership 兼容导出都从这里取。
// 以 USD 为基准，不维护第二套币种——改价只动这一处，杜绝两份 PLANS 漂移。

export type SkuId =
  | 'fatebook'        // 命书（核心深度报告）
  | 'annual_report'   // 年运报告
  | 'hemun'           // 合婚（双人九维）
  | 'ziwei_deep'      // 紫微深度
  | 'geo'             // 地理 · 财富之城
  | 'bundle3'         // 命书 ＋ 紫微 ＋ 地理
  | 'member_monthly'  // 月度会员
  | 'member_yearly'   // 年度会员（★主推）
  | 'ask_pack'        // 追问 15 次（V2，先占位）

/**
 * 可访问的能力（GrantId）—— ★ 与「可购买的东西」（SkuId）刻意分离。
 * canView 查 grant，不再用「持有哪个 SKU」直接当权限。
 */
export type GrantId =
  // 报告类（单次购买解锁）
  | 'fatebook' | 'annual_report' | 'hemun' | 'ziwei_deep' | 'geo'
  // 订阅类（持续型，会员解锁；功能随后补，权益结构不再动）
  | 'daily'          // 个性化日运（每日）
  | 'liuyue'         // 流月提示（每月）
  | 'jiaoyun'        // 交运提醒（大运切换节点）
  | 'multi_chart'    // 多命盘（3–5 个）
  | 'similar_cases'  // 相似古籍命例对照
  | 'history'        // 历史日运回看
  // 追问类（V2）
  | 'ask'

export type SkuKind = 'one_time' | 'subscription' | 'pack'

export interface Sku {
  id: SkuId
  name: string
  desc: string
  priceUSD: number
  kind: SkuKind
  /** subscription 有效天数（30/365） */
  durationDays?: number
  /** ★ 本 SKU 解锁的能力（权益数据化：可断言、可守护，不再只存在于中文 desc） */
  grants: GrantId[]
}

/** 报告类 grant（订阅的 grants 与之交集必须为空——「订阅不含报告」，见 docs/定价方案 §4.2） */
export const REPORT_GRANTS: GrantId[] =
  ['fatebook', 'annual_report', 'hemun', 'ziwei_deep', 'geo']

/** 订阅类 grant（会员 SKU 的 grants 恰为此表——持续型内容，不含任何报告） */
export const SUBSCRIPTION_GRANTS: GrantId[] =
  ['daily', 'liuyue', 'jiaoyun', 'multi_chart', 'similar_cases', 'history']

/**
 * ★ 多命盘数量上限（订阅权益 multi_chart；docs/订阅权益设计 §二①：免费 1 / 订阅 3–5）。
 *   取上限值 5 匹配「3–5 个」文案上限；上限判定统一走 entitlement.chartLimitFor（单一事实源）。
 */
export const MULTI_CHART_LIMIT = { free: 1, member: 5 } as const

export const SKUS: Record<SkuId, Sku> = {
  fatebook: {
    id: 'fatebook', name: '命书报告',
    desc: '万字深度详批，一次看清命局全局',
    priceUSD: 29.99, kind: 'one_time',
    grants: ['fatebook']
  },
  annual_report: {
    id: 'annual_report', name: '年运报告',
    // ★ 覆盖范围与实现一致（HANDOFF-年运披露与报告缓存 §一）：canView(ent,'annual_report')
    //   不含年份，一次购买解锁 今年/明年/后年 三份报告 —— 文案必须如实披露「三年」
    desc: '流年详批，今年/明年/后年三年趋势早知道',
    priceUSD: 19.99, kind: 'one_time',
    grants: ['annual_report']
  },
  hemun: {
    id: 'hemun', name: '合婚详批',
    desc: '双人九维合婚，典籍/古法/民俗分级呈现',
    priceUSD: 29.99, kind: 'one_time',
    grants: ['hemun']
  },
  ziwei_deep: {
    id: 'ziwei_deep', name: '紫微深度',
    desc: '十二宫完整星盘 + 十二板块深度解读：命格、性格、十二宫导读、事业、财运、婚姻、健康、生年四化、格局成败、大限十年、流年流月、趋避建议',
    priceUSD: 24.99, kind: 'one_time',
    grants: ['ziwei_deep']
  },
  geo: {
    id: 'geo', name: '地理 · 财富之城',
    desc: '方位五行与城市地气，五城推荐',
    priceUSD: 19.99, kind: 'one_time',
    grants: ['geo']
  },
  bundle3: {
    id: 'bundle3', name: '三合一套餐',
    desc: '命书 ＋ 紫微 ＋ 地理，一次购齐',
    priceUSD: 59.99, kind: 'one_time',
    grants: ['fatebook', 'ziwei_deep', 'geo']
  },
  member_monthly: {
    id: 'member_monthly', name: '月度会员',
    desc: '个性化日运（每日）＋ 流月提示，持续更新',
    priceUSD: 9.9, kind: 'subscription', durationDays: 30,
    grants: SUBSCRIPTION_GRANTS   // ★ 不含任何报告（订阅不含报告，定价方案 §4.2）
  },
  member_yearly: {
    id: 'member_yearly', name: '年度会员',
    desc: '个性化日运 ＋ 流月提示，按年订阅更划算',
    priceUSD: 49, kind: 'subscription', durationDays: 365,
    grants: SUBSCRIPTION_GRANTS   // ★ 同上
  },
  ask_pack: {
    id: 'ask_pack', name: '追问包',
    desc: '追问 15 次（V2）',
    priceUSD: 4.99, kind: 'pack',
    grants: ['ask']
  }
}

/** 订阅类 SKU 便捷列表（pricing 页会员区） */
export const MEMBER_SKUS: Sku[] = [SKUS.member_monthly, SKUS.member_yearly]

/** 单项购买 SKU（pricing 页产品区） */
export const ONE_TIME_SKUS: Sku[] = [
  SKUS.fatebook, SKUS.annual_report, SKUS.hemun,
  SKUS.ziwei_deep, SKUS.geo, SKUS.bundle3
]

/** 格式化 USD 价格：$29.99 / $9.9 / $49（整数不带 .00） */
export function formatPriceUSD(n: number): string {
  return '$' + (Number.isInteger(n) ? String(n) : n.toFixed(2))
}
