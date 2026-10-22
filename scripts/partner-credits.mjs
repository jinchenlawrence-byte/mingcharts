// 伙伴额度：查看 / 扣减 / 人工调整（运维工具，白标 v1）
//
// 用法：
//   npm run partners:credits                          列出所有伙伴余额
//   npm run partners:credits -- --balance <email|id>  查单个余额与流水
//   npm run partners:credits -- --consume <email|id> --units 1 --ref <reportId>
//   npm run partners:credits -- --grant <email|id> --units 2 --note "审核通过送 2 份"
//
// ★ 为什么交付靠脚本而不是自助：v1 是人工接单，伙伴发来客户生辰、我们出报告再回传链接。
//   扣减的幂等键是【报告 id】——同一份报告重复调用不会多扣。
import { existsSync } from 'node:fs'
import { createClient } from '@supabase/supabase-js'

const args = process.argv.slice(2)
const flag = (name) => {
  const i = args.indexOf(name)
  return i >= 0 ? args[i + 1] : null
}

let proxyDispatcher = null
if (existsSync('.env.local')) process.loadEnvFile('.env.local')
const proxyUrl = process.env.HTTPS_PROXY || process.env.HTTP_PROXY
if (proxyUrl) {
  const { ProxyAgent, setGlobalDispatcher } = await import('undici')
  proxyDispatcher = new ProxyAgent(proxyUrl)
  setGlobalDispatcher(proxyDispatcher)
}
const url = process.env.SUPABASE_URL_INTERNAL || process.env.NEXT_PUBLIC_SUPABASE_URL
const key = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!url || !key) {
  console.error('缺少 SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY（检查 .env.local）')
  process.exit(1)
}
const admin = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } })

/** 邮箱或 uuid → 用户 id */
async function resolveUser(who) {
  if (!who) return null
  if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(who)) return who
  const { data, error } = await admin.from('profiles').select('id,email').eq('email', who).maybeSingle()
  if (error) throw new Error(error.message)
  if (!data) throw new Error(`找不到邮箱为 ${who} 的用户`)
  return data.id
}

async function main() {
  const wantList = args.includes('--list') || args.length === 0
  const consumeWho = flag('--consume')
  const grantWho = flag('--grant')
  const balanceWho = flag('--balance')

  // 表是否存在，先探一次（缺迁移时给明确提示，而不是抛 schema cache 错）
  const probe = await admin.from('partner_credits').select('id').limit(1)
  if (probe.error) {
    console.error('读取失败：', probe.error.message, '\n  → 是否已跑 supabase/partner-credits.sql？')
    return 1
  }

  if (wantList) {
    const { data } = await admin
      .from('partner_credits')
      .select('user_id,delta')
    const byUser = new Map()
    for (const r of data ?? []) {
      byUser.set(r.user_id, (byUser.get(r.user_id) ?? 0) + r.delta)
    }
    if (!byUser.size) { console.log('还没有任何伙伴额度记录（等第一笔购买）'); return 0 }
    const ids = [...byUser.keys()]
    const { data: profs } = await admin.from('profiles').select('id,email').in('id', ids)
    const emailOf = new Map((profs ?? []).map((p) => [p.id, p.email]))
    console.log('伙伴余额（份）\n')
    for (const [uid, bal] of [...byUser.entries()].sort((a, b) => b[1] - a[1])) {
      console.log(`  ${String(bal).padStart(4)} 份  ${emailOf.get(uid) ?? '(无邮箱)'}  ${uid}`)
    }
    return 0
  }

  if (balanceWho) {
    const uid = await resolveUser(balanceWho)
    const { data } = await admin
      .from('partner_credits')
      .select('delta,reason,ref,created_at')
      .eq('user_id', uid)
      .order('created_at', { ascending: false })
    const bal = (data ?? []).reduce((s, r) => s + r.delta, 0)
    console.log(`用户 ${balanceWho} 当前余额：${bal} 份\n流水：`)
    for (const r of data ?? []) {
      console.log(`  ${r.created_at.slice(0, 16).replace('T', ' ')}  ${String(r.delta).padStart(4)}  ${r.reason.padEnd(8)} ${r.ref ?? ''}`)
    }
    return 0
  }

  if (consumeWho) {
    const uid = await resolveUser(consumeWho)
    const units = Number(flag('--units') ?? 1)
    const ref = flag('--ref')
    if (!ref) { console.error('必须给 --ref <reportId>（幂等键：同一份报告只扣一次）'); return 1 }
    const { data } = await admin.from('partner_credits').select('delta').eq('user_id', uid)
    const bal = (data ?? []).reduce((s, r) => s + r.delta, 0)
    if (bal < units) { console.error(`余额不足：当前 ${bal} 份，需要 ${units} 份`); return 1 }
    const { error } = await admin.from('partner_credits').insert({
      user_id: uid, delta: -units, reason: 'consume', ref,
    })
    if (error && error.code !== '23505') { console.error('扣减失败：', error.message); return 1 }
    const { data: after } = await admin.from('partner_credits').select('delta').eq('user_id', uid)
    console.log(`已扣减 ${units} 份（ref=${ref}）${error?.code === '23505' ? '；该报告已扣过，未重复扣' : ''}`)
    console.log(`剩余：${(after ?? []).reduce((s, r) => s + r.delta, 0)} 份`)
    return 0
  }

  if (grantWho) {
    const uid = await resolveUser(grantWho)
    const units = Number(flag('--units') ?? 2)
    const note = flag('--note') ?? 'manual-adjust'
    if (!Number.isInteger(units) || units === 0) { console.error('--units 必须是非零整数'); return 1 }
    const { error } = await admin.from('partner_credits').insert({
      user_id: uid, delta: units, reason: 'adjust', ref: note,
    })
    if (error) { console.error('调整失败：', error.message); return 1 }
    const { data } = await admin.from('partner_credits').select('delta').eq('user_id', uid)
    console.log(`已调整 ${units > 0 ? '+' : ''}${units} 份（${note}）· 余额 ${(data ?? []).reduce((s, r) => s + r.delta, 0)} 份`)
    return 0
  }

  console.error('用法：--list | --balance <email|id> | --consume <email|id> --units N --ref <reportId> | --grant <email|id> --units N --note "..."')
  return 1
}

const code = await main().catch((e) => {
  console.error('执行失败：', e instanceof Error ? e.message : e)
  return 1
})
if (proxyDispatcher) { try { await proxyDispatcher.close() } catch { /* 即将退出 */ } }
process.exitCode = code
