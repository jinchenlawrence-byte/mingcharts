// 全球城市库：紧凑 JSON 的类型与解析（同构模块——无 node: 依赖，服务端/客户端共用）
// 数据由 scripts/build-world-cities.mjs 生成（GeoNames，CC-BY 4.0）。

export interface GlobalCity {
  id: string
  name: string
  // ascii 名（忽略重音搜索），与 name 相同时缺省。
  // 外国城＝GeoNames asciiname；中国城＝中文名的无声调拼音（构建期 pinyin-pro 生成，ü→v）
  ascii?: string
  lat: number
  lng: number
  zone: string
  // 中文搜索别名（22 个北美策展城）
  aliasZh?: string
  // 反查用：所属国家与州/省
  countryCode: string
  countryName: string
  admin1Name: string
}

export interface WorldData {
  countries: Array<{
    code: string
    name: string
    admin1: Array<{ code: string; name: string; cities: GlobalCity[] }>
  }>
  byId: Map<string, GlobalCity>
  flat: GlobalCity[]
}

// 紧凑 JSON 行（键名约定见 build 脚本注释）
// ⚠ 键名歧义说明（任务书 §5.3）：`a` 在不同层级含义不同——
//   RawWorld.countries[].a = admin1（州/省）数组；
//   RawCity.a = latitude（纬度）。层级不同不会冲突，但维护时勿混淆；
//   若未来重构，建议把城市纬度改为 `y` 并保留 `a` 仅表示 admin1。
export interface RawCity {
  i: number | string  // GeoNames id（中国城带 'c' 前缀）
  n: string           // name（中国城=中文名，外国城=英文名）
  x?: string          // ascii 名（外国城）
  a: number           // latitude（纬度）
  o: number           // longitude（经度）
  z: string           // IANA 时区
  h?: string          // 中文别名（仅策展外国城，最多 22 条）
}
export interface RawWorld {
  v: number
  countries: Array<{
    c: string
    n: string
    a: Array<{ c: string; n: string; t: RawCity[] }>
  }>
}

export function parseWorld(raw: RawWorld): WorldData {
  const byId = new Map<string, GlobalCity>()
  const flat: GlobalCity[] = []
  const countries = raw.countries.map(co => ({
    code: co.c,
    name: co.n,
    admin1: co.a.map(ad => ({
      code: ad.c,
      name: ad.n,
      cities: ad.t.map((rc): GlobalCity => {
        const city: GlobalCity = {
          id: String(rc.i),
          name: rc.n,
          lat: rc.a,
          lng: rc.o,
          zone: rc.z,
          countryCode: co.c,
          countryName: co.n,
          admin1Name: ad.n
        }
        if (rc.x) city.ascii = rc.x
        if (rc.h) city.aliasZh = rc.h
        byId.set(city.id, city)
        flat.push(city)
        return city
      })
    }))
  }))
  return { countries, byId, flat }
}
