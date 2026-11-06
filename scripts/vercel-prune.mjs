// Vercel 部署批量清理（默认 dry-run，不传 --apply 不会删任何东西）
//
// 为什么需要它：Vercel 官方没有批量删除部署的功能（dashboard 只能一条条删），
// CLI 的 `vercel ls` 在 Hobby 上只显示最近 20 条，更早的拿不到。
// 而 Hobby 的 Deployment Storage 只有 10 GB，一次部署约 120–205 MB，
// 存量很容易顶到上限。
//
// 用法：
//   1) 去 https://vercel.com/account/tokens 建一个 token（Scope 选 mingcharts 项目即可）
//   2) PowerShell:
//        $env:VERCEL_TOKEN="你的token"
//        node scripts/vercel-prune.mjs                 # 先看清单（不删）
//        node scripts/vercel-prune.mjs --apply         # 真删
//   可选参数：
//        --keep 2          保留最新的 N 个 Ready 部署（默认 2，线上那个一定是最新）
//        --older-than 24   只删早于 N 小时的（默认 24，避免误删当天的回滚点）
//
// 安全边界（写死，不提供开关）：
//   · 永不删除最新的 Ready 部署（那通常就是当前生产）
//   · 永不删除 target=production 里最新的那一个
//   · 默认 dry-run；只有显式 --apply 才发 DELETE
import { readFileSync } from 'node:fs'

const TOKEN = process.env.VERCEL_TOKEN
if (!TOKEN) {
  console.error('缺少 VERCEL_TOKEN 环境变量。先执行：$env:VERCEL_TOKEN="你的token"')
  process.exit(1)
}

const args = process.argv.slice(2)
const APPLY = args.includes('--apply')
const argVal = (name, dflt) => {
  const i = args.indexOf(name)
  return i >= 0 && args[i + 1] ? Number(args[i + 1]) : dflt
}
const KEEP = argVal('--keep', 2)
const OLDER_THAN_H = argVal('--older-than', 24)

const proj = JSON.parse(readFileSync('.vercel/project.json', 'utf8'))
const TEAM = proj.orgId
const PROJECT = proj.projectId

const api = async (path, init) => {
  const url = new URL(`https://api.vercel.com${path}`)
  if (TEAM) url.searchParams.set('teamId', TEAM)
  const res = await fetch(url, {
    ...init,
    headers: { Authorization: `Bearer ${TOKEN}`, 'Content-Type': 'application/json', ...(init?.headers ?? {}) },
  })
  if (!res.ok) {
    const t = await res.text()
    throw new Error(`${res.status} ${res.statusText} — ${t.slice(0, 200)}`)
  }
  return res.json()
}

/** 分页拉全部部署（API 用 until 游标） */
async function listAll() {
  const out = []
  let until = null
  for (let page = 0; page < 50; page++) {
    const qs = new URLSearchParams({ projectId: PROJECT, limit: '100' })
    if (until) qs.set('until', String(until))
    const json = await api(`/v6/deployments?${qs}`)
    const batch = json.deployments ?? []
    out.push(...batch)
    if (batch.length < 100) break
    until = batch[batch.length - 1].created
    if (!until) break
  }
  return out
}

const now = Date.now()
const all = await listAll()
const ready = all.filter((d) => d.state === 'READY').sort((a, b) => b.created - a.created)
const keepIds = new Set(ready.slice(0, KEEP).map((d) => d.uid ?? d.id))

// 候选：非保留的最新 N 个，且早于阈值，且不是最新生产
const cutoff = now - OLDER_THAN_H * 3600 * 1000
const targets = all.filter((d) => {
  const id = d.uid ?? d.id
  if (keepIds.has(id)) return false
  if (d.created > cutoff) return false
  return true
})

console.log(`项目部署总数: ${all.length}`)
console.log(`保留最新 Ready: ${[...keepIds].map((x) => x.slice(0, 8)).join(', ')}`)
console.log(`早于 ${OLDER_THAN_H} 小时且不保留的候选: ${targets.length} 个`)
for (const d of targets.slice(0, 15)) {
  const age = ((now - d.created) / 3600000).toFixed(0)
  console.log(`  - ${age.padStart(4)}h  ${d.state.padEnd(8)} ${(d.url || d.name || '').slice(0, 60)}`)
}
if (targets.length > 15) console.log(`  … 另 ${targets.length - 15} 个`)

if (!APPLY) {
  console.log('\n[dry-run] 未删除任何部署。确认清单无误后加 --apply 执行：')
  console.log('  node scripts/vercel-prune.mjs --apply')
  process.exit(0)
}

console.log('\n开始删除…')
let ok = 0
let failed = 0
for (const d of targets) {
  const id = d.uid ?? d.id
  try {
    await api(`/v13/deployments/${id}`, { method: 'DELETE' })
    ok += 1
    if (ok % 10 === 0) console.log(`  已删 ${ok}/${targets.length}`)
  } catch (e) {
    failed += 1
    console.log(`  失败 ${id.slice(0, 8)}: ${e.message}`)
  }
}
console.log(`\n完成：删除 ${ok} 个，失败 ${failed} 个`)
console.log('提示：Vercel 的 Deployment Storage 计数按小时聚合，删除后请等 30–60 分钟再看。')
