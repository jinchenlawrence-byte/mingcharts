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
  | 'ask_pack'        // 追问包（次数见 ASK_PACK_SIZE，单一事实源）
  // ★ 伙伴批量包（白标 v1，2026-10-22）：卖给命理师的「报告份数」，
  //   不是给终端用户的产品 —— 故 grants 为空、且不进 ONE_TIME_SKUS（不上消费者定价页）
  | 'partner_credits_10'
  | 'partner_credits_50'
  | 'partner_credits_200'

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

/**
 * ★ 追问包次数（ask_pack 每次购买可追问的条数）—— 单一事实源，只此一处定义。
 *   消费方：SKUS.ask_pack.desc、grantLabels 的 ask 标签、entitlement.askQuotaFromRows。
 *   改次数只动这一处（route/组件不得各自写死数字）。
 */
export const ASK_PACK_SIZE = 10

/**
 * ★ 会员每月追问额度（2026-10-21）—— 单一事实源，只此一处定义。
 *   订阅会员（月/年）每个自然月可免费追问 8 次，按月重置、不累计；
 *   与追问包互不挤占：会员先扣本月额度，用完后才扣已购追问包的次数。
 *   消费方：entitlement.askQuotaFromRows、会员 SKU 文案。
 */
export const MEMBER_ASK_PER_MONTH = 8

/**
 * ★ 报告赠送追问次数（2026-10-21）—— 单一事实源。
 *   用户每购买一份单次报告（含三合一套餐），即获赠 ASK_PER_REPORT 次追问，终身有效、不重置。
 *   「只要产生过付费内容就能追问」的额度来源之一；消费顺序：会员本月 → 报告赠送 → 追问包。
 *   消费方：entitlement.askQuotaFromRows、定价页 / 会员中心文案。
 */
export const ASK_PER_REPORT = 5

/**
 * ★ 邀请奖励追问次数（2026-10-21）—— 单一事实源。
 *   邀请 1 位好友注册成功（且非自己），邀请人得 ASK_PER_INVITE 次追问，终身有效。
 *   消费顺序：会员本月 → 报告赠送 → 邀请奖励 → 追问包（付费额度最后扣）。
 *   消费方：entitlement.askQuotaFromRows、api/invite/claim 文案。
 */
export const ASK_PER_INVITE = 3

/**
 * ★ 伙伴批量包：每包可出的报告份数（单一事实源）。
 *   消费方：结账 webhook 入账、伙伴后台显示余额、白标方案价目表。
 *   改档只动这里；SKUS 里的价格必须与之同批调整（test-partner-accept 会比对文档）。
 */
export const PARTNER_PACK_UNITS = {
  partner_credits_10: 10,
  partner_credits_50: 50,
  partner_credits_200: 200,
} as const

export type PartnerPackSku = keyof typeof PARTNER_PACK_UNITS

/**
 * ★ 伙伴包是否已开放购买（闸门）。
 *   为什么默认 false：productId 一登记，/api/checkout 就认这个 SKU，
 *   而「支付成功 → 写入伙伴额度」的入账链路（webhook + partner_credits 账本）
 *   还没上线 —— 此时放行等于收了钱不发货。
 *   ★ 上线顺序：账本 + webhook 入账 + 余额查询 三者齐备后，把这里翻成 true。
 */
export const PARTNER_PACK_PURCHASABLE = false

/** 是否为伙伴批量包（结账/入账分支用；避免各处写字符串比较） */
export function isPartnerPack(sku: string): sku is PartnerPackSku {
  return Object.prototype.hasOwnProperty.call(PARTNER_PACK_UNITS, sku)
}

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
    desc: '流年详批，今年/明年/后年三年趋势与流月节奏早知道',
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
    desc: `个性化日运（每日）＋ 流月提示 ＋ 每月 ${MEMBER_ASK_PER_MONTH} 次追问`,
    priceUSD: 9.9, kind: 'subscription', durationDays: 30,
    grants: SUBSCRIPTION_GRANTS   // ★ 不含任何报告（订阅不含报告，定价方案 §4.2）
  },
  member_yearly: {
    id: 'member_yearly', name: '年度会员',
    desc: `个性化日运 ＋ 流月提示 ＋ 每月 ${MEMBER_ASK_PER_MONTH} 次追问，按年订阅更划算`,
    priceUSD: 49, kind: 'subscription', durationDays: 365,
    grants: SUBSCRIPTION_GRANTS   // ★ 同上
  },
  ask_pack: {
    id: 'ask_pack', name: '追问包',
    // ★ 次数由 ASK_PACK_SIZE 派生（单一事实源）：改次数只动上面那一处，本行自动跟随。
    desc: `追问 ${ASK_PACK_SIZE} 次`,
    priceUSD: 4.99, kind: 'pack',
    grants: ['ask']
  },
  // ── 伙伴批量包（白标 v1）──────────────────────────────────────────
  // ★ 商品名与描述会被收单方（Waffo）看到，且要落在已批类目 digital content 里：
  //   一律说「报告包 N 份」，不要出现「额度 / 储值 / credit / 充值」——
  //   预付储值类在收单方眼里是另一类受监管商品，容易触发二次审核。
  // ★ grants 必须为空：伙伴包只产出「份数」，不给购买者本人解锁任何报告能力。
  //   否则 isReportPurchase 会把它当报告购买（entitlement.ts:355）。
  partner_credits_10: {
    id: 'partner_credits_10',
    name: '命理报告包 · 10 份（命书 / 合婚）',
    desc: '命书或合婚报告 10 份，供命理师交付客户：每份为万字命书（十卷）或合婚详批（双人九维），逐条注明所引经典；生成带您品牌信息的报告链接，客户可直接阅读并打印为 PDF。自购买起 24 个月有效，不可转让；数字内容，交付后不支持退款。',
    priceUSD: 150, kind: 'one_time',
    grants: []
  },
  partner_credits_50: {
    id: 'partner_credits_50',
    name: '命理报告包 · 50 份（命书 / 合婚）',
    desc: '命书或合婚报告 50 份，供命理师交付客户：每份为万字命书（十卷）或合婚详批（双人九维），逐条注明所引经典；生成带您品牌信息的报告链接，客户可直接阅读并打印为 PDF。自购买起 24 个月有效，不可转让；数字内容，交付后不支持退款。',
    priceUSD: 600, kind: 'one_time',
    grants: []
  },
  partner_credits_200: {
    id: 'partner_credits_200',
    name: '命理报告包 · 200 份（命书 / 合婚）',
    desc: '命书或合婚报告 200 份，供命理师交付客户：每份为万字命书（十卷）或合婚详批（双人九维），逐条注明所引经典；生成带您品牌信息的报告链接，客户可直接阅读并打印为 PDF。自购买起 24 个月有效，不可转让；数字内容，交付后不支持退款。',
    priceUSD: 1800, kind: 'one_time',
    grants: []
  }
}

/** 伙伴批量包便捷列表（/partners 展示、伙伴后台） */
export const PARTNER_PACK_SKUS: Sku[] = [
  SKUS.partner_credits_10, SKUS.partner_credits_50, SKUS.partner_credits_200,
]

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
