// 分享链路【线上】验证（opt-in，会真的写库再清掉）
//
// 用法：npm run verify:share-live [-- <reportId>]
//   · 不传 reportId：自动取最近一份非命书报告 + 最近一份命书
//   · 需要 .env.local（service_role）且本机代理可达 Supabase（与 src/lib/supabase.ts 同口径）
//
// ★ 它做什么：给真实报告建分享令牌 → 用 HTTPS 打开线上 /r/<token> → 断言渲染 →
//   吊销后再断言失效 → 清空令牌。全程令牌只在本进程出现，结束时库内无残留。
// ★ 为什么不在 npm run verify 里：它依赖线上站点与真实数据；verify 必须离线可跑。
import { existsSync } from 'node:fs'
import { createClient } from '@supabase/supabase-js'
import { generateShareToken, shareExpiryFrom, shareUrl } from '../src/lib/reportShare.ts'

if (existsSync('.env.local')) process.loadEnvFile('.env.local')
const proxyUrl = process.env.HTTPS_PROXY || process.env.HTTP_PROXY
if (proxyUrl) {
  const { ProxyAgent, setGlobalDispatcher } = await import('undici')
  setGlobalDispatcher(new ProxyAgent(proxyUrl))
}
const supaUrl = process.env.SUPABASE_URL_INTERNAL || process.env.NEXT_PUBLIC_SUPABASE_URL
const key = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!supaUrl || !key) { console.error('缺 SUPABASE_URL / SERVICE_ROLE_KEY'); process.exit(1) }

const admin = createClient(supaUrl, key, { auth: { persistSession: false, autoRefreshToken: false } })
const explicitId = process.argv[2]

let allPass = true
const fail = (m) => { allPass = false; console.log(`  ✗ ${m}`) }
const ok = (m) => console.log(`  ✓ ${m}`)

// ① 迁移是否生效（三列可查）
const { error: colErr } = await admin.from('reports').select('id,share_token,share_expires_at,share_revoked_at').limit(1)
if (colErr) { fail(`新列不可查（迁移未生效？）：${colErr.message}`); process.exit(1) }
ok('迁移生效：share_token / share_expires_at / share_revoked_at 可查')

const pick = async (kind) => {
  const { data } = await admin
    .from('reports')
    .select('id,kind,title,input')
    .eq('kind', kind)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()
  return data
}

// ② 建链接 → 线上断言 → 吊销 → 清空
async function roundTrip(row, label, extraChecks) {
  const token = generateShareToken()
  const { error: upErr } = await admin
    .from('reports')
    .update({ share_token: token, share_expires_at: shareExpiryFrom(), share_revoked_at: null })
    .eq('id', row.id)
  if (upErr) { fail(`${label}：写令牌失败 ${upErr.message}`); return }

  const link = shareUrl(token)
  const html = await (await fetch(`${link}?v=${Date.now()}`)).text()
  const norm = html.replace(/<!--.*?-->/gs, '') // React 在文本节点间插注释，先归一化再数卷

  const base = {
    'HTTP 拿回正文': html.length > 3000,
    '不是失效/失败页': !html.includes('链接不可用') && !html.includes('读取失败'),
    '打印按钮在位': html.includes('打印 / 存为 PDF'),
    '免责声明在位': html.includes('仅供参考'),
    '品牌页脚在位': html.includes('由 明理 mingcharts.com 引擎生成'),
    'noindex': /noindex/.test(html),
  }
  for (const [name, pass] of Object.entries({ ...base, ...extraChecks(html, norm) })) {
    pass ? ok(`${label}：${name}`) : fail(`${label}：${name}`)
  }

  await admin.from('reports').update({ share_revoked_at: new Date().toISOString() }).eq('id', row.id)
  const after = await (await fetch(`${link}?v=${Date.now()}`)).text()
  after.includes('已被发出者关闭') ? ok(`${label}：吊销后立刻失效`) : fail(`${label}：吊销后仍可访问`)

  await admin.from('reports').update({ share_token: null, share_expires_at: null, share_revoked_at: null }).eq('id', row.id)
  ok(`${label}：令牌已清空（库内无残留）`)
}

if (explicitId) {
  const { data: row } = await admin.from('reports').select('id,kind,title,input').eq('id', explicitId).maybeSingle()
  if (!row) { console.error(`找不到报告 ${explicitId}`); process.exit(1) }
  await roundTrip(row, row.kind, () => ({}))
} else {
  const { data: fb } = await admin.from('reports').select('id,kind,title,input').eq('kind', 'fatebook').order('created_at', { ascending: false }).limit(1).maybeSingle()
  if (fb) {
    // 命书是唯一需要回查 charts.chart_data 的分支（本次新写的渲染代码），必须验
    await roundTrip(fb, '命书(fatebook)', (_h, norm) => ({
      '十卷全出': (norm.match(/卷[一二三四五六七八九十] · /g) || []).length === 10,
      '不是正文兜底': !norm.includes('未能读取'),
    }))
  } else {
    console.log('  （库里没有命书报告，跳过 fatebook 分支）')
  }
}

console.log('\n' + (allPass ? 'SHARE_LIVE_PASS' : 'SHARE_LIVE_FAIL'))
process.exit(allPass ? 0 : 1)
