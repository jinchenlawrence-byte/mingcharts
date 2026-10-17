// 报告资产「保存」唯一入口（HANDOFF-四问题修复 §D）
// 合婚/紫微/地理/年运四类报告生成成功后由各 route 调 saveReport 落库；
// 门禁/标题/容错只此一处，route 不得各自另写保存逻辑。
import { createServerSupabase } from './supabase'

export type ReportKind = 'hemun' | 'ziwei' | 'geo' | 'annual' | 'fatebook'

export const REPORT_KIND_LABELS: Record<ReportKind, string> = {
  hemun: '合婚详批',
  ziwei: '紫微深度',
  geo: '地理 · 财富之城',
  annual: '年运报告',
  fatebook: '八字命书',
}

/** 报告标题派生所需的请求要素（各 route 从 body 取） */
export interface ReportTitleInput {
  year: number
  month: number
  day: number
  hour?: number
  gender?: number
  /** hemun 双人：另一方 */
  partnerYear?: number
  partnerMonth?: number
  partnerDay?: number
  partnerGender?: number
  /** annual：目标流年 */
  targetYear?: number
}

/**
 * 纯函数：由 kind + 请求要素派生列表页标题。
 * 可被断言直接喂数据测试（函数行为断言纪律）。
 */
export function deriveReportTitle(kind: ReportKind, i: ReportTitleInput): string {
  const pad = (n: number) => String(n)
  const ymd = (y?: number, m?: number, d?: number) =>
    y === undefined || m === undefined || d === undefined ? '' : `${y}-${pad(m)}-${pad(d)}`
  const sex = (g?: number) => (g === 0 ? '女' : '男')
  switch (kind) {
    case 'hemun':
      return `${sex(i.gender)}${ymd(i.year, i.month, i.day)} × ${sex(i.partnerGender)}${ymd(i.partnerYear, i.partnerMonth, i.partnerDay)} 合婚详批`
    case 'annual':
      return `${ymd(i.year, i.month, i.day)} · ${i.targetYear ?? ''} 流年详批`
    case 'ziwei':
      return `${ymd(i.year, i.month, i.day)} ${i.hour ?? 0}时 ${sex(i.gender)} · 紫微深度`
    case 'geo':
      return `${ymd(i.year, i.month, i.day)} ${i.hour ?? 0}时 ${sex(i.gender)} · 地理方位`
    case 'fatebook':
      return `${ymd(i.year, i.month, i.day)} ${i.hour ?? 0}时 ${sex(i.gender)} · 八字命书`
  }
}

/**
 * ★ 已购命书进「我的报告」（2026-10-18）：支付落账（webhook）或解锁回写（unlock）
 *   成功后调用，把命书以 kind=fatebook 行写入 reports——cache_key=chartId 幂等
 *   （同 (user_id, kind, cache_key) 只一行，并发冲突走 idx_reports_cache 23505 覆盖）。
 *   input 存 chart_id 供列表页「查看」回放命盘。静默降级：失败仅 console.warn，
 *   绝不阻断支付/解锁主流程。
 */
export async function ensureFatebookReportByAdmin(
  admin: ReturnType<typeof createServerSupabase>,
  userId: string,
  chartId: string,
  birth: { year: number; month: number; day: number; hour?: number; gender?: number }
): Promise<void> {
  try {
    const title = deriveReportTitle('fatebook', {
      year: birth.year,
      month: birth.month,
      day: birth.day,
      hour: birth.hour,
      gender: birth.gender
    })
    const { data: existing } = await admin
      .from('reports')
      .select('id')
      .eq('user_id', userId)
      .eq('kind', 'fatebook')
      .eq('cache_key', chartId)
      .maybeSingle()
    if (existing?.id) return
    const { error } = await admin.from('reports').insert({
      user_id: userId,
      kind: 'fatebook',
      title,
      input: { chart_id: chartId } as never,
      cache_key: chartId
    })
    if (error && (error as { code?: string }).code !== '23505') throw error
  } catch (e) {
    console.warn('[report-save] 命书报告行写入失败（不影响主流程）:', e instanceof Error ? e.message : e)
  }
}

export interface SaveReportPayload {
  kind: ReportKind
  title: string
  /** 请求要素存档（将来重生成用） */
  input: unknown
  /** 页面渲染所需的完整结果（即 route 返回的 data） */
  result: unknown
  /**
   * ★ 报告缓存键（HANDOFF-年运披露与报告缓存 原则③）：提供时按 (user_id, kind, cache_key)
   *   覆盖写——查到同键行则 update（created_at 取最新），否则 insert，绝不新增第二行。
   *   不提供（其余模块暂未接缓存）保持原纯 insert 行为不变。
   */
  cacheKey?: string
}

/**
 * 生成成功后落库（service_role 绕 RLS 写入）。
 * ★ 静默降级约定：token 缺失/无效/写库失败一律 console.warn 并返回 null，
 *   绝不阻断报告生成主流程（保存失败 ≠ 生成失败）。
 * @returns reportId（未保存时为 null）
 */
export async function saveReport(
  token: string | undefined | null,
  payload: SaveReportPayload
): Promise<string | null> {
  if (!token) return null
  try {
    const admin = createServerSupabase()
    const { data: { user }, error: authError } = await admin.auth.getUser(token)
    if (authError || !user) {
      console.warn('[report-save] token 无效，跳过保存')
      return null
    }
    // ★ 覆盖写（原则③）：同一 (user_id, kind, cache_key) 只保留一行——
    //   重复点击/重新生成更新该行并刷新 created_at（列表按 created_at 倒序，重生成的报告置顶），
    //   不再 insert 新行堆积重复条目。
    if (payload.cacheKey) {
      const { data: existing } = await admin
        .from('reports')
        .select('id')
        .eq('user_id', user.id)
        .eq('kind', payload.kind)
        .eq('cache_key', payload.cacheKey)
        .maybeSingle()
      if (existing?.id) {
        const { error } = await admin
          .from('reports')
          .update({
            title: payload.title,
            input: payload.input as never,
            result: payload.result as never,
            created_at: new Date().toISOString()
          })
          .eq('id', existing.id)
        if (error) throw error
        return existing.id
      }
    }
    const { data, error } = await admin
      .from('reports')
      .insert({
        user_id: user.id,
        kind: payload.kind,
        title: payload.title,
        input: payload.input as never,
        result: payload.result as never,
        ...(payload.cacheKey ? { cache_key: payload.cacheKey } : {})
      })
      .select('id')
      .single()
    // ★ 并发 loser 兜底（REPLY-23 复核 发现②）：上方「先 SELECT 再 INSERT」在真实并发下
    //   两个请求会同时未命中、同时 INSERT——idx_reports_cache 是 UNIQUE 索引，
    //   loser 的 INSERT 被数据库以 23505（唯一冲突）拒绝；此时 winner 的行已就位，
    //   改为覆盖写它，保证同键永远只有一行（原则③在并发下同样成立）。
    //   牙口注入点：下方 code 判断改坏（如 '23506'）→ 断言⑧b 翻红。
    if (error && (error as { code?: string }).code === '23505' && payload.cacheKey) {
      const { data: dup } = await admin
        .from('reports')
        .select('id')
        .eq('user_id', user.id)
        .eq('kind', payload.kind)
        .eq('cache_key', payload.cacheKey)
        .maybeSingle()
      if (dup?.id) {
        const { error: upErr } = await admin
          .from('reports')
          .update({
            title: payload.title,
            input: payload.input as never,
            result: payload.result as never,
            created_at: new Date().toISOString()
          })
          .eq('id', dup.id)
        if (upErr) throw upErr
        return dup.id
      }
    }
    if (error) throw error
    return data.id
  } catch (e) {
    console.warn('[report-save] 保存失败（不影响报告生成）:', e instanceof Error ? e.message : e)
    return null
  }
}
