// 登录后回跳地址白名单（防开放重定向）—— /auth?next=… 与 /auth/callback?next=… 共用的单一事实源。
//
// 为什么需要：next 参数来自 URL，是可被恶意构造的输入。若直接 router.replace(next)，
// 攻击者可把用户带去站外钓鱼页（//evil.com 这类协议相对地址最容易漏）。
// 口径：只放行【站内相对路径】（'/' 开头），其余一律回退 fallback。
//
// ★ 牙口锚点：删掉 startsWith('//') 那一条 → test-account-auth ⑥ 的 safeNext 行为断言精确翻红。
export function safeNext(raw: string | null | undefined, fallback = '/'): string {
  if (!raw) return fallback
  let v = String(raw).trim()
  // 先解码再校验：挡 /%2F%2Fevil.com 这类编码绕过（解码失败则按原值继续校验）
  try { v = decodeURIComponent(v) } catch { /* 保留原值 */ }
  if (!v.startsWith('/')) return fallback // 非相对路径（含 https://evil.com、javascript:…）
  if (v.startsWith('//') || v.startsWith('/\\')) return fallback // 协议相对地址（浏览器会当站外域名）
  if (v.includes('\\') || /[\r\n]/.test(v)) return fallback // 反斜杠与换行注入
  if (/^\/[a-zA-Z][a-zA-Z0-9+.-]*:/.test(v)) return fallback // /javascript: 这类伪协议
  return v
}
