// 免费日运试用验收（第 36 轮）
//
// 断的是什么：
//   ① 日运推送受众 = 会员 ∪ 注册未满 3 天的新用户（此前只有会员，非会员没有任何回来的提醒）
//   ② 试用只「加受众」，不改任何会员列（会员判定只读）
//   ③ 受众去重（同一用户既会员又在试用期，只能推一次）
//   ④ 首页（简繁）都有日运与免费查神煞入口
//   ⑤ 牙口：把试用天数改成 0 / 去掉并集 → 必须红
//
// ★ 全程离线：只读源码。
import { readFileSync } from 'node:fs'

let allPass = true
const failures = []
function fail(msg) {
  allPass = false
  failures.push(msg)
  console.log('  ✗ ' + msg)
}
function ok(msg) {
  console.log('  · ' + msg)
}
function assert(cond, msg, failMsg) {
  if (cond) ok(msg)
  else fail(failMsg ?? msg)
}

const REPO = readFileSync('src/lib/push-repo.ts', 'utf8')
const ROUTE = readFileSync('src/app/api/cron/daily-push/route.ts', 'utf8')
const HOME = readFileSync('src/app/(zh)/HomeClient.tsx', 'utf8')
const TW_HOME = readFileSync('src/app/tw/page.tsx', 'utf8')

console.log('—— ① 试用受众 ——')
{
  assert(/const DAILY_TRIAL_DAYS = 3/.test(ROUTE),
    '试用天数 = 3 天（DAILY_TRIAL_DAYS）',
    '试用天数不是 3（DAILY_TRIAL_DAYS 缺失或被改）')
  assert(/listTrialUserIds/.test(REPO) && /gte\('created_at', sinceIso\)/.test(REPO),
    '仓储层按 profiles.created_at 取试用用户',
    '仓储层缺少按注册时间取试用用户的实现')
  assert(/listTrialUserIds\(trialSince\)/.test(ROUTE),
    '推送路由调用了试用受众查询',
    '推送路由没有把试用用户纳入受众')
  assert(/new Set\(\[\.\.\.memberIds, \.\.\.trialIds\]\)/.test(ROUTE),
    '受众做了去重（会员 ∩ 试用期不重复推）',
    '受众未去重（同一用户可能收到两条）')
}

console.log('—— ② 会员判定只读 ——')
{
  assert(!/is_member\s*:|update\(|upsert\(/.test(ROUTE),
    '推送路由不写任何会员列（只读）',
    '推送路由出现写操作（会员判定必须只读）')
  assert(/member_expire_at/.test(REPO),
    '会员判定仍以 member_expire_at 为准（口径未变）',
    '会员判定口径被改动')
}

console.log('—— ③ 首页入口 ——')
{
  assert(/href="\/daily"/.test(HOME),
    '简体首页有日运入口',
    '简体首页没有日运入口')
  assert(/href="\/shensha\/check"/.test(HOME),
    '简体首页有免费查神煞入口',
    '简体首页没有免费查神煞入口')
  assert(/href="\/tw\/daily"/.test(TW_HOME),
    '繁体首页有日运入口',
    '繁体首页没有日运入口')
  assert(/\/tw\/shensha\/check/.test(TW_HOME),
    '繁体首页有免费查神煞入口',
    '繁体首页没有免费查神煞入口')
}

console.log('—— ④ 牙口自检 ——')
{
  // 判据自检：把源码里的 3 改成 0，正则应判红
  const broken = ROUTE.replace('const DAILY_TRIAL_DAYS = 3', 'const DAILY_TRIAL_DAYS = 0')
  assert(!/const DAILY_TRIAL_DAYS = 3/.test(broken),
    '牙口判据有效：试用天数被改成 0 能被检出',
    '牙口失效：把试用天数改成 0 仍判绿')

  const noUnion = ROUTE.replace('new Set([...memberIds, ...trialIds])', 'memberIds')
  assert(!/new Set\(\[\.\.\.memberIds, \.\.\.trialIds\]\)/.test(noUnion),
    '牙口判据有效：去掉并集能被检出',
    '牙口失效：去掉并集仍判绿')
}

console.log('')
if (allPass) {
  console.log('DAILY_TRIAL_PASS')
} else {
  console.log(`DAILY_TRIAL_FAIL（${failures.length} 处）`)
  for (const f of failures) console.log('  - ' + f)
}
process.exitCode = allPass ? 0 : 1
