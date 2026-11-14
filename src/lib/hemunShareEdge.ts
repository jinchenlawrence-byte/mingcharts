// 边缘（proxy）侧校验：只用 Web Crypto，不引入 node:crypto
import { SHARE_GONE_PALETTE } from './visual-tokens'

export type ShareCheckReason = 'expired' | 'invalid' | 'noconfig'

export async function verifyShareTokenEdge(
  d: string, expRaw: number, sig: string
): Promise<{ ok: boolean; reason?: ShareCheckReason }> {
  const secret = process.env.REPORT_SHARE_SECRET
  if (!secret) return { ok: false, reason: 'noconfig' }
  if (!d || !sig) return { ok: false, reason: 'invalid' }
  if (!Number.isFinite(expRaw) || expRaw < Math.floor(Date.now() / 1000)) return { ok: false, reason: 'expired' }

  const enc = new TextEncoder()
  const key = await crypto.subtle.importKey('raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'])
  const buf = await crypto.subtle.sign('HMAC', key, enc.encode(`${d}.${expRaw}`))
  const hex = Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('')

  // 定长比较，避免时序差异
  if (hex.length !== sig.length) return { ok: false, reason: 'invalid' }
  let diff = 0
  for (let i = 0; i < hex.length; i++) diff |= hex.charCodeAt(i) ^ sig.charCodeAt(i)
  return diff === 0 ? { ok: true } : { ok: false, reason: 'invalid' }
}

export const SHARE_GONE_REASON = {
  expired: { zh: '分享链接已过期', tw: '分享連結已過期', en: 'This shared link has expired' },
  invalid: { zh: '链接无效', tw: '連結無效', en: 'This link is invalid' },
  noconfig: { zh: '分享功能暂未配置', tw: '分享功能暫未配置', en: 'Sharing is not configured' },
} as const

export function shareGoneHtml(lang: 'zh' | 'tw' | 'en', reason: ShareCheckReason): string {
  const title = SHARE_GONE_REASON[reason][lang]
  const home = lang === 'tw' ? '/tw/hemun' : lang === 'en' ? '/en' : '/hemun'
  const tip = lang === 'tw'
    ? '分享連結有效期為 30 天，過期後需重新生成。'
    : lang === 'en'
      ? 'Shared links are valid for 30 days; generate a new one after that.'
      : '分享链接有效期为 30 天，过期后需重新生成。'
  const back = lang === 'tw' ? '看自己的合婚' : lang === 'en' ? 'Back' : '看自己的合婚'
  // 色值收口在 lib/visual-tokens.ts：本函数返回裸 HTML，没有 CSS 文件可挂变量
  const { bg, ink, mute } = SHARE_GONE_PALETTE
  return `<!doctype html><html lang="${lang === 'tw' ? 'zh-Hant' : lang === 'en' ? 'en' : 'zh-CN'}"><head><meta charset="utf-8"><title>${title}</title><meta name="robots" content="noindex, follow"><meta name="viewport" content="width=device-width, initial-scale=1"></head><body style="font-family:system-ui,-apple-system,'Segoe UI',sans-serif;background:${bg};color:${ink};display:flex;min-height:100vh;align-items:center;justify-content:center;margin:0"><main style="max-width:420px;padding:32px;text-align:center"><h1 style="font-size:20px;margin:0 0 8px">${title}</h1><p style="font-size:13px;color:${mute};margin:0 0 20px">${tip}</p><a href="${home}" style="font-size:14px;color:${ink}">${back} ›</a></main></body></html>`
}
