// 伙伴申请：查看与推进状态（运维工具，白标 v1）
//
// 用法：
//   npm run partners:list                 列出最近 20 条申请
//   npm run partners:list -- --status new 只看某个状态
//   npm run partners:list -- --set <id> contacted   推进状态
//
// 状态漏斗：new → contacted → trial（送 2 份） → active（已付费） / rejected
//
// 与 scripts/share-link.mjs 同一套基建：读 .env.local、走代理、结束时优雅关闭连接。
import { existsSync } from 'node:fs'
import { createClient } from '@supabase/supabase-js'

const STATUSES = ['new', 'contacted', 'trial', 'active', 'rejected']
const args = process.argv.slice(2)
const setIdx = args.indexOf('--set')
const statusIdx = args.indexOf('--status')

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

async function main() {
  // 推进状态
  if (setIdx >= 0) {
    const id = args[setIdx + 1]
    const next = args[setIdx + 2]
    if (!id || !next) {
      console.error('用法：npm run partners:list -- --set <id> <' + STATUSES.join('|') + '>')
      return 1
    }
    if (!STATUSES.includes(next)) {
      console.error(`状态必须是：${STATUSES.join(' / ')}`)
      return 1
    }
    const { data, error } = await admin
      .from('partner_applications')
      .update({ status: next })
      .eq('id', id)
      .select('id,name,status')
      .maybeSingle()
    if (error) { console.error('更新失败：', error.message, '（是否已跑 supabase/partners.sql？）'); return 1 }
    if (!data) { console.error(`找不到申请 ${id}`); return 1 }
    console.log(`已更新：${data.name} → ${data.status}`)
    return 0
  }

  // 列出
  const status = statusIdx >= 0 ? args[statusIdx + 1] : null
  if (status && !STATUSES.includes(status)) {
    console.error(`状态必须是：${STATUSES.join(' / ')}`)
    return 1
  }
  let q = admin
    .from('partner_applications')
    .select('id,name,contact_kind,contact,channel,volume,region,note,status,created_at')
    .order('created_at', { ascending: false })
    .limit(20)
  if (status) q = q.eq('status', status)

  const { data, error } = await q
  if (error) { console.error('查询失败：', error.message, '（是否已跑 supabase/partners.sql？）'); return 1 }
  if (!data.length) { console.log(status ? `没有 status=${status} 的申请` : '还没有申请'); return 0 }

  console.log(`最近 ${data.length} 条申请${status ? `（status=${status}）` : ''}\n`)
  for (const r of data) {
    console.log(`[${r.status}] ${r.name} · ${r.contact_kind}: ${r.contact}`)
    console.log(`   ${r.created_at.slice(0, 16).replace('T', ' ')} · 接单量 ${r.volume}` +
      (r.region ? ` · ${r.region}` : '') + (r.channel ? ` · ${r.channel}` : ''))
    if (r.note) console.log(`   备注：${r.note}`)
    console.log(`   id: ${r.id}\n`)
  }
  return 0
}

const code = await main().catch((e) => {
  console.error('执行失败：', e instanceof Error ? e.message : e)
  return 1
})
if (proxyDispatcher) { try { await proxyDispatcher.close() } catch { /* 即将退出 */ } }
process.exitCode = code
