// 全球城市库客户端：首次使用时懒加载（不进主 bundle），之后缓存。
// 提供：级联数据访问（国家/州省/城市）与搜索。
import { parseWorld } from './worldCitiesParse'
import type { GlobalCity, WorldData } from './worldCitiesParse'

let cache: Promise<WorldData> | null = null

export function loadWorldData(): Promise<WorldData> {
  if (!cache) {
    cache = fetch('/data/world-cities.json')
      .then(async (res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        return parseWorld(await res.json())
      })
      .catch((e) => {
        // 失败允许下次重试
        cache = null
        throw e
      })
  }
  return cache
}

// ───────── 三级级联 ─────────

export function countriesOf(w: WorldData) {
  return w.countries
}

export function admin1Of(w: WorldData, cc: string) {
  return w.countries.find(c => c.code === cc)?.admin1 ?? []
}

export function citiesOf(w: WorldData, cc: string, a1: string) {
  return w.countries.find(c => c.code === cc)
    ?.admin1.find(a => a.code === a1)?.cities ?? []
}

export function cityById(w: WorldData, id: string): GlobalCity | null {
  return w.byId.get(id) ?? null
}

// ───────── 搜索 ─────────
//
// 命名范围（任务书 §3.4）：
//   中国城市 → 匹配中文名
//   外国城市 → 匹配英文名 + ascii 名（ascii 用于忽略重音，如 Sao Paulo 命中 São Paulo）
//             ＋ 22 城中文别名（纽约/洛杉矶…）

export interface SearchHit {
  city: GlobalCity
  // 显示行：名称 · 国家 州/省
  label: string
}

export function searchCities(w: WorldData, query: string, limit = 50): SearchHit[] {
  const q = query.trim().toLowerCase()
  if (!q) return []
  const hits: Array<{ city: GlobalCity; rank: number }> = []
  for (const city of w.flat) {
    const name = city.name.toLowerCase()
    const candidates = [name]
    if (city.ascii) candidates.push(city.ascii.toLowerCase())
    if (city.aliasZh) candidates.push(city.aliasZh.toLowerCase())
    // 中文名城市以中文名匹配
    if (city.countryCode === 'CN') candidates.push(city.name)

    let rank = -1
    for (const c of candidates) {
      if (c === q) { rank = 0; break }
      if (c.startsWith(q)) { if (rank < 1) rank = 1 }
      else if (c.includes(q)) { if (rank < 2) rank = 2 }
    }
    if (rank >= 0) hits.push({ city, rank })
  }
  hits.sort((a, b) =>
    a.rank - b.rank ||
    a.city.name.localeCompare(b.city.name) ||
    a.city.countryName.localeCompare(b.city.countryName))
  return hits.slice(0, limit).map(h => ({
    city: h.city,
    label: `${h.city.name} · ${h.city.countryName} · ${h.city.admin1Name}`
  }))
}
