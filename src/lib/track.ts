// 前端埋点（2026-10-21）：只做「行为漏斗」，不传命理内容、不传邮箱等个人信息。
// 设计取舍：
//   · 零第三方 SDK、零 cookie —— sid 存 localStorage，首次触达的 UTM 存 sessionStorage；
//   · 用 navigator.sendBeacon 发送，页面跳转/关闭时不丢事件（pay_click 恰好发生在跳转前）；
//   · 任何失败都静默——埋点绝不能影响排盘与支付主流程。
// ★ 本文件禁止在模块顶层访问 window（site-audit 断言：客户端页顶层不得用 window）。

export type TrackName = 'page_view' | 'paipan_submit' | 'preview_view' | 'pay_click'

export interface TrackProps {
  /** 模块/商品等短标识，值必须是短字符串（服务端会限制长度） */
  [key: string]: string | number | boolean | undefined
}

const SID_KEY = 'ml_sid'
const TOUCH_KEY = 'ml_touch'
const REF_KEY = 'ml_ref'

function safeSession(): Storage | null {
  try {
    return window.sessionStorage
  } catch {
    return null
  }
}

function safeLocal(): Storage | null {
  try {
    return window.localStorage
  } catch {
    return null
  }
}

/** 生成/复用会话 id：同标签页内持久，用于把多步行为串成一条漏斗 */
export function sessionId(): string {
  const local = safeLocal()
  if (!local) return ''
  let sid = local.getItem(SID_KEY)
  if (!sid) {
    sid =
      typeof crypto !== 'undefined' && 'randomUUID' in crypto
        ? crypto.randomUUID()
        : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`
    try {
      local.setItem(SID_KEY, sid)
    } catch {
      return ''
    }
  }
  return sid
}

interface Touch {
  source: string
  medium: string
  campaign: string
  referrer: string
}

/**
 * 首次触达归因：本次会话第一次落地页上的 utm_* 与 referrer。
 * 后续页面切换（含站内跳转）沿用同一份，避免把「站内跳转」误记成新来源。
 */
export function firstTouch(search?: string): Touch {
  const session = safeSession()
  const current: Touch = {
    source: '',
    medium: '',
    campaign: '',
    referrer: '',
  }
  if (typeof document !== 'undefined') current.referrer = document.referrer.slice(0, 300)
  if (search) {
    const sp = new URLSearchParams(search)
    current.source = (sp.get('utm_source') || '').slice(0, 80)
    current.medium = (sp.get('utm_medium') || '').slice(0, 80)
    current.campaign = (sp.get('utm_campaign') || '').slice(0, 120)
  }

  if (!session) return current
  const cached = session.getItem(TOUCH_KEY)
  if (cached) {
    try {
      const parsed = JSON.parse(cached) as Touch
      return { source: parsed.source || '', medium: parsed.medium || '', campaign: parsed.campaign || '', referrer: parsed.referrer || '' }
    } catch {
      // 缓存损坏则按本次重新写入
    }
  }
  try {
    session.setItem(TOUCH_KEY, JSON.stringify(current))
  } catch {
    // 隐私模式写入失败：本次仍可用，只是不跨页
  }
  return current
}

/** 记住分享者带来的 ref 码（首次写入后不再覆盖，防止被后续链接改写归因） */
export function rememberRef(search?: string): void {
  const local = safeLocal()
  if (!local || !search) return
  try {
    if (local.getItem(REF_KEY)) return
    const ref = (new URLSearchParams(search).get('ref') || '').slice(0, 32)
    if (ref) local.setItem(REF_KEY, ref)
  } catch {
    // 隐私模式：忽略
  }
}

/** 上报一个事件（fire-and-forget，永不影响主流程） */
export function track(name: TrackName, props?: TrackProps): void {
  if (typeof window === 'undefined') return
  try {
    const sid = sessionId()
    if (!sid) return
    const touch = firstTouch(window.location.search)
    const payload = JSON.stringify({
      name,
      sid,
      path: window.location.pathname.slice(0, 200),
      utm: { source: touch.source, medium: touch.medium, campaign: touch.campaign },
      referrer: touch.referrer,
      props: props ?? {},
    })

    if (typeof navigator !== 'undefined' && navigator.sendBeacon) {
      // Blob 显式声明 JSON：服务端 req.json() 才能按 JSON 解析
      navigator.sendBeacon('/api/track', new Blob([payload], { type: 'application/json' }))
      return
    }
    void fetch('/api/track', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: payload,
      keepalive: true,
    }).catch(() => {})
  } catch {
    // 埋点失败静默
  }
}
