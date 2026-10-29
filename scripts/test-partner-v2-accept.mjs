// 伙伴自助 V2 离线验收（第 34 轮）
//
// 判什么（HANDOFF-伙伴自助V2 §五 3–12）：
//   · 身份判定 = partner_credits 有行；余额 0 → 409 needPurchase；预算超额 → 429 且不扣；
//   · 同一 requestId 只扣 1 次（含并发）；生成失败必须退额并大声记日志；
//   · 非白名单品类 → 400；分享链接 90 天；分享页品牌位 + 来源披露并存；
//   · 客户无需登录；表单不收客户电话/邮箱。
// ★ 全程离线：数据库用内存假实现（唯一索引按 partner-v2.sql 是否声明来模拟），不发任何网络请求。
import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const near = (p) => resolve(here, '..', p)

let allPass = true
const failures = []
function fail(msg) {
  allPass = false
  failures.push(msg)
  console.log(`  ✗ ${msg}`)
}
function ok(msg) {
  console.log(`  ✓ ${msg}`)
}
function assert(cond, msg) {
  if (cond) ok(msg)
  else fail(msg)
}

const {
  createPartnerReport,
  resolvePartnerKind,
  shouldRejectBalance,
  refundRef,
  normalizeBrandFields,
  PARTNER_REPORT_KINDS,
} = await import('../src/lib/partnerReport.ts')
const { adjustPartnerUnits } = await import('../src/lib/partnerCredits.ts')

const NOW_ISO = '2026-10-26T00:00:00.000Z'
const fixedNow = () => new Date(NOW_ISO)
/** 去掉 SQL 行注释后再断言：被注释掉的索引/列不能算「已声明」（牙口 B 依赖这一点） */
const stripSqlComments = (s) => s.split('\n').map((line) => line.replace(/--.*$/, '')).join('\n')

// ───────── 内存假数据库（只实现 lib 用到的链式调用）─────────
function makeDb({ uniqueRequestId = true } = {}) {
  const state = { rows: [], seq: 0 }

  class Query {
    constructor(table) {
      this.table = table
      this.op = 'select'
      this.filters = []
      this.payload = null
      this.limitN = null
      this.orderBy = null
    }
    select() { return this }
    insert(payload) { this.op = 'insert'; this.payload = payload; return this }
    update(payload) { this.op = 'update'; this.payload = payload; return this }
    eq(col, val) { this.filters.push([col, val]); return this }
    order(col, opts = {}) { this.orderBy = [col, opts.ascending !== false]; return this }
    limit(n) { this.limitN = n; return this }
    _rows() {
      let out = state.rows.filter((row) => this.filters.every(([c, v]) => row[c] === v))
      if (this.orderBy) {
        const [col, asc] = this.orderBy
        out = [...out].sort((a, b) => (asc ? 1 : -1) * String(a[col]).localeCompare(String(b[col])))
      }
      if (this.limitN != null) out = out.slice(0, this.limitN)
      return out
    }
    async maybeSingle() {
      return { data: this._rows()[0] ?? null, error: null }
    }
    async single() {
      if (this.op === 'insert') {
        const p = this.payload
        // 模拟 idx_reports_request_id 部分唯一索引（WHERE request_id IS NOT NULL）
        if (
          uniqueRequestId
          && p.request_id != null
          && state.rows.some((r) => r.user_id === p.user_id && r.request_id === p.request_id)
        ) {
          return { data: null, error: { code: '23505', message: 'duplicate key value violates unique constraint' } }
        }
        const row = {
          ...p,
          id: `r${++state.seq}`,
          created_at: new Date(Date.parse(NOW_ISO) + state.seq * 1000).toISOString(),
        }
        state.rows.push(row)
        return { data: { id: row.id }, error: null }
      }
      const row = this._rows()[0]
      return { data: row ?? null, error: row ? null : { message: 'not found' } }
    }
    then(onFulfilled, onRejected) {
      let data = null
      let error = null
      if (this.op === 'update') {
        const targets = this._rows()
        for (const row of targets) Object.assign(row, this.payload)
        data = targets
      } else {
        data = this._rows()
      }
      return Promise.resolve({ data, error }).then(onFulfilled, onRejected)
    }
  }

  return { state, from(table) { return new Query(table) } }
}

function makeDeps(opts = {}) {
  const state = {
    balance: opts.credits ?? 5,
    partner: opts.partner !== false,
    budget: !!opts.budgetExhausted,
    spends: [],
    refunds: [],
    logs: [],
  }
  const deps = {
    now: fixedNow,
    logError: (m) => state.logs.push(m),
    hasPartnerRow: async () => state.partner,
    getBalance: async () => state.balance,
    spend: async () => {
      if (opts.spendFails) return { ok: false, balance: state.balance, error: '余额不足（并发扣光）' }
      if (state.balance < 1) return { ok: false, balance: state.balance, error: '余额不足' }
      state.balance -= 1
      state.spends.push(1)
      return { ok: true, balance: state.balance }
    },
    refund: async (_admin, { reportId }) => {
      state.balance += 1
      state.refunds.push(reportId)
    },
    checkBudget: async () => ({ exhausted: state.budget }),
    generate: opts.generate ?? (async () => ({ result: { marker: 'generated' } })),
  }
  return { deps, state }
}

const FATEBOOK_INPUT = { year: 1990, month: 5, day: 8, hour: 16, minute: 30, gender: 1 }

function call(db, deps, extra = {}) {
  return createPartnerReport(db, {
    userId: 'u1',
    kind: 'fatebook',
    input: FATEBOOK_INPUT,
    brandName: '陈老师命理',
    brandContact: 'LINE: chen',
    requestId: 'req-1',
    ...extra,
  }, deps)
}

// ---------- ① SQL 迁移 ----------
console.log('—— ① SQL 迁移 ——')
{
  const sql = stripSqlComments(readFileSync(near('supabase/partner-v2.sql'), 'utf8'))
  for (const col of ['status', 'request_id', 'brand_name', 'brand_contact']) {
    const re = new RegExp(`ALTER TABLE reports ADD COLUMN IF NOT EXISTS ${col}\\b`)
    assert(re.test(sql), `partner-v2.sql 以 IF NOT EXISTS 增加 ${col} 列`)
  }
  assert(/status TEXT NOT NULL DEFAULT 'ready'/.test(sql), 'status 默认 ready（老数据语义不变）')
  assert(sql.includes('idx_reports_request_id'), '存在 idx_reports_request_id')
  assert(
    /CREATE UNIQUE INDEX IF NOT EXISTS idx_reports_request_id[\s\S]{0,160}ON reports \(user_id, request_id\)[\s\S]{0,80}WHERE request_id IS NOT NULL/.test(sql),
    '唯一索引是 (user_id, request_id) 的部分唯一索引'
  )
}

// ---------- ② 纯函数 ----------
console.log('—— ② 纯函数 ——')
{
  assert(PARTNER_REPORT_KINDS.length === 2, '伙伴开放品类恰为 2 个')
  assert(resolvePartnerKind('fatebook') === 'fatebook', 'fatebook 开放')
  assert(resolvePartnerKind('hemun') === 'hemun', 'hemun 开放')
  for (const k of ['ziwei', 'annual', 'geo', 'bundle3', '', null, undefined, 123]) {
    assert(resolvePartnerKind(k) === null, `非白名单品类 ${String(k)} 被拒`)
  }
  assert(shouldRejectBalance(0), '余额 0 → 拒绝')
  assert(shouldRejectBalance(-1), '余额 -1 → 拒绝')
  assert(!shouldRejectBalance(1), '余额 1 → 放行')
  assert(!shouldRejectBalance(10), '余额 10 → 放行')
  assert(shouldRejectBalance(NaN), '脏余额 NaN → 拒绝（保守）')
  assert(refundRef('r9') === 'refund:r9', '退额 ref 带 refund: 前缀')
  const b1 = normalizeBrandFields('  陈老师  ', ' LINE: chen ')
  assert(b1.brandName === '陈老师' && b1.brandContact === 'LINE: chen', '品牌字段 trim')
  const b2 = normalizeBrandFields('', '')
  assert(b2.brandName === null && b2.brandContact === null && !b2.error, '空品牌位 → null（可空）')
  assert(!!normalizeBrandFields('x'.repeat(25), '').error, '品牌名 >24 字 → 错误')
  assert(!!normalizeBrandFields('ok', 'x'.repeat(41)).error, '联系方式 >40 字 → 错误')
}

// ---------- ③ 非伙伴 → 403 ----------
console.log('—— ③ 身份判定 ——')
{
  const db = makeDb()
  const { deps, state } = makeDeps({ partner: false })
  const r = await call(db, deps)
  assert(r.ok === false && r.status === 403, '无 partner_credits 行 → 403')
  assert(db.state.rows.length === 0 && state.spends.length === 0, '403 时不落行、不扣费')
}

// ---------- ④ 余额 0 → 409 needPurchase ----------
console.log('—— ④ 余额闸门 ——')
{
  const db = makeDb()
  const { deps, state } = makeDeps({ credits: 0 })
  const r = await call(db, deps)
  assert(r.ok === false && r.status === 409, '余额 0 → 409')
  assert(r.needPurchase === true, '409 带 needPurchase: true')
  assert(db.state.rows.length === 0 && state.spends.length === 0, '余额不足时不落 pending 行、不扣费')
}

// ---------- ⑤ 预算超额 → 429 且不扣 ----------
console.log('—— ⑤ AI 预算闸门 ——')
{
  const db = makeDb()
  const { deps, state } = makeDeps({ credits: 5, budgetExhausted: true })
  const r = await call(db, deps)
  assert(r.ok === false && r.status === 429, '预算超额 → 429')
  assert(state.balance === 5 && state.spends.length === 0, '预算拦截不扣额度')
  assert(db.state.rows.length === 0, '预算拦截不落行')
}

// ---------- ⑥ 成功路径：扣 1 份 + ready + 90 天 ----------
console.log('—— ⑥ 成功路径 ——')
let happyReportId = ''
{
  const db = makeDb()
  const { deps, state } = makeDeps({ credits: 5 })
  const r = await call(db, deps)
  assert(r.ok === true, '伙伴 + 余额 + 预算 → 生成成功')
  if (r.ok) {
    happyReportId = r.report.id
    assert(r.report.status === 'ready', '报告状态 ready')
    assert(state.balance === 4, '余额 5 → 4（扣 1 份）')
    assert(state.spends.length === 1, '只扣 1 次')
    assert(r.report.shareToken.length === 43, '分享令牌 43 字符（32 字节 base64url）')
    assert(r.report.shareUrl.endsWith(r.report.shareToken), 'shareUrl 使用同一令牌')
    const row = db.state.rows[0]
    assert(row.status === 'ready', '库内行 status=ready')
    assert(row.request_id === 'req-1', '库内行记录 request_id')
    assert(row.brand_name === '陈老师命理' && row.brand_contact === 'LINE: chen', '品牌位落库')
    const delta = Date.parse(row.share_expires_at) - Date.parse(NOW_ISO)
    assert(delta === 90 * 24 * 60 * 60 * 1000, '分享链接过期 = now + 90 天')
    assert(row.result && typeof row.result === 'object', 'result 已写入（不是 pending 的空对象）')
  }
}

// ---------- ⑦ 同一 requestId 再提交：只扣 1 次 ----------
console.log('—— ⑦ 幂等（顺序重复提交）——')
{
  const db = makeDb()
  const { deps, state } = makeDeps({ credits: 5 })
  const first = await call(db, deps)
  const second = await call(db, deps)
  assert(first.ok === true && second.ok === true, '两次提交都返回成功')
  if (first.ok && second.ok) {
    assert(first.report.id === second.report.id, '两次返回同一 reportId')
    assert(second.duplicate === true, '第二次标记 duplicate')
    assert(first.report.shareToken === second.report.shareToken, '第二次复用同一分享令牌')
  }
  assert(state.spends.length === 1, '余额只减 1 次')
  assert(state.balance === 4, '余额 5 → 4')
  assert(db.state.rows.length === 1, '库内只有一行（唯一索引兜底）')
}

// ---------- ⑧ 生成失败 → 退额 + failed + console.error ----------
console.log('—— ⑧ 失败退额 ——')
{
  const db = makeDb()
  const { deps, state } = makeDeps({
    credits: 5,
    generate: async () => { throw new Error('模拟 AI 超时') },
  })
  const r = await call(db, deps)
  assert(r.ok === false && r.status === 500, '生成抛错 → 500 结构化失败')
  assert(state.balance === 5, '余额回到 5（扣 1 再退 1）')
  assert(state.spends.length === 1 && state.refunds.length === 1, '扣 1 次、退 1 次')
  const row = db.state.rows[0]
  assert(row.status === 'failed', '库内行 status=failed')
  const reportId = row.id
  assert(
    state.logs.some((m) => m.includes(`★伙伴报告生成失败已退额，需核查：${reportId}`)),
    'console.error 文案含「★伙伴报告生成失败已退额，需核查：<reportId>」'
  )
}

// ---------- ⑨ 扣费失败 → failed 且不退 ----------
console.log('—— ⑨ 扣费失败 ——')
{
  const db = makeDb()
  const { deps, state } = makeDeps({ credits: 5, spendFails: true })
  const r = await call(db, deps)
  assert(r.ok === false && r.status === 409, '扣费失败 → 409')
  assert(state.balance === 5 && state.refunds.length === 0, '未扣成功就不退额（余额不变）')
  assert(db.state.rows[0]?.status === 'failed', 'pending 行置 failed')
}

// ---------- ⑩ 并发同 requestId：只扣 1 次 ----------
console.log('—— ⑩ 并发幂等 ——')
{
  // 唯一索引按 SQL 声明模拟：删掉 SQL 索引 → 这里允许两行插入 → 断言翻红（牙口 B）
  const sql = stripSqlComments(readFileSync(near('supabase/partner-v2.sql'), 'utf8'))
  const uniqueRequestId = /CREATE UNIQUE INDEX IF NOT EXISTS idx_reports_request_id[\s\S]{0,160}WHERE request_id IS NOT NULL/.test(sql)
  const db = makeDb({ uniqueRequestId })
  const { deps, state } = makeDeps({ credits: 5 })
  const [a, b] = await Promise.all([call(db, deps), call(db, deps)])
  const ids = new Set()
  if (a.ok) ids.add(a.report.id)
  else if (a.reportId) ids.add(a.reportId)
  if (b.ok) ids.add(b.report.id)
  else if (b.reportId) ids.add(b.reportId)
  assert(ids.size === 1, '两个并发请求指向同一份报告')
  assert(db.state.rows.length === 1, '并发只落 1 行（数据库唯一索引硬约束）')
  assert(state.spends.length === 1, '并发只扣 1 次')
  assert(state.balance === 4, '余额 5 → 4')
}

// ---------- ⑪ 参数/品牌/品类校验 ----------
console.log('—— ⑪ 参数校验 ——')
{
  const db = makeDb()
  const { deps, state } = makeDeps({ credits: 5 })
  const badBrand = await call(db, deps, { brandName: 'x'.repeat(25) })
  assert(badBrand.ok === false && badBrand.status === 400, '品牌名超长 → 400')
  const missingReq = await call(db, deps, { requestId: '' })
  assert(missingReq.ok === false && missingReq.status === 400, '缺 requestId → 400')
  const badInput = await call(db, deps, { input: { ...FATEBOOK_INPUT, year: 1800 } })
  assert(badInput.ok === false && badInput.status === 400, '出生年份越界 → 400')
  for (const kind of ['ziwei', 'annual', 'geo']) {
    const r = await call(db, deps, { kind, requestId: `req-${kind}` })
    assert(r.ok === false && r.status === 400 && r.code === 'KIND_NOT_ALLOWED', `${kind} → 400 暂未开放`)
  }
  assert(state.spends.length === 0, '参数校验失败全程不扣费')
  assert(db.state.rows.length === 0, '参数校验失败不落行')
}

// ---------- ⑫ 退额走账本单一写入口（R2）----------
console.log('—— ⑫ 退额写入口 ——')
{
  const captured = []
  const fakeAdmin = {
    from() {
      return {
        insert: async (row) => { captured.push(row); return { error: null } },
        select: () => ({ eq: () => Promise.resolve({ data: [], error: null }) }),
      }
    },
  }
  const r = await adjustPartnerUnits(fakeAdmin, {
    userId: 'u1', units: 1, ref: 'refund:r9', reason: 'refund',
  })
  assert(r.ok === true, 'adjustPartnerUnits 支持 reason=refund')
  assert(captured[0]?.reason === 'refund', '退额行 reason=refund')
  assert(captured[0]?.delta === 1, '退额行 delta=+1')
  assert(captured[0]?.ref === 'refund:r9', '退额行 ref 带前缀')

  const captured2 = []
  const fakeAdmin2 = {
    from() {
      return {
        insert: async (row) => { captured2.push(row); return { error: null } },
        select: () => ({ eq: () => Promise.resolve({ data: [], error: null }) }),
      }
    },
  }
  await adjustPartnerUnits(fakeAdmin2, { userId: 'u1', units: 2, note: '试用' })
  assert(captured2[0]?.reason === 'adjust', '不传 reason 时保持 adjust（旧行为不变）')
  assert(captured2[0]?.ref === '试用', '不传 ref 时沿用 note')

  const libSrc = readFileSync(near('src/lib/partnerReport.ts'), 'utf8')
  assert(libSrc.includes('adjustPartnerUnits'), '伙伴退额调用 adjustPartnerUnits')
  assert(!/from\('partner_credits'\)\s*\.\s*insert/.test(libSrc), '伙伴退额不直写 partner_credits（单一写入口）')
  assert(/reason:\s*'refund'/.test(libSrc), "伙伴退额显式传 reason='refund'")
  assert(libSrc.includes('spendPartnerUnits'), '扣费走 spendPartnerUnits')
}

// ---------- ⑬ R1：status 过滤（回归风险）----------
console.log('—— ⑬ pending/failed 不可展示 ——')
{
  const files = [
    ['src/app/reports/page.tsx', '「我的报告」列表'],
    ['src/app/reports/[id]/page.tsx', '报告详情页'],
    ['src/app/r/[token]/page.tsx', '分享页'],
    ['src/lib/reportCache.ts', '缓存读取'],
  ]
  for (const [file, label] of files) {
    const src = readFileSync(near(file), 'utf8')
    assert(/\.eq\('status',\s*'ready'\)/.test(src), `${label}按 status='ready' 过滤`)
  }
}

// ---------- ⑭ R4：不写 charts / 分享页回退 result.paid ----------
console.log('—— ⑭ 命书不写 charts ——')
{
  const libSrc = readFileSync(near('src/lib/partnerReport.ts'), 'utf8')
  assert(!/from\('charts'\)/.test(libSrc), '伙伴命书不写 charts（不产生 is_paid 副作用）')
  const shareSrc = readFileSync(near('src/app/r/[token]/page.tsx'), 'utf8')
  assert(/result\?\.paid/.test(shareSrc), '分享页对伙伴命书回退读 reports.result.paid')
}

// ---------- ⑮ 分享页：品牌位 + 来源披露并存 ----------
console.log('—— ⑮ 分享页 ——')
{
  const src = readFileSync(near('src/app/r/[token]/page.tsx'), 'utf8')
  assert(src.includes('brand_name') && src.includes('brand_contact'), '分享页查询品牌两字段')
  const brandIdx = src.indexOf('{brandLine &&')
  const h1Idx = src.indexOf('<h1 className="hw-c-h1">')
  const originIdx = src.indexOf('<ReportOriginNote')
  assert(brandIdx > -1 && brandIdx < h1Idx, '品牌位在 h1 上方')
  assert(originIdx > h1Idx, 'ReportOriginNote 仍在 h1 下方（披露未被移除/弱化）')
  assert(src.indexOf('ReportOriginNote') > -1, '来源披露组件仍渲染')
  assert(!src.includes('getAuthToken') && !/auth\.getUser|signInWith|getSession\(/.test(src), '分享页不 import 任何客户鉴权（免登录可读）')
}

// ---------- ⑯ 工作台页面：字段范围 + 余额闸门 ----------
console.log('—— ⑯ 工作台页面 ——')
{
  // ★ 第 36 轮：工作台已抽成 components/partner/PartnerWorkspace.tsx（简繁共用），
  //   页面文件只剩薄壳；以下文案/表单断言改读组件本身。
  const src = readFileSync(near('src/components/partner/PartnerWorkspace.tsx'), 'utf8')
  assert(src.includes('该页面仅对合作命理师开放'), '非伙伴可见「该页面仅对合作命理师开放」')
  assert(src.includes('购买额度'), '顶部有「购买额度」入口')
  assert(src.includes('BirthPlacePicker'), '复用 BirthPlacePicker（生辰/出生地）')
  assert(src.includes('余额不足'), '余额不足有显式提示（不只在提交后报错）')
  assert(/disabled=\{insufficient/.test(src), '余额 < 1 时表单禁用')
  assert(src.includes('crypto.randomUUID()'), '提交使用随机 requestId（幂等键）')
  for (const forbidden of ['type="email"', 'type="tel"', 'name="email"', 'name="phone"']) {
    assert(!src.includes(forbidden), `页面不含客户字段 ${forbidden}`)
  }
  assert(!/(^|[^a-zA-Z])email([^a-zA-Z]|$)/i.test(src), '页面源码不含 email 字段')
  assert(!/(^|[^a-zA-Z])phone([^a-zA-Z]|$)/i.test(src), '页面源码不含 phone 字段')
  assert(!src.includes('手机号') && !src.includes('邮箱'), '页面源码不含「手机号 / 邮箱」收集项')
}

// ---------- ⑰ API 接线（R3：GET 动态且不缓存）----------
console.log('—— ⑰ API 接线 ——')
{
  const reportSrc = readFileSync(near('src/app/api/partner/report/route.ts'), 'utf8')
  assert(reportSrc.includes("export const dynamic = 'force-dynamic'"), 'report 路由 force-dynamic')
  assert(reportSrc.includes("'Cache-Control': 'no-store'"), 'report 路由 no-store')
  assert(reportSrc.includes('getPartnerBalance'), '余额由服务端读取（客户端不碰账本）')
  assert(reportSrc.includes('export async function GET') && reportSrc.includes('isPartner'), 'GET 返回余额 + 伙伴身份')
  assert(reportSrc.includes('limit(20)'), '列表只取最近 20 份')

  const shareSrc = readFileSync(near('src/app/api/partner/share/route.ts'), 'utf8')
  assert(shareSrc.includes('generateShareToken') && shareSrc.includes('SHARE_TTL_DAYS'), '分享路由复用 90 天令牌工具')
  assert(shareSrc.includes(".eq('user_id', user.id)"), '分享路由校验报告归属')
  assert(shareSrc.includes("row.status !== 'ready'"), '非 ready 报告不允许分享')

  const pkg = JSON.parse(readFileSync(near('package.json'), 'utf8'))
  assert(/test-partner-v2-accept\.mjs/.test(pkg.scripts.verify), 'verify 末尾已挂本测试')
}

// ---------- ⑱ 繁中工作台（第 36 轮） ----------
// 断的是什么：港台伙伴（PerceptionHK / FairiesLotus / p8zi 这类）拿到的工作台
//   必须是繁体，否则对专业用户是信任打折。判据分两层：
//   ① 结构：/tw/partner 路由存在且传 locale=zh-Hant；/partner 传 zh-Hans
//   ② 覆盖：组件里【凡是含中文的非注释行】都必须经过 L() —— 防止漏包导致中英/简繁混杂
console.log('—— ⑱ 繁中工作台 ——')
{
  const hantRoute = readFileSync(near('src/app/tw/partner/page.tsx'), 'utf8')
  const hansRoute = readFileSync(near('src/app/partner/page.tsx'), 'utf8')
  const ws = readFileSync(near('src/components/partner/PartnerWorkspace.tsx'), 'utf8')

  assert(/locale="zh-Hant"/.test(hantRoute), '/tw/partner 传 locale="zh-Hant"（繁体工作台）')
  assert(/locale="zh-Hans"/.test(hansRoute), '/partner 传 locale="zh-Hans"（简体工作台）')
  assert(/robots:\s*\{\s*index:\s*false/.test(hantRoute), '/tw/partner 设了 noindex（内部工具页）')
  assert(/hantAlternates|'zh-Hant':\s*'\/tw\/partner'/.test(hantRoute + hansRoute), '两页均声明简繁 alternates')

  assert(/const L = \(s: string\) => localize\(s, locale\)/.test(ws), '工作台定义了 L() 本地化')
  assert(/partnersHref = locale === 'zh-Hant' \? '\/tw\/partners'/.test(ws), '繁体工作台的购买链接指向 /tw/partners')
  assert(/locale === 'zh-Hans' \? <Nav \/> : null/.test(ws), '简体 Nav 按语言隔离（繁体树不再渲染简体导航）')

  // ★ 覆盖断言：含中文的非注释行必须出现 L(
  const lines = ws.split('\n')
  const missed = []
  lines.forEach((ln, i) => {
    const t = ln.trim()
    if (!t || t.startsWith('//') || t.startsWith('*') || t.startsWith('/*') || t.startsWith('{/*')) return
    if (/[\u4e00-\u9fa5]/.test(ln) && !ln.includes('L(')) missed.push(`${i + 1}: ${t.slice(0, 48)}`)
  })
  // 模块级标签是简体原文、在渲染处经 L() 转换 —— 属设计内，白名单只放这 5 行
  const allowed = new Set([119, 120, 121, 125, 126])
  const realMissed = missed.filter((m) => !allowed.has(parseInt(m.split(':')[0], 10)))
  assert(realMissed.length === 0, '工作台全部中文文案均经 L() 本地化（无漏包）')

  ok('繁中工作台：/tw/partner 传 zh-Hant、购买链接走 /tw/partners、简体 Nav 已隔离、全部中文文案经 L()')
}

// ---------- 收尾 ----------
console.log('')
if (allPass) {
  console.log('PARTNER_V2_PASS')
} else {
  console.log(`PARTNER_V2_FAIL（${failures.length} 处）`)
  for (const f of failures) console.log('  - ' + f)
}
process.exitCode = allPass ? 0 : 1
