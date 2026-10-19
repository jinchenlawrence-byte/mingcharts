import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabase } from '@/lib/supabase'
import { createPushRepo } from '@/lib/push-repo'

// Web Push 订阅登记/退订（服务端）。
// ★★ user_id 只取自 access token（服务端 getUser 校验）；body 里的任何 user_id 一律忽略。
//    endpoint 是可发推凭据 —— 本路由零 RLS 之外的唯一写入口，绝不接受未鉴权写入。

function getToken(req: NextRequest, body?: Record<string, unknown> | null): string | null {
  const auth = req.headers.get('authorization')
  if (auth?.startsWith('Bearer ')) return auth.slice(7)
  const q = new URL(req.url).searchParams.get('token')
  if (q) return q
  const b = body?.token
  return typeof b === 'string' && b ? b : null
}

async function resolveUserId(req: NextRequest, body: Record<string, unknown> | null): Promise<string | null> {
  const token = getToken(req, body)
  if (!token) return null
  const admin = createServerSupabase()
  const { data: { user }, error } = await admin.auth.getUser(token)
  if (error || !user) return null
  return user.id
}

export async function POST(req: NextRequest) {
  try {
    let body: Record<string, unknown> | null = null
    try {
      body = (await req.json()) as Record<string, unknown>
    } catch {
      return NextResponse.json({ error: '请求体非法' }, { status: 400 })
    }

    const userId = await resolveUserId(req, body)
    if (!userId) return NextResponse.json({ error: '未授权' }, { status: 401 })

    const sub = body?.subscription as Record<string, unknown> | undefined
    const endpoint = typeof sub?.endpoint === 'string' ? sub.endpoint : ''
    const p256dh = typeof sub?.keys === 'object' && sub?.keys
      ? String((sub.keys as Record<string, unknown>).p256dh ?? '')
      : ''
    const auth = typeof sub?.keys === 'object' && sub?.keys
      ? String((sub.keys as Record<string, unknown>).auth ?? '')
      : ''
    if (!endpoint || !p256dh || !auth) {
      return NextResponse.json({ error: '订阅信息不完整' }, { status: 400 })
    }

    const admin = createServerSupabase()
    const repo = createPushRepo(admin)
    await repo.upsertSubscription(
      userId,
      { endpoint, p256dh, auth },
      req.headers.get('user-agent')
    )
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('推送订阅错误:', error)
    const msg = error instanceof Error ? error.message : String(error)
    return NextResponse.json({ error: `订阅失败：${msg}` }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  try {
    let body: Record<string, unknown> | null = null
    try {
      body = (await req.json()) as Record<string, unknown>
    } catch {
      return NextResponse.json({ error: '请求体非法' }, { status: 400 })
    }

    const userId = await resolveUserId(req, body)
    if (!userId) return NextResponse.json({ error: '未授权' }, { status: 401 })

    const endpoint = typeof body?.endpoint === 'string' ? body.endpoint : ''
    if (!endpoint) return NextResponse.json({ error: '缺少 endpoint' }, { status: 400 })

    const admin = createServerSupabase()
    const repo = createPushRepo(admin)
    // ★ 带 userId 限定：只能停用自己名下设备
    await repo.deactivate(endpoint, userId)
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('推送退订错误:', error)
    const msg = error instanceof Error ? error.message : String(error)
    return NextResponse.json({ error: `退订失败：${msg}` }, { status: 500 })
  }
}
