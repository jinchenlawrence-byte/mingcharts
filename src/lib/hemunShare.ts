// 合婚分享令牌（2026-11-11）
//
// 硬约束：payload 只允许出现「模式 + 双方日支 + 双方日主 + 配偶星是否透干」，
// 不含生日、姓名、地点或任何可反推出生信息的字段。链接会长期留在公开环境，宁少不多。
import { createHmac, timingSafeEqual } from 'node:crypto'

export interface HemunSharePayload {
  /** 3 = 三柱模式，4 = 四柱模式 */
  m: '3' | '4'
  /** 双方日支 */
  b: [string, string]
  /** 双方日主 */
  d: [string, string]
  /** 配偶星是否至少一方透干：1 是，0 否 */
  s: 0 | 1
}

export const SHARE_TTL_SEC = 30 * 24 * 3600

const ZHI = '子丑寅卯辰巳午未申酉戌亥'.split('')
const GAN = '甲乙丙丁戊己庚辛壬癸'.split('')

const SECRET = process.env.REPORT_SHARE_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY || ''

export function shareSecretReady(): boolean {
  return Boolean(SECRET)
}

/** 严格校验：任何越界字段直接拒绝，防止有人借分享链接塞入其它信息 */
export function validatePayload(v: unknown): HemunSharePayload | null {
  if (!v || typeof v !== 'object') return null
  const o = v as Record<string, unknown>
  const m = o.m
  const b = o.b
  const d = o.d
  const s = o.s
  if (m !== '3' && m !== '4') return null
  if (!Array.isArray(b) || b.length !== 2 || !b.every(x => typeof x === 'string' && ZHI.includes(x))) return null
  if (!Array.isArray(d) || d.length !== 2 || !d.every(x => typeof x === 'string' && GAN.includes(x))) return null
  if (s !== 0 && s !== 1) return null
  return { m, b: [b[0], b[1]], d: [d[0], d[1]], s }
}

export function encodePayload(p: HemunSharePayload): string {
  return Buffer.from(JSON.stringify(p), 'utf8').toString('base64url')
}

export function decodePayload(d: string): HemunSharePayload | null {
  try {
    return validatePayload(JSON.parse(Buffer.from(d, 'base64url').toString('utf8')))
  } catch {
    return null
  }
}

export function signPayload(d: string, exp: number): string {
  return createHmac('sha256', SECRET).update(`${d}.${exp}`).digest('hex')
}

export function verifyPayload(d: string, expRaw: number, sig: string): { ok: boolean; reason?: string; payload?: HemunSharePayload } {
  if (!SECRET) return { ok: false, reason: '分享未配置' }
  if (!Number.isFinite(expRaw) || expRaw < Math.floor(Date.now() / 1000)) return { ok: false, reason: '链接已过期' }
  const expect = signPayload(d, expRaw)
  const a = Buffer.from(sig)
  const b = Buffer.from(expect)
  if (a.length !== b.length || !timingSafeEqual(a, b)) return { ok: false, reason: '链接无效' }
  const payload = decodePayload(d)
  if (!payload) return { ok: false, reason: '链接内容不合法' }
  return { ok: true, payload }
}

// ───────── 展示层用的小映射（仅由日支/日主推导，不涉生日） ─────────

const CHONG: Record<string, string> = { 子: '午', 午: '子', 丑: '未', 未: '丑', 寅: '申', 申: '寅', 卯: '酉', 酉: '卯', 辰: '戌', 戌: '辰', 巳: '亥', 亥: '巳' }
const HE6: Record<string, string> = { 子: '丑', 丑: '子', 寅: '亥', 亥: '寅', 卯: '戌', 戌: '卯', 辰: '酉', 酉: '辰', 巳: '申', 申: '巳', 午: '未', 未: '午' }
const HAI6: Record<string, string> = { 子: '未', 未: '子', 丑: '午', 午: '丑', 寅: '巳', 巳: '寅', 卯: '辰', 辰: '卯', 申: '亥', 亥: '申', 酉: '戌', 戌: '酉' }
const XING: Record<string, string> = { 子: '卯', 卯: '子', 寅: '巳', 巳: '申', 申: '寅', 丑: '戌', 戌: '未', 未: '丑', 辰: '辰', 午: '午', 酉: '酉', 亥: '亥' }

export function branchRelation(a: string, b: string): '冲' | '六合' | '害' | '刑' | '平' {
  if (!a || !b) return '平'
  if (CHONG[a] === b) return '冲'
  if (HE6[a] === b) return '六合'
  if (HAI6[a] === b) return '害'
  if (XING[a] === b) return '刑'
  return '平'
}

const WX: Record<string, string> = { 甲: '木', 乙: '木', 丙: '火', 丁: '火', 戊: '土', 己: '土', 庚: '金', 辛: '金', 壬: '水', 癸: '水' }
const SHENG: Record<string, string> = { 木: '火', 火: '土', 土: '金', 金: '水', 水: '木' }
const KE: Record<string, string> = { 木: '土', 土: '水', 水: '火', 火: '金', 金: '木' }
const HE_GAN: Record<string, string> = { 甲: '己', 己: '甲', 乙: '庚', 庚: '乙', 丙: '辛', 辛: '丙', 丁: '壬', 壬: '丁', 戊: '癸', 癸: '戊' }

export function ganRelation(a: string, b: string): '五合' | '相生' | '相克' | '同类' | '平' {
  if (!a || !b) return '平'
  const wa = WX[a], wb = WX[b]
  if (!wa || !wb) return '平'
  if (HE_GAN[a] === b) return '五合'
  if (wa === wb) return '同类'
  if (SHENG[wa] === wb || SHENG[wb] === wa) return '相生'
  if (KE[wa] === wb || KE[wb] === wa) return '相克'
  return '平'
}

const REL: Record<string, string> = { 冲: '相冲', 六合: '六合', 害: '相害', 刑: '相刑', 平: '无直接关系' }
const GAN_REL: Record<string, string> = { 五合: '五合', 相生: '相生', 相克: '相克', 同类: '同类', 平: '无直接关系' }

/** 分享卡三行文案（只由日支/日主推导） */
export function shareRows(p: HemunSharePayload) {
  return {
    spouse: `${p.b[0]} 与 ${p.b[1]} ${REL[branchRelation(p.b[0], p.b[1])]}`,
    gan: `${p.d[0]} 与 ${p.d[1]} ${GAN_REL[ganRelation(p.d[0], p.d[1])]}`,
    star: p.s === 1 ? '至少一方在年、月、日干透出' : '年、月、日干未见透出',
  }
}
