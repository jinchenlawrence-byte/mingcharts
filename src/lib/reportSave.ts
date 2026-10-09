// 报告资产「保存」唯一入口（HANDOFF-四问题修复 §D）
// 合婚/紫微/地理/年运四类报告生成成功后由各 route 调 saveReport 落库；
// 门禁/标题/容错只此一处，route 不得各自另写保存逻辑。
import { createServerSupabase } from './supabase'

export type ReportKind = 'hemun' | 'ziwei' | 'geo' | 'annual'

export const REPORT_KIND_LABELS: Record<ReportKind, string> = {
  hemun: '合婚详批',
  ziwei: '紫微深度',
  geo: '地理 · 财富之城',
  annual: '年运报告',
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
  }
}

export interface SaveReportPayload {
  kind: ReportKind
  title: string
  /** 请求要素存档（将来重生成用） */
  input: unknown
  /** 页面渲染所需的完整结果（即 route 返回的 data） */
  result: unknown
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
    const { data, error } = await admin
      .from('reports')
      .insert({
        user_id: user.id,
        kind: payload.kind,
        title: payload.title,
        input: payload.input as never,
        result: payload.result as never
      })
      .select('id')
      .single()
    if (error) throw error
    return data.id
  } catch (e) {
    console.warn('[report-save] 保存失败（不影响报告生成）:', e instanceof Error ? e.message : e)
    return null
  }
}
