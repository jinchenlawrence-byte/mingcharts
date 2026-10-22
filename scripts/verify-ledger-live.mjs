// 伙伴额度账本【线上】实测（opt-in，会真写库再删掉）
//
// 用法：npm run verify:ledger-live
//
// 验什么：入账 → 重复回调不重加 → 金额不符告警 → 扣减 → 同一报告幂等 → 余额不足拒绝 → 人工调整 → 清理
// ★ 会临时写一个真实用户的额度流水，结束时按 ref 精确删除并校验余额还原。
// ★ 为什么必须单独跑：webhook 签名无法伪造，只能直接测它调用的那个函数；
//   而「幂等」与「金额校验」恰恰是真会出事的两处。
import { existsSync } from 'node:fs'
import { createClient } from '@supabase/supabase-js'
import {
  creditPartnerPurchase, spendPartnerUnits, getPartnerBalance, adjustPartnerUnits,
} from '../src/lib/partnerCredits.ts'

if (existsSync('.env.local')) process.loadEnvFile('.env.local')
const proxyUrl = process.env.HTTPS_PROXY || process.env.HTTP_PROXY
if (proxyUrl) {
  const { ProxyAgent, setGlobalDispatcher } = await import('undici')
  setGlobalDispatcher(new ProxyAgent(proxyUrl))
}
const admin = createClient(
  process.env.SUPABASE_URL_INTERNAL || process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false, autoRefreshToken: false } }
)

// 选一个真实用户（额度外键指向 profiles）
const { data: profs } = await admin.from('profiles').select('id,email').limit(5)
if (!profs?.length) { console.error('没有可用用户'); process.exit(1) }
const user = profs[0]
console.log(`测试用户：${user.email ?? '(无邮箱)'} ${user.id}`)
const base = await getPartnerBalance(admin, user.id)
console.log(`初始余额：${base}`)

const stamp = Date.now()
const PAY1 = `PAY_TESTCREDIT${stamp}`
const PAY2 = `PAY_TESTCREDIT${stamp}B`
const REPORT1 = `TESTREPORT-${stamp}`
const REPORT2 = `TESTREPORT-${stamp}-2`

let pass = true
const check = (ok, label, detail = '') => {
  if (!ok) pass = false
  console.log(`  ${ok ? '✓' : '✗'} ${label}${detail ? ` · ${detail}` : ''}`)
}

// ① 入账 10 份
const c1 = await creditPartnerPurchase(admin, { userId: user.id, sku: 'partner_credits_10', ref: PAY1, paidUSD: 150 })
check(c1.credited === 10 && !c1.duplicate && c1.balance === base + 10, '入账 10 份', `credited=${c1.credited} balance=${c1.balance}`)
check(!c1.priceWarning, '金额 $150 与标价一致，无告警', c1.priceWarning ?? '')

// ② 同一支付单再来一次（模拟 webhook 重试）→ 不重复加
const c2 = await creditPartnerPurchase(admin, { userId: user.id, sku: 'partner_credits_10', ref: PAY1, paidUSD: 150 })
check(c2.duplicate === true && c2.credited === 0, '重复回调不重复入账', `duplicate=${c2.duplicate} credited=${c2.credited}`)
check(c2.balance === base + 10, '重复回调后余额不变', `balance=${c2.balance}`)

// ③ 金额不符（少一个零）→ 仍然入账但必须告警
const c3 = await creditPartnerPurchase(admin, { userId: user.id, sku: 'partner_credits_10', ref: PAY2, paidUSD: 15 })
check(!!c3.priceWarning, '★ $15 触发价格告警', c3.priceWarning ?? '(无)')
check(c3.credited === 10, '价格不符仍然入账（钱已收，不能不发货）', `credited=${c3.credited}`)

// ④ 扣减 1 份（交付一份报告）
const s1 = await spendPartnerUnits(admin, { userId: user.id, units: 1, ref: REPORT1 })
check(s1.ok && s1.balance === base + 19, '交付扣减 1 份', `balance=${s1.balance}`)

// ⑤ 同一份报告再扣一次 → 幂等，不多扣
const s2 = await spendPartnerUnits(admin, { userId: user.id, units: 1, ref: REPORT1 })
check(s2.ok && s2.balance === base + 19, '同一报告重复扣减不多扣', `balance=${s2.balance}`)

// ⑥ 余额不足必须拒绝（不允许扣成负数）
const s3 = await spendPartnerUnits(admin, { userId: user.id, units: 999, ref: REPORT2 })
check(!s3.ok && !!s3.error, '余额不足被拒', s3.error ?? '')
check(s3.balance === base + 19, '被拒后余额不变', `balance=${s3.balance}`)

// ⑦ 人工调整（送 2 份）
const a1 = await adjustPartnerUnits(admin, { userId: user.id, units: 2, note: 'test-adjust' })
check(a1.ok && a1.balance === base + 21, '人工调整 +2 份', `balance=${a1.balance}`)

// ⑧ 清理
const { error: delErr } = await admin
  .from('partner_credits')
  .delete()
  .eq('user_id', user.id)
  .or(`ref.eq.${PAY1},ref.eq.${PAY2},ref.eq.${REPORT1},ref.eq.test-adjust`)
check(!delErr, '测试数据已清理', delErr?.message ?? '')
const final = await getPartnerBalance(admin, user.id)
check(final === base, '余额已还原', `final=${final}`)

console.log('\n' + (pass ? 'LEDGER_LIVE_PASS' : 'LEDGER_LIVE_FAIL'))
process.exitCode = pass ? 0 : 1
