// ★ 流量漏斗 · 行为验收（2026-10-21）
//
// ① 表与安全：events 表存在、RLS 开启、零策略（客户端不可直写）
// ② 上报接口：白名单事件名、service_role 客户端、props 只留短标量、8 键上限、字符串截断
// ③ 前端埋点：sendBeacon + fetch keepalive 兜底、模块顶层不碰 window
// ④ 接线：layout 挂 TrackPageView；首页成功分支记 paipan_submit；CheckoutButton 记 pay_click；
//         PreviewLock 的 UnlockCta 记 preview_view（字符串依赖，防重复触发）
// ⑤ 真调 route：非法事件名/缺 sid → 400 且零写入；合法 → 200 且落库过滤后的 props
//
// 牙口（文本不变、行为变坏；开发期手工注入验证后已复原）：
//   A 把 ALLOWED 改为只含 'page_view' → ⑤ 合法 name=pay_click 那条翻红
//   B 把 props 的 slice(0, 8) 改成不截断 → ⑤「超过 8 键被裁掉」翻红
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const read = (p) => readFileSync(path.join(root, p), 'utf8')

let allPass = true
const ok = (m) => console.log('  ✓ ' + m)
const fail = (m) => { allPass = false; console.log('  ✗ ' + m) }
const assert = (cond, m) => (cond ? ok(m) : fail(m))

// ── ① 表与安全 ─────────────────────────────────────────────
const sql = read('supabase/events.sql')
assert(/CREATE TABLE IF NOT EXISTS events/.test(sql), 'events.sql 建表语句存在')
assert(/ALTER TABLE events ENABLE ROW LEVEL SECURITY/.test(sql), 'events 表开启 RLS')
assert(!/CREATE POLICY/i.test(sql), 'events 表零策略（仅 service_role 可写，防客户端刷存储）')
assert(/utm_source/.test(sql) && /created_at/.test(sql), '包含来源归因与时间列')

// ── ② 上报接口 ─────────────────────────────────────────────
const route = read('src/app/api/track/route.ts')
assert(/createServerSupabase/.test(route), '上报接口使用 service_role 客户端')
assert(!/\bgetSupabase\b/.test(route), '上报接口绝不使用 anon 客户端')
for (const name of ['page_view', 'paipan_submit', 'preview_view', 'pay_click']) {
  assert(route.includes(`'${name}'`), `白名单包含 ${name}`)
}
assert(!/console\.log/.test(route), '上报接口无 console.log')

// ── ③ 前端埋点库 ───────────────────────────────────────────
const trackLib = read('src/lib/track.ts')
assert(/sendBeacon/.test(trackLib), '优先使用 sendBeacon（跳转前不丢事件）')
assert(/keepalive: true/.test(trackLib), 'fetch 兜底启用 keepalive')
assert(/typeof window === 'undefined'\)\s*return/.test(trackLib), '客户端库对服务端渲染做了守卫')
// 模块顶层不得出现 window 调用：截到第一个 export 之前
const topLevel = trackLib.split(/export /)[0]
assert(!/window\./.test(topLevel), '模块顶层不访问 window（site-audit 红线）')

// ── ④ 接线 ─────────────────────────────────────────────────
assert(/<TrackPageView \/>/.test(read('src/app/layout.tsx')), '根 layout 挂载 TrackPageView')

const home = read('src/app/page.tsx')
const successIdx = home.indexOf('if (data.success)')
const submitIdx = home.indexOf("track('paipan_submit')")
assert(successIdx > -1 && submitIdx > successIdx && submitIdx < home.indexOf("router.push('/chart')"), '首页仅在排盘成功后记 paipan_submit')

const checkout = read('src/components/CheckoutButton.tsx')
assert(/track\('pay_click', \{ sku \}\)/.test(checkout), 'CheckoutButton 记 pay_click')
assert(checkout.indexOf("track('pay_click'") < checkout.indexOf("router.push('/auth')"), 'pay_click 在登录跳转前记录（未登录也计入）')

const preview = read('src/components/reports/PreviewLock.tsx')
assert(/track\('preview_view'/.test(preview), 'UnlockCta 记 preview_view')
assert(/const skuKey = skus\.join\(','\)/.test(preview), 'effect 依赖用字符串，避免数组引用导致重复上报')

// ── ④b 分享链路 ─────────────────────────────────────────────
const share = read('src/components/ShareLink.tsx')
assert(/utm_source/.test(share) && /utm_medium/.test(share), '分享链接带 UTM 归因')
assert(/ml_ref/.test(share), '分享链接继续携带 ref 码')
assert(/navigator\.share/.test(share) && /clipboard\.writeText/.test(share), '优先系统分享，降级复制链接')
assert(/rememberRef/.test(read('src/components/TrackPageView.tsx')), '落地页记住 ref 码')
assert(/<ShareLink/.test(read('src/app/daily/page.tsx')), '日签页挂载分享按钮')
assert(/<ShareLink/.test(read('src/app/chart/page.tsx')), '排盘结果页挂载分享按钮')

// ── ④c 邀请奖励 ─────────────────────────────────────────────
const invitesSql = read('supabase/invites.sql')
assert(/CREATE TABLE IF NOT EXISTS invites/.test(invitesSql), 'invites.sql 建表存在')
assert(/UNIQUE \(invitee_id\)/.test(invitesSql), '被邀请人唯一（一人只能被领一次）')
assert(/invitee_id <> .*inviter_id|inviter_id <> invitee_id/.test(invitesSql), '禁止自己邀请自己')
assert(/ENABLE ROW LEVEL SECURITY/.test(invitesSql), 'invites 开启 RLS')
assert(!/CREATE POLICY/i.test(invitesSql), 'invites 零策略（仅 service_role 可写）')
assert(/'invite'/.test(invitesSql), 'credit_source 允许值含 invite')

const claim = read('src/app/api/invite/claim/route.ts')
assert(/admin\.auth\.getUser\(token\)/.test(claim), '领取接口先校验登录 token')
assert(/from\('profiles'\)[\s\S]*?\.like\('id'/.test(claim), '邀请人由服务端按前缀反查，不信任前端 id')
assert(/neq\('id', user\.id\)/.test(claim), '不能邀请自己')
assert(/23505/.test(claim), '重复领取按已处理（不报错）')
assert(!/console\.log/.test(claim), '领取接口无 console.log')

const trackPage = read('src/components/TrackPageView.tsx')
assert(/\/api\/invite\/claim/.test(trackPage), '落地页触发邀请领取')
assert(/ml_ref_claimed/.test(trackPage), '领取结果本地标记，避免重复请求')

// ── ⑤ 真调 route ───────────────────────────────────────────
const { setServerSupabaseForTest } = await import('../src/lib/supabase.ts')
const { POST } = await import('../src/app/api/track/route.ts')

const inserted = []
setServerSupabaseForTest({
  from(table) {
    if (table !== 'events') throw new Error('unexpected table ' + table)
    return {
      insert: async (row) => {
        inserted.push(row)
        return { error: null }
      },
    }
  },
})

const post = (body) =>
  POST(
    new Request('http://localhost/api/track', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    }),
  )

const bad = await post({ name: 'drop table', sid: 'sid-123456' })
assert(bad.status === 400 && inserted.length === 0, '非法事件名 → 400 且零写入')

const noSid = await post({ name: 'page_view' })
assert(noSid.status === 400 && inserted.length === 0, '缺 sid → 400 且零写入')

const longProps = { a: 'x'.repeat(200), n: 3, b: true, nested: { evil: 1 } }
for (let i = 0; i < 10; i++) longProps['k' + i] = i
const good = await post({
  name: 'pay_click',
  sid: 'sid-123456',
  path: '/pricing',
  utm: { source: 'reddit', medium: 'social', campaign: 'launch' },
  referrer: 'https://www.reddit.com/r/Bazi/',
  props: longProps,
})
assert(good.status === 200 && inserted.length === 1, '合法事件 → 200 且写入一行')
const row = inserted[0]
assert(row.name === 'pay_click' && row.sid === 'sid-123456', '落库字段与入参一致')
assert(row.utm_source === 'reddit' && row.utm_campaign === 'launch', '来源归因落库')
// 入参顺序：a,n,b,nested,k0..k9 → 先截前 8 个（到 k3），再丢掉 nested ⇒ 7 个键，k4 起被裁掉
assert(Object.keys(row.props).length === 7 && !('k4' in row.props), 'props 最多保留 8 键（超出部分裁掉）')
assert(row.props.a.length === 120, '超长字符串截断到 120 字符')
assert(!('nested' in row.props), '嵌套对象被丢弃（防存储滥用）')

setServerSupabaseForTest(null)

console.log(allPass ? '\nALL PASS' : '\nFAILED')
process.exit(allPass ? 0 : 1)
