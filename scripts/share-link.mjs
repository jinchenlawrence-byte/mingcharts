// 报告分享链接（运维工具，命理师白标 v1）
//
// 用法：
//   npm run share:link <reportId>             建链接（已有有效链接则直接打印，幂等）
//   npm run share:link -- --revoke <reportId> 吊销（客户立即看不到）
//   npm run share:link -- --show <reportId>   只看状态，不改动
//
// 为什么是脚本而不是 API：v1 阶段是我们人工接单，没有对外发令牌的入口 ——
// 少一个公开接口就少一个攻击面。等 /partners 工作台上线再收回到后台。
//
// 需要 .env.local：NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY（service_role 绕过 RLS）
// ★ 必须走代理：本机直连 Supabase 会被 SNI 干扰（见 src/lib/supabase.ts:31-47）。
import { existsSync } from 'node:fs'
import { createClient } from '@supabase/supabase-js'
import {
  generateShareToken, shareExpiryFrom, shareUrl, isShareActive, SHARE_TTL_DAYS,
} from '../src/lib/reportShare.ts'

const USAGE = '用法：npm run share:link -- <reportId> | --revoke <reportId> | --show <reportId>'

const args = process.argv.slice(2)
const revoke = args.includes('--revoke')
const showOnly = args.includes('--show')
const reportId = args.find((a) => !a.startsWith('--'))

/** 代理句柄：结束时必须显式关闭（见文件末尾的说明） */
let proxyDispatcher = null

async function setupProxy() {
  const proxyUrl = process.env.HTTPS_PROXY || process.env.HTTP_PROXY
  if (!proxyUrl || process.env.NO_PROXY_OVERRIDE) return
  try {
    const { ProxyAgent, setGlobalDispatcher } = await import('undici')
    proxyDispatcher = new ProxyAgent(proxyUrl)
    setGlobalDispatcher(proxyDispatcher)
    console.log(`（已启用代理 ${proxyUrl}）`)
  } catch (e) {
    console.warn('（代理配置失败，将直连）', e instanceof Error ? e.message : e)
  }
}

async function main() {
  if (!reportId) {
    console.error(USAGE)
    return 1
  }
  if (existsSync('.env.local')) process.loadEnvFile('.env.local')
  await setupProxy()

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) {
    console.error('缺少 NEXT_PUBLIC_SUPABASE_URL 或 SUPABASE_SERVICE_ROLE_KEY（检查 .env.local）')
    return 1
  }

  const admin = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } })

  const { data: row, error } = await admin
    .from('reports')
    .select('id,kind,title,share_token,share_expires_at,share_revoked_at')
    .eq('id', reportId)
    .maybeSingle()

  if (error) {
    // fetch failed 几乎一定是网络/代理问题，不是 SQL 问题 —— 别让人去翻库
    const hint = /fetch failed/i.test(error.message)
      ? `\n  → 连不上 Supabase。检查：① .env.local 的 HTTPS_PROXY（当前：${process.env.HTTPS_PROXY || '未设置'}）② 代理是否在跑 ③ reportId 是否拼对`
      : ''
    console.error('查询失败：', error.message, hint)
    return 1
  }
  if (!row) {
    console.error(`找不到报告 ${reportId}`)
    return 1
  }

  const status = isShareActive(row) ? '有效' : row.share_token ? '已失效' : '未建链接'
  console.log(`报告：${row.title}`)
  console.log(`类型：${row.kind} · 状态：${status}`)
  // ★ 只打印仍然有效的链接：已吊销/已过期的令牌不该出现在终端里（会被误发给客户）
  if (row.share_token && isShareActive(row)) console.log(`链接：${shareUrl(row.share_token)}`)
  if (row.share_token && !isShareActive(row)) console.log('（旧链接已失效，重建会换一个新令牌）')
  if (row.share_expires_at && isShareActive(row)) console.log(`过期：${new Date(row.share_expires_at).toLocaleString()}`)

  if (showOnly) return 0

  if (revoke) {
    if (!row.share_token) {
      console.log('该报告还没有分享链接，无需吊销')
      return 0
    }
    const { error: e2 } = await admin
      .from('reports')
      .update({ share_revoked_at: new Date().toISOString() })
      .eq('id', reportId)
    if (e2) {
      console.error('吊销失败：', e2.message)
      return 1
    }
    console.log('已吊销：该链接立刻失效（客户再打开会看到「已被关闭」）')
    return 0
  }

  // 建链接：已有有效链接就复用（幂等）；失效/过期的换新令牌
  if (isShareActive(row)) {
    console.log('已存在有效链接，直接复用（未改动数据库）')
    return 0
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
    return 1
  }

  console.log(`\n新链接（${SHARE_TTL_DAYS} 天有效）：`)
  console.log(shareUrl(token))
  console.log('\n把这条发给客户即可；对方无需注册，也能在页面里「打印 / 存为 PDF」。')
  return 0
}

const code = await main().catch((e) => {
  console.error('执行失败：', e instanceof Error ? e.message : e)
  return 1
})

// ★ Windows 上 process.exit() 撞上 undici 正在关闭的代理连接会触发
//   libuv assertion（!(handle->flags & UV_HANDLE_CLOSING)）——输出正常但退出码变 1。
//   故这里显式关掉 dispatcher，再用 exitCode 让 Node 自然退出，不调 process.exit。
if (proxyDispatcher) {
  try { await proxyDispatcher.close() } catch { /* 关不掉也无所谓，进程即将退出 */ }
}
process.exitCode = code
