import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabase } from '@/lib/supabase'
import { generateGuestFatebookReport, GUEST_GENERATION_MAX_ATTEMPTS } from '@/lib/guestReport'
import { retryClaimEmails } from '@/lib/guestClaimMail'

// GET /api/cron/guest-orders —— 游客命书生成补偿（先付款后注册 · 阶段 C）
//
// 为什么需要：webhook 的 after() 只跑一次，进程重启/超时/AI 超时都会漏；
//   本任务把 stuck 的单捞回来重试，是「钱付了、报告没有、也没人知道」的兜底。
// 鉴权：Authorization: Bearer ${CRON_SECRET}。
//   ★ 调用方是 Supabase pg_cron + pg_net（见 supabase/guest-orders-cron.sql）：
//     Vercel Hobby 套餐只允许「每天最多一次」的 cron，10 分钟一次的表达式会让构建失败。
// 口径：
//   · 只捞 generation_attempts < 3 的单；
//   · paid/failed 需付款满 60 秒（避免与 webhook 的 after() 抢同一单）；
//   · generating 超过 10 分钟视为进程已死，允许重试；
//   · 每次最多处理 BATCH 条，避免单次 cron 超时与 AI 费用突增。
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 60

const BATCH = 2
const PAID_GRACE_MS = 60 * 1000
const GENERATING_STALE_MS = 10 * 60 * 1000

interface Candidate {
  id: string
  status: string
}

export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET
  const auth = req.headers.get('authorization')
  if (!secret || auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: '未授权' }, { status: 401 })
  }

  try {
    const admin = createServerSupabase()
    const now = Date.now()
    const paidBefore = new Date(now - PAID_GRACE_MS).toISOString()
    const staleBefore = new Date(now - GENERATING_STALE_MS).toISOString()

    const [retryable, stale] = await Promise.all([
      admin
        .from('guest_orders')
        .select('id, status')
        .in('status', ['paid', 'failed'])
        .lt('generation_attempts', GUEST_GENERATION_MAX_ATTEMPTS)
        .lt('paid_at', paidBefore)
        .order('paid_at', { ascending: true })
        .limit(BATCH),
      admin
        .from('guest_orders')
        .select('id, status')
        .eq('status', 'generating')
        .lt('generation_attempts', GUEST_GENERATION_MAX_ATTEMPTS)
        .lt('updated_at', staleBefore)
        .order('updated_at', { ascending: true })
        .limit(BATCH),
    ])
    if (retryable.error) throw retryable.error
    if (stale.error) throw stale.error

    const seen = new Set<string>()
    const targets: Candidate[] = []
    for (const row of [...(stale.data ?? []), ...(retryable.data ?? [])] as Candidate[]) {
      if (targets.length >= BATCH) break
      if (!seen.has(row.id)) {
        seen.add(row.id)
        targets.push(row)
      }
    }

    const counts: Record<string, number> = {}
    for (const t of targets) {
      let outcome = 'unknown'
      try {
        outcome = await generateGuestFatebookReport(admin, t.id)
      } catch (e) {
        outcome = 'error'
        console.error(`[cron-guest-orders] 生成异常 guest=${t.id}:`, e)
      }
      counts[outcome] = (counts[outcome] ?? 0) + 1
      if (outcome === 'failed' || outcome === 'error') {
        console.warn(`[cron-guest-orders] guest=${t.id} 本次未成功，等待下次重试`)
      }
    }

    // 阶段 D：补发认领邮件（报告 ready 但邮件没发出/发送失败的订单）。
    // 缺凭据时整体跳过，不写失败事件——补配后下一轮自动继续发。
    let claimMail: Awaited<ReturnType<typeof retryClaimEmails>> | null = null
    try {
      claimMail = await retryClaimEmails(admin, BATCH)
    } catch (e) {
      console.error('[cron-guest-orders] 认领邮件补发失败:', e)
    }

    return NextResponse.json({ success: true, scanned: targets.length, outcomes: counts, claimMail })
  } catch (error) {
    console.error('[cron-guest-orders] 失败:', error)
    return NextResponse.json({ error: 'cron failed' }, { status: 500 })
  }
}
