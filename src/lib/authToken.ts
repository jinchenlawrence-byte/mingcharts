// 客户端：已登录则返回 access_token（供报告自动保存），未登录/异常返回 null
// 与 reportSave.ts 的静默降级约定配套：拿不到 token ≠ 报错，只是不保存
import { getSupabase } from './supabase'

export async function getAuthToken(): Promise<string | null> {
  try {
    const { data: { session } } = await getSupabase().auth.getSession()
    return session?.access_token ?? null
  } catch {
    return null
  }
}
