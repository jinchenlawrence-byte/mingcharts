// 入口一致性回归（纳入 npm run verify，纯本地不耗 API）
//
// 教训（总纲 §8.5；合婚、geo 已连续两次）：「某个入口忘了接时区」单入口测试看不出来——
// 每个入口单独跑都是“通过”的，只有同一组出生数据【横向比对四柱】才暴露。
// 本脚本直接调用各 route handler（不重新实现任何解析逻辑），断言：
//   同一份出生请求体 → 批命 / geo / 合婚(男女) 的四柱必须逐字一致，且等于库级 paipan() 直算值。
import { POST as paipanPOST } from '../src/app/api/paipan/route.ts'
import { POST as geoPOST } from '../src/app/api/geo/route.ts'
import { POST as hemunPOST } from '../src/app/api/hemun/route.ts'
import { paipan } from '../src/lib/paipan.ts'
import { resolveBirthRef } from '../src/lib/solarTime.ts'
import { cities } from '../src/lib/birthCities.ts'

let failures = 0
const check = (ok, line) => {
  if (!ok) failures++
  console.log(`  ${ok ? '✓' : '✗'} ${line}`)
}

// 以库级直算为锚点：该路径由 test-solar-time.mjs §6.3 独立对 lunar-javascript 验过。
// 注意：城市名→经纬度/时区是 route 层解析（resolveBirthRef），锚点必须走同一解析，
// 不能把含 birthplace 的请求体直接塞给 paipan()（库函数只认 birthLng/birthZone）。
const anchor = (p) => {
  const city = p.birthplace ? cities.find(c => c.name === p.birthplace) : undefined
  const when = { year: p.year, month: p.month, day: p.day, hour: p.hour, minute: p.minute }
  const ref = resolveBirthRef({
    manualLng: p.birthLng !== undefined && Number.isFinite(p.birthLng) ? p.birthLng : undefined,
    manualZone: p.birthZone,
    city,
    when  // ★ 仅时区路径取标准经线需要出生年份
  })
  const c = paipan({
    year: p.year, month: p.month, day: p.day, hour: p.hour, minute: p.minute, gender: p.gender,
    birthLng: ref?.lng,
    birthZone: ref?.zone
  })
  return ['year', 'month', 'day', 'hour'].map(k => c.pillars[k].ganZhi)
}

const call = async (handler, payload) => {
  const req = new Request('http://localhost/', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  })
  const res = await handler(req)
  return res.json()
}

const pillars4 = (d, where) => {
  const src = where === 'paipan' ? d
    : where === 'geo' ? d.chart
    : null
  return ['year', 'month', 'day', 'hour'].map(k => src.pillars[k].ganZhi)
}

const eq4 = (a, b) => a.length === b.length && a.every((v, i) => v === b[i])

// 用例：① 北美城市（旧 bug 错 13 小时）② 手动经度+时区 ③ 西部城市乌鲁木齐（偏移超一个时辰）
//       ④ 中国非夏令时城市（零回归）⑤ 无出生地（默认路径）⑥ ★仅时区（「其它」路径，剥 DST）
// ★ 时刻是刻意选的，不是随手填的：必须落在「时辰起点 + |偏移|」之内，
//   使校正前后落在不同时辰，断言对该路径才有牙口（见 REPLY §二）。
//   切勿“顺手改成整点”——改后须同时核对下方「牙口自检」仍通过。
//   纽约偏移 -56 分：13:10（未时）校正后 12:14（午时），时柱必变。
//   ⑥ 仅时区 −60 分：13:30（未时）校正后 12:30（午时），时柱必变；日期刻意在 DST 期间。
const CASES = [
  ['纽约·城市', { year: 1990, month: 7, day: 1, hour: 13, minute: 10, gender: 1, birthplace: '纽约' }],
  ['纽约·手动', { year: 1990, month: 7, day: 1, hour: 13, minute: 10, gender: 1, birthLng: -74, birthZone: 'America/New_York' }],
  ['乌鲁木齐', { year: 1990, month: 1, day: 15, hour: 14, minute: 30, gender: 1, birthplace: '乌鲁木齐' }],
  ['北京', { year: 1992, month: 8, day: 15, hour: 9, minute: 0, gender: 1, birthplace: '北京' }],
  ['无出生地', { year: 1990, month: 7, day: 1, hour: 14, minute: 30, gender: 1 }],
  ['纽约·仅时区', { year: 1990, month: 7, day: 15, hour: 13, minute: 30, gender: 1, birthZone: 'America/New_York' }],
]

for (const [label, payload] of CASES) {
  console.log(`\n====== ${label} ======`)
  const expected = anchor(payload)
  console.log(`  期望四柱：${expected.join(' ')}`)

  // ★ 牙口自检：凡带出生地的案例，无校正（偏移0）时柱必须与校正后不同；
  //   相同说明时刻落在判别边界外，案例无牙（REPLY §二），直接判红——
  //   这样以后谁把时刻改成整点，牙口丢失会立刻被发现，而不是无声退化。
  const hasRef = payload.birthplace || payload.birthLng !== undefined || !!payload.birthZone
  if (hasRef) {
    const bare = paipan({
      year: payload.year, month: payload.month, day: payload.day,
      hour: payload.hour, minute: payload.minute, gender: payload.gender
    })
    check(bare.pillars.hour.ganZhi !== expected[3],
      `牙口自检：无校正时柱 ${bare.pillars.hour.ganZhi} ≠ 校正后 ${expected[3]}`)
  }

  const [pj, gj, hj] = await Promise.all([
    call(paipanPOST, payload),
    call(geoPOST, payload),
    call(hemunPOST, { male: payload, female: { ...payload, gender: 0 } })
  ])

  if (!pj.success) { check(false, `批命入口返回错误：${pj.error}`); continue }
  if (!gj.success) { check(false, `geo 入口返回错误：${gj.error}`); continue }
  if (!hj.success) { check(false, `合婚入口返回错误：${hj.error}`); continue }

  const gotPaipan = pillars4(pj.data, 'paipan')
  const gotGeo = pillars4(gj.data, 'geo')
  const gotMale = ['year', 'month', 'day', 'hour'].map(k => hj.data.male.pillars[k].ganZhi)
  const gotFemale = ['year', 'month', 'day', 'hour'].map(k => hj.data.female.pillars[k].ganZhi)

  check(eq4(gotPaipan, expected), `批命四柱一致：${gotPaipan.join(' ')}`)
  check(eq4(gotGeo, expected), `geo 四柱一致：${gotGeo.join(' ')}`)
  check(eq4(gotMale, expected), `合婚·男方四柱一致：${gotMale.join(' ')}`)
  check(eq4(gotFemale, expected), `合婚·女方四柱一致：${gotFemale.join(' ')}`)

  // 横向互比（即使锚点路径将来出问题，入口之间也不许分裂）
  check(eq4(gotGeo, gotPaipan) && eq4(gotMale, gotPaipan) && eq4(gotFemale, gotPaipan),
    '四入口横向互比一致')

  // 生效偏移也须一致且真的非零（防「字段在、值没算」）
  const offPaipan = pj.data.timezoneOffsetApplied
  const offGeo = gj.data.chart.timezoneOffsetApplied
  const offMale = hj.data.male.timezoneOffsetApplied
  check(offGeo === offPaipan && offMale === offPaipan,
    `生效偏移一致：${offPaipan} 分`)
}

// ★ geo 现居城市按 global id 解析（回归：旧实现只挂 380 城下拉且仅按名称查旧库）
// 用伦敦（旧 380 策展/geo-cities 名单覆盖稀薄处）；断言坐标精确、方位分析真跑了。
console.log('\n--- geo 现居城市 currentCityId（全球库路径）---')
{
  const base = { year: 1990, month: 7, day: 15, hour: 13, minute: 30, gender: 1, birthCityId: '5128581' }
  const r = await call(geoPOST, { ...base, currentCityId: '2643743' }) // London GB
  const cc = r.data?.geo?.currentCity
  check(cc?.name === 'London' && Math.abs(cc.lat - 51.5074) < 0.01 && Math.abs(cc.lng + 0.1276) < 0.01,
    `伦敦按 id 解析 → ${cc?.name} (${cc?.lat},${cc?.lng})`)
  check(!!cc?.level && typeof cc?.distanceKm === 'number',
    `现居方位分析生效 → 档位「${cc?.level}」、距出生地 ${cc?.distanceKm} km`)

  // 牙口自检：不存在的 id 必须安全落空（不 500、不误判）
  const bad = await call(geoPOST, { ...base, currentCityId: 'not-a-city-999' })
  check(bad.success && bad.data.geo.currentCity === null,
    '伪造 currentCityId → currentCity=null（无 500）')
}

console.log('')
if (failures > 0) {
  console.log(`ENTRY_CONSISTENCY_FAIL（${failures} 项不一致）`)
  process.exit(1)
}
console.log('ENTRY_CONSISTENCY_PASS')
