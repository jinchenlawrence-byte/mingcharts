// 报告分享链接（运维工具，命理师白标 v1）
//
// 用法：
//   node scripts/share-link.mjs <reportId>            建链接（已有有效链接则直接打印，幂等）
//   node scripts/share-link.mjs --revoke <reportId>   吊销（客户立即看不到）
//   node scripts/share-link.mjs --show <reportId>     只看当前状态，不改动
//
// 为什么是脚本而不是 API：v1 阶段是我们人工接单，没有对外发令牌的入口 ——
// 少一个公开接口就少一个攻击面。等 /partners 工作台上线再收回到后台。
//
// 需要 .env.local：NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY（service_role 绕过 RLS）
import { existsSync } from 'node:fs'
import { createClient } from '@supabase/supabase-js'
import {
  generateShareToken, shareExpiryFrom, shareUrl, isShareActive, SHARE_TTL_DAYS,
} from '../src/lib/reportShare.ts'

const args = process.argv.slice(2)
const revoke = args.includes('--revoke')
const showOnly = args.includes('--show')
const reportId = args.find((a) => !a.startsWith('--'))

if (!reportId) {
  console.error('用法：node scripts/share-link.mjs <reportId> | --revoke <reportId> | --show <reportId>')
  process.exit(1)
}

if (existsSync('.env.local')) process.loadEnvFile('.env.local')

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const key = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!url || !key) {
  console.error('缺少 NEXT_PUBLIC_SUPABASE_URL 或 SUPABASE_SERVICE_ROLE_KEY（检查 .env.local）')
  process.exit(1)
}

const admin = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } })

const { data: row, error } = await admin
  .from('reports')
  .select('id,kind,title,share_token,share_expires_at,share_revoked_at')
  .eq('id', reportId)
  .maybeSingle()

if (error) {
  console.error('查询失败：', error.message)
  process.exit(1)
}
if (!row) {
  console.error(`找不到报告 ${reportId}`)
  process.exit(1)
}

const status = isShareActive(row) ? '有效' : row.share_token ? '已失效' : '未建链接'
console.log(`报告：${row.title}`)
console.log(`类型：${row.kind} · 状态：${status}`)
if (row.share_token) console.log(`链接：${shareUrl(row.share_token)}`)
if (row.share_expires_at) console.log(`过期：${new Date(row.share_expires_at).toLocaleString()}`)

if (showOnly) process.exit(0)

if (revoke) {
  if (!row.share_token) {
    console.log('该报告还没有分享链接，无需吊销')
    process.exit(0)
  }
  const { error: e2 } = await admin
    .from('reports')
    .update({ share_revoked_at: new Date().toISOString() })
    .eq('id', reportId)
  if (e2) {
    console.error('吊销失败：', e2.message)
    process.exit(1)
  }
  console.log('已吊销：该链接立刻失效（客户再打开会看到「已被关闭」）')
  process.exit(0)
}

// 建链接：已有有效链接就复用（幂等）；失效/过期的换新令牌
if (isShareActive(row)) {
  console.log('已存在有效链接，直接复用（未改动数据库）')
  process.exit(0)
}

const token = generateShareToken()
const { error: e3 } = await admin
  .from('reports')
  .update({
    share_token: token,
    share_expires_at: shareExpiryFrom(new Date(), SHARE_TTL_DAYS),
    share_revoked_at: null,
  })
  .eq('id', reportId)

if (e3) {
  console.error('写入失败：', e3.message, '（是否已跑 supabase/share.sql？）')
  process.exit(1)
}

console.log(`\n新链接（${SHARE_TTL_DAYS} 天有效）：`)
console.log(shareUrl(token))
console.log('\n把这条发给客户即可；对方无需注册，也能在页面里「打印 / 存为 PDF」。')
