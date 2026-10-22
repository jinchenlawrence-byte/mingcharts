// 伙伴申请表单的校验与归一（单一事实源：API route 与验收脚本共用）
//
// 设计取舍：
//   · 只收【能联系上】的最小字段，不收公司/税号/身份证明 —— v1 是谈合作，不是开户
//   · 长度上限写死在这里，route 不再自己判断（避免两处口径不一致）
//   · 蜜罐字段 company：机器人会填所有 input，真人看不见它 → 填了就当机器人静默丢弃

export const PARTNER_CONTACT_KINDS = ['line', 'wechat', 'email', 'ig', 'other'] as const
export type PartnerContactKind = typeof PARTNER_CONTACT_KINDS[number]

/** 每月接单量区间（落库为字符串，便于以后改档而不动 schema） */
export const PARTNER_VOLUMES = ['<10', '10-30', '30-100', '100+'] as const
export type PartnerVolume = typeof PARTNER_VOLUMES[number]

export const PARTNER_LIMITS = {
  name: 40,
  contact: 120,
  channel: 120,
  region: 40,
  note: 1000,
} as const

export interface PartnerApplicationClean {
  name: string
  contact_kind: PartnerContactKind
  contact: string
  channel: string | null
  volume: PartnerVolume
  region: string | null
  note: string | null
}

export interface PartnerApplicationResult {
  data?: PartnerApplicationClean
  errors: string[]
  /** 命中蜜罐：调用方应【假装成功】并丢弃，不给机器人反馈 */
  bot?: boolean
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/

function str(v: unknown): string {
  return typeof v === 'string' ? v.trim() : ''
}

/**
 * 归一 + 校验。返回的第一个 error 给用户看，errors 全量给测试与日志。
 * 不做"聪明的自动修正"（比如把微信号当邮箱）——宁可让用户重填。
 */
export function normalizeApplication(raw: unknown): PartnerApplicationResult {
  const errors: string[] = []
  const body = (raw ?? {}) as Record<string, unknown>

  // 蜜罐：真人提交时该字段恒为空
  if (str(body.company)) return { errors: [], bot: true }

  const name = str(body.name)
  if (!name) errors.push('请填写称呼')
  else if (name.length > PARTNER_LIMITS.name) errors.push(`称呼请控制在 ${PARTNER_LIMITS.name} 字以内`)

  const contactKindRaw = str(body.contactKind)
  const contact_kind = PARTNER_CONTACT_KINDS.includes(contactKindRaw as PartnerContactKind)
    ? (contactKindRaw as PartnerContactKind)
    : null
  if (!contact_kind) errors.push('请选择联系方式类型')

  const contact = str(body.contact)
  if (!contact) errors.push('请填写联系方式')
  else if (contact.length > PARTNER_LIMITS.contact) errors.push('联系方式过长')
  else if (contact_kind === 'email' && !EMAIL_RE.test(contact)) errors.push('邮箱格式看起来不对')

  const volumeRaw = str(body.volume)
  const volume = PARTNER_VOLUMES.includes(volumeRaw as PartnerVolume) ? (volumeRaw as PartnerVolume) : null
  if (!volume) errors.push('请选择每月大概的接单量')

  const channel = str(body.channel)
  if (channel.length > PARTNER_LIMITS.channel) errors.push('平台/账号过长')

  const region = str(body.region)
  if (region.length > PARTNER_LIMITS.region) errors.push('地区过长')

  const note = str(body.note)
  if (note.length > PARTNER_LIMITS.note) errors.push(`备注请控制在 ${PARTNER_LIMITS.note} 字以内`)

  if (errors.length) return { errors }

  return {
    errors: [],
    data: {
      name,
      contact_kind: contact_kind!,
      contact,
      channel: channel || null,
      volume: volume!,
      region: region || null,
      note: note || null,
    },
  }
}
