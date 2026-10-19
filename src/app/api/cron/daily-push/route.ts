import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabase } from '@/lib/supabase'
import { createPushRepo, type PushSubRow } from '@/lib/push-repo'
import { sendNotification, isEndpointGone } from '@/lib/push-sender'
import { dailyPushPayload, dailyDedupeKey, DAILY_PUSH_KIND } from '@/lib/push-copy'
import { dailySignFor, liuRiOf } from '@/lib/daily'

// 每日推送触发（Vercel Cron → GET /api/cron/daily-push）。
//   ★ 鉴权：Authorization: Bearer ${CRON_SECRET}（Vercel Cron 自动带）。
//   ★ 对象：仅【有效会员】（profiles.member_expire_at > now）且已授权订阅者 —— 会员判定只读。
//   ★ 幂等：先 claimDailyLog（靠 (user_id,kind,dedupe_key) UNIQUE），成功占位者才发送。
//   ★ 归日：全站统一 Asia/Shanghai；?date=YYYY-MM-DD 可覆写便于重测。
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 60

export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET
  const auth = req.headers.get('authorization')
  if (!secret || auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: '未授权' }, { status: 401 })
  }

  try {
    const now = new Date()
    // 归日一次算两用（日期 + 当日干支）；date 参数覆写时按该日重算干支
    const view = dailySignFor('Asia/Shanghai', now)
    let dateKey = view.date
    let liuRi = view.liuRi
    const qDate = new URL(req.url).searchParams.get('date')
    if (qDate && /^\d{4}-\d{2}-\d{2}$/.test(qDate)) {
      const [y, m, d] = qDate.split('-').map(Number)
      dateKey = qDate
      liuRi = liuRiOf(y, m, d).ganZhi
    }

    const dedupeKey = dailyDedupeKey(dateKey)
    const payload = JSON.stringify(dailyPushPayload(liuRi))

    const admin = createServerSupabase()
    const repo = createPushRepo(admin)

    const memberIds = await repo.listActiveMemberIds(now.toISOString())
    const subs = await repo.listActiveSubsFor(memberIds)

    // 按用户归组（一个用户可能多设备）
    const byUser = new Map<string, PushSubRow[]>()
    for (const s of subs) {
      const arr = byUser.get(s.user_id) ?? []
      arr.push(s)
      byUser.set(s.user_id, arr)
    }

    let sent = 0
    let skipped = 0
    let failed = 0
    for (const [userId, list] of byUser) {
      const claim = await repo.claimDailyLog(userId, DAILY_PUSH_KIND, dedupeKey)
      if (!claim.ok || claim.id == null) {
        skipped++ // 今日已发送过，跳过
        continue
      }
      let okCount = 0
      let lastStatus = 0
      let lastErr = ''
      for (const sub of list) {
        const r = await sendNotification(sub, payload)
        if (r.ok) {
          okCount++
        } else {
          lastStatus = r.statusCode
          lastErr = r.error ?? ''
          // ★ 404/410：该 endpoint 已失效 → 停用，不再重试；其余（429/5xx）保留待次日
          if (isEndpointGone(r.statusCode)) {
            await repo.deactivate(sub.endpoint, userId).catch(() => {})
          }
        }
      }
      if (okCount > 0) sent++
      else failed++
      await repo.finishLog(claim.id, {
        status: okCount > 0 ? 'sent' : 'failed',
        httpStatus: okCount > 0 ? 200 : lastStatus,
        error: okCount > 0 ? null : lastErr,
      })
    }

    return NextResponse.json({
      success: true,
      date: dateKey,
      liuRi,
      members: memberIds.length,
      devices: subs.length,
      sent,
      skipped,
      failed,
    })
  } catch (error) {
    console.error('每日推送错误:', error)
    const msg = error instanceof Error ? error.message : String(error)
    return NextResponse.json({ error: `推送失败：${msg}` }, { status: 500 })
  }
}
