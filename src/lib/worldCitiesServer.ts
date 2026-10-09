// 全球城市库·服务端访问层（仅 route/服务端使用；含 node:fs，禁止被客户端组件导入）
//
// ★ 为什么与 worldCitiesClient.ts 分开：客户端组件一旦（哪怕间接）导入含 node:fs
//   的模块，Turbopack 会报「does not support external modules (request: node:fs)」。
//   客户端请用 src/lib/worldCitiesClient.ts（fetch 懒加载）。
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { parseWorld } from './worldCitiesParse'
import type { WorldData } from './worldCitiesParse'

let cache: Promise<WorldData> | null = null

/** 服务端加载全球库（进程内缓存；首读约 2.6MB，不进客户端 bundle） */
export function loadWorldData(): Promise<WorldData> {
  if (!cache) {
    cache = Promise.resolve().then(() => {
      const file = join(process.cwd(), 'public', 'data', 'world-cities.json')
      return parseWorld(JSON.parse(readFileSync(file, 'utf8')))
    })
    // 加载失败时清缓存，允许后续请求重试
    cache.catch(() => { cache = null })
  }
  return cache
}

/** 按 cityId 精确查全球城市；未找到返回 null */
export async function findCityById(id: string) {
  const world = await loadWorldData()
  return world.byId.get(id) ?? null
}
