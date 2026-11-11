import { NextRequest, NextResponse } from 'next/server'
import { createHmac, timingSafeEqual } from 'node:crypto'
import { createServerSupabase } from '@/lib/supabase'
import { REPORT_GATE, gateReportForDetail } from '@/lib/reportGate'
import type { ReportKind } from '@/lib/reportSave'

// 报告分享链接（2026-11-11）
//
// 背景：/reports/[id] 的分享按钮此前直接复制当前 URL，而该页登录后才渲染，
// 接收者打开只会看到「请先登录后查看报告」——分享入口等于死的。
//
// 两条路线的取舍：
//   A. 开放只读：知道 id 就能读。改动最小，但 reports 表里是出生信息与付费全文，
//      UUID 一旦被日志/截图带出就等于永久泄露，且无法撤销、无法过期。
//   B. 签名令牌：POST 由本人换取带 exp + HMAC 的链接，接收者凭令牌只读。
//      多一个端点，但可过期、可撤销（换密钥即全失效）、且能控制展示层级。
// 采用 B。分享页一律按【未付费】口径下发（gateReportForDetail 传空权益），
// 只给试读层，不把付费全文送给任何持链接的人。
//
// 密钥复用现有服务端密钥，避免新增环境变量：REPORT_SHARE_SECRET 优先，否则用 service_role key。
const SECRET = process.env.REPORT_SHARE_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY || ''
const TTL_SEC = 30 * 24 * 3600

function sign(id: string, exp: number): string {
  return createHmac('sha256', SECRET).update(`${id}.${exp}`).digest('hex')
}

function safeEqual(a: string, b: string): boolean {
  const ba = Buffer.from(a)
  const bb = Buffer.from(b)
  if (ba.length !== bb.length) return false
  return timingSafeEqual(ba, bb)
}

/** 本人换取分享链接（需登录 token） */
export async function POST(request: NextRequest) {
  try {
    if (!SECRET) return NextResponse.json({ error: '分享未配置' }, { status: 500 })
    const { token, id } = await request.json()
    if (!token || !id) return NextResponse.json({ error: '缺少参数' }, { status: 400 })

    const admin = createServerSupabase()
    const { data: { user }, error } = await admin.auth.getUser(token)
    if (error || !user) return NextResponse.json({ error: '登录无效' }, { status: 401 })

    const { data: row } = await admin
      .from('reports')
      .select('id,user_id,status')
      .eq('id', id)
      .single()
    if (!row || row.user_id !== user.id || row.status !== 'ready') {
      return NextResponse.json({ error: '报告不存在或无权分享' }, { status: 403 })
    }

    const exp = Math.floor(Date.now() / 1000) + TTL_SEC
    return NextResponse.json({ ok: true, exp, sig: sign(id, exp) })
  } catch (e) {
    console.error('分享链接生成失败:', e)
    return NextResponse.json({ error: '分享链接生成失败' }, { status: 500 })
  }
}

/** 凭令牌读取（只读、试读层） */
export async function GET(request: NextRequest) {
  try {
    if (!SECRET) return NextResponse.json({ error: '分享未配置' }, { status: 500 })
    const p = request.nextUrl.searchParams
    const id = p.get('id') ?? ''
    const exp = Number(p.get('e') ?? 0)
    const sig = p.get('s') ?? ''
    if (!id || !exp || !sig) return NextResponse.json({ error: '参数不完整' }, { status: 400 })
    if (!Number.isFinite(exp) || exp < Math.floor(Date.now() / 1000)) {
      return NextResponse.json({ error: '链接已过期' }, { status: 410 })
    }
    if (!safeEqual(sig, sign(id, exp))) {
      return NextResponse.json({ error: '链接无效' }, { status: 403 })
    }

    const admin = createServerSupabase()
    const { data: row } = await admin
      .from('reports')
      .select('kind,title,result,status')
      .eq('id', id)
      .single()
    if (!row || row.status !== 'ready') {
      return NextResponse.json({ error: '报告不存在' }, { status: 404 })
    }

    const kind = row.kind as ReportKind
    if (!REPORT_GATE[kind]) return NextResponse.json({ error: '该类型暂不支持分享' }, { status: 400 })

    // ★ 一律按未付费口径：只给 PREVIEW_FREE 的规则板块，AI 全文不下发
    const gated = gateReportForDetail(kind, (row.result ?? {}) as Record<string, unknown>, {
      memberSkus: [],
      ownedSkus: [],
    })
    return NextResponse.json({ ok: true, kind, title: row.title, result: gated })
  } catch (e) {
    console.error('分享报告读取失败:', e)
    return NextResponse.json({ error: '分享报告读取失败' }, { status: 500 })
  }
}
