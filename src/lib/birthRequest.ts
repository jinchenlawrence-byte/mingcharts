// 出生地请求解析（★ 4 个 API route 共用，避免 §8.5 的「多处拷贝、入口漂移」）
//
// 支持的字段：
//   birthCityId      全球城市库 id（BirthPlacePicker 城市路径；主路径）
//   birthplace       策展城市名（旧客户端兼容）
//   birthLng/birthZone 「其它·进阶经度」或仅时区
//
// 解析顺序与 solarTime.resolveBirthRef 一致：手动经度 ＞ 城市 ＞ 仅时区 ＞ null。
import { resolveBirthRef, isValidZone } from './solarTime'
import type { BirthRef, BirthMoment } from './solarTime'
import { findCityById } from './worldCitiesServer'
import { cities as curated } from './birthCities'

// 方位/展示所需的城市形状（全球库 GlobalCity 与策展 CityRow 均满足）
export interface NamedPlace {
  name: string
  lat: number
  lng: number
  zone: string
}

export interface ResolvedBirth {
  ref: BirthRef | null
  city: NamedPlace | null
}

export async function resolveBirthFromBody(
  when: BirthMoment,
  fields: {
    birthCityId?: unknown
    birthplace?: unknown
    birthLng?: unknown
    birthZone?: unknown
  }
): Promise<{ data?: ResolvedBirth; error?: string }> {
  // ① 全球城市 id
  let city: NamedPlace | null = null
  const cityId = typeof fields.birthCityId === 'string' ? fields.birthCityId.trim() : ''
  if (cityId) {
    const g = await findCityById(cityId)
    if (!g) return { error: '未找到所选城市，请重新选择' }
    city = { name: g.name, lat: g.lat, lng: g.lng, zone: g.zone }
  }

  // ② 旧版城市名（仅匹配 380 策展城）
  const birthName = typeof fields.birthplace === 'string' ? fields.birthplace.trim() : ''
  if (!city && birthName) {
    const row = curated.find(c => c.name === birthName)
    if (row) city = { name: row.name, lat: row.lat, lng: row.lng, zone: row.zone }
  }

  // ③ 手动经度 + 时区
  const manualLng = fields.birthLng === undefined || fields.birthLng === null || fields.birthLng === ''
    ? undefined : Number(fields.birthLng)
  if (manualLng !== undefined && !Number.isFinite(manualLng)) {
    return { error: '经度不合法' }
  }
  const manualZone = typeof fields.birthZone === 'string' && fields.birthZone.trim()
    ? fields.birthZone.trim() : undefined
  if (manualZone && !isValidZone(manualZone)) {
    return {
      error: `时区不合法：「${manualZone}」不是可识别的 IANA 时区（如 America/New_York）`
    }
  }

  // ④ 统一解析（手动优先；仅时区时按标准中央经线，剥夏令时）
  const ref = resolveBirthRef({ manualLng, manualZone, city: city ?? undefined, when })
  return { data: { ref, city: ref ? city : null } }
}
