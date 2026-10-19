// 推送文案（纯函数，零 IO）。
// ★ 只涉及【免费日签层】的公开信息（当日干支），不泄露任何付费内容细节；
//   归日按调用方给定的 Asia/Shanghai 日期，与用户设备时区无关。
// ★ 文案必须过既有合规判据（src/lib/ai-check.ts 的 findForbidden）：不得含确定性承诺与行动指令词。

export interface PushPayload {
  title: string
  body: string
  url: string
}

/** 推送种类（push_logs.kind） */
export const DAILY_PUSH_KIND = 'daily'

/**
 * 每日日运更新提醒。
 * @param liuRi 当日日干支（如「甲子」），由调用方按 Asia/Shanghai 归日后取
 */
export function dailyPushPayload(liuRi: string): PushPayload {
  return {
    title: '明理 · 今日日运已更新',
    body: `今日${liuRi}日，点开看你专属的今日日运。`,
    url: '/daily',
  }
}

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/

/**
 * 每日去重键：即归日（YYYY-MM-DD，定长 10）。
 * ★ 定长且跨时区确定 —— 由调用方先按 Asia/Shanghai 归日再传入，同一自然日全球恒定。
 */
export function dailyDedupeKey(dateKey: string): string {
  if (!DATE_RE.test(dateKey)) throw new Error(`非法归日：${dateKey}`)
  return dateKey
}
