// 邀请领取（2026-10-21）：被邀请人首次登录后调用一次，把「谁邀请了谁」落库。
// ★ 口径：
//   · 邀请码 = 邀请人 user id 前 8 位（分享按钮从会话里取，见 ShareLink）；
//   · 服务端按前缀查 profiles 得到邀请人，绝不信任前端传来的邀请人 id；
//   · invitee_id 有 UNIQUE 约束 ⇒ 重复调用、换码重领都只记第一次，天然防刷；
//   · 邀请人不能邀请自己；同邮箱/同设备的账号均由「每人只能被邀请一次」兜住。
import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabase } from '@/lib/supabase'
import { ASK_PER_INVITE } from '@/lib/pricing'

const REF_LEN = 8
const REF_RE = /^[0-9a-f]{8}$/

export async function POST(req: NextRequest) {
  let body: any
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ success: false, error: '请求格式错误' }, { status: 400 })
  }

  const token = typeof body?.token === 'string' ? body.token : ''
  const ref = (typeof body?.ref === 'string' ? body.ref : '').trim().toLowerCase()
  if (!token) return NextResponse.json({ success: false, error: '缺少 token' }, { status: 401 })
  if (!REF_RE.test(ref)) return NextResponse.json({ success: false, error: '邀请码无效' }, { status: 400 })

  const admin = createServerSupabase()
  const { data: { user }, error: authError } = await admin.auth.getUser(token)
  if (authError || !user) return NextResponse.json({ success: false, error: '登录无效' }, { status: 401 })

  // 前缀匹配邀请人（UUID 前 8 位十六进制）；排除自己
  const { data: inviter, error: findError } = await admin
    .from('profiles')
    .select('id')
    .like('id', `${ref}-%`)
    .neq('id', user.id)
    .limit(1)
    .maybeSingle()
  if (findError) {
    console.error('邀请人查询失败:', findError.code, findError.message)
    return NextResponse.json({ success: false, error: '邀请码无效' }, { status: 500 })
  }
  if (!inviter) return NextResponse.json({ success: false, error: '邀请码无效' }, { status: 404 })

  // 重复领取：UNIQUE(invitee_id) 会报 23505，按「已处理」返回成功（前端不必重试）
  const { error: insertError } = await admin
    .from('invites')
    .insert({ inviter_id: inviter.id, invitee_id: user.id, ref_code: ref })
  if (insertError && insertError.code !== '23505') {
    console.error('邀请落库失败:', insertError.code, insertError.message)
    return NextResponse.json({ success: false, error: '邀请记录失败' }, { status: 500 })
  }

  return NextResponse.json({
    success: true,
    // 首次落库才算「本次邀请有效」；重复调用返回 false，便于前端只提示一次
    claimed: !insertError,
    perInvite: ASK_PER_INVITE,
  })
}
