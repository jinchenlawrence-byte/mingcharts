// 出生地城市数据（★ 同构模块：无 node: 依赖，客户端/服务端均可导入）
//
// 全球库的服务端访问（fs 查 id）在 worldCitiesServer.ts，
// 客户端懒加载在 worldCitiesClient.ts；本模块只放策展城市与类型再导出。
import birthCities from '@/data/birth-cities.json'

export type { GlobalCity, WorldData, RawWorld } from './worldCitiesParse'

export interface CityRow {
  id: number
  name: string
  nameEn?: string
  province: string
  lat: number
  lng: number
  zone: string
}

// 策展城市（380 城：358 中国 + 22 北美），保留兼容
export const cities = birthCities as CityRow[]
export const cnCities: CityRow[] = cities.filter(c => !c.nameEn)
export const naCities: CityRow[] = cities.filter(c => c.nameEn)
