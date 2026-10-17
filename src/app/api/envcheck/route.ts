import { NextResponse } from 'next/server'

/**
 * 临时诊断路由（排障后删除）：回报 ENTITLEMENT_ENFORCE 在运行时的真实形态。
 * 为什么回显 JSON.stringify：该变量是布尔开关而非密钥，回显无害，
 * 但能立刻看出 UI 里看不见的引号/空格/换行等不可见字符问题。
 */
export const dynamic = 'force-dynamic'

export async function GET() {
  const raw = process.env.ENTITLEMENT_ENFORCE
  return NextResponse.json({
    unset: raw === undefined,
    json: raw === undefined ? null : JSON.stringify(raw),
    enforce: raw === 'true'
  })
}
