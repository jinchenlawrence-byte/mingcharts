/**
 * BaziQA Contest8 排盘脚本（HANDOFF-21 §4.1/§4.2/§6.1②）
 * 用法：node --import tsx scripts/baziqa-paipan.mjs
 * 产出：eval/baziqa/paipan-results.json（41 位命主：四柱 + timezoneOffsetApplied + A/B 文本）
 * 控制台：place→时区对照表、两个边界命主四柱（23:34/0:35）、敏感性核验（美国/1982 前马来西亚）
 */
import { writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { loadAllPersons, paipanPerson, mappingFor, buildStandardText, buildEnhancedFacts, EVAL_DIR, UPSTREAM_DIR } from './baziqa-lib.mjs'
import { paipan } from '../src/lib/paipan.ts'
import { getUtcOffsetHours } from '../src/lib/solarTime.ts'

const persons = loadAllPersons()
const records = []
const tzTable = []

for (const p of persons) {
  const { chart, analyzable, luck } = paipanPerson(p)
  const m = mappingFor(p.birth.place)
  const utcOff = getUtcOffsetHours(m.zone, p.birth)
  const pillars = {
    year: chart.pillars.year.ganZhi,
    month: chart.pillars.month.ganZhi,
    day: chart.pillars.day.ganZhi,
    hour: chart.pillars.hour.ganZhi,
  }
  records.push({
    person_id: p.person_id,
    contestYear: p.contestYear,
    birth: p.birth,
    gender: p.gender,
    name: p.name,
    mapping: m,
    utcOffsetHoursApplied: utcOff,
    timezoneOffsetApplied: chart.timezoneOffsetApplied,
    pillars,
    dayMaster: chart.dayMaster,
    taiYuan: chart.taiYuan,
    mingGong: chart.mingGong,
    shenGong: chart.shenGong,
    qiYun: chart.qiYun,
    daYun: chart.daYun,
    wangShuai: analyzable.analysis.wangShuai,
    geJu: analyzable.analysis.geJu,
    standardText: buildStandardText(p, chart),
    enhancedFacts: buildEnhancedFacts(analyzable, luck),
  })
  tzTable.push({ person_id: p.person_id, place: p.birth.place, zone: m.zone, lng: m.lng, utcOffsetHoursApplied: utcOff, timezoneOffsetApplied: chart.timezoneOffsetApplied, pillars })
}

// ── 敏感性核验①：粗粒度「美国」——美东（主）vs 美西 ──
const usPerson = persons.find(p => p.birth.place === '美国')
let usSensitivity = null
if (usPerson) {
  const base = { year: usPerson.birth.year, month: usPerson.birth.month, day: usPerson.birth.day, hour: usPerson.birth.hour, minute: usPerson.birth.minute, gender: usPerson.gender === 'male' ? 1 : 0 }
  const east = paipan({ ...base, birthZone: 'America/New_York', birthLng: -74.01 })
  const west = paipan({ ...base, birthZone: 'America/Los_Angeles', birthLng: -118.24 })
  const fmt = c => `${c.pillars.year.ganZhi} ${c.pillars.month.ganZhi} ${c.pillars.day.ganZhi} ${c.pillars.hour.ganZhi}`
  usSensitivity = {
    person_id: usPerson.person_id,
    primaryEast: { zone: 'America/New_York', pillars: fmt(east), timezoneOffsetApplied: east.timezoneOffsetApplied },
    westCheck: { zone: 'America/Los_Angeles', pillars: fmt(west), timezoneOffsetApplied: west.timezoneOffsetApplied },
    samePillars: fmt(east) === fmt(west),
  }
}

// ── 敏感性核验②：1982-01-01 前出生的马来西亚命主——历史 +7:30（主，tzdata）vs 现代 +8 平读 ──
const myPre1982 = records.filter(r => r.birth.place === '马来西亚' && r.birth.year < 1982)
const mySensitivity = myPre1982.map(r => {
  const p = persons.find(x => x.person_id === r.person_id)
  const base = { year: p.birth.year, month: p.birth.month, day: p.birth.day, hour: p.birth.hour, minute: p.birth.minute, gender: p.gender === 'male' ? 1 : 0 }
  const modern = paipan({ ...base, birthZone: 'Asia/Shanghai', birthLng: 101.69 }) // 强行按 +8 解读钟表时间
  const fmt = c => `${c.pillars.year.ganZhi} ${c.pillars.month.ganZhi} ${c.pillars.day.ganZhi} ${c.pillars.hour.ganZhi}`
  return {
    person_id: r.person_id,
    birth: `${p.birth.year}-${p.birth.month}-${p.birth.day} ${p.birth.hour}:${p.birth.minute}`,
    primaryEra: { zone: 'Asia/Kuala_Lumpur', pillars: r.pillars.year + ' ' + r.pillars.month + ' ' + r.pillars.day + ' ' + r.pillars.hour, utcOffsetHoursApplied: r.utcOffsetHoursApplied },
    modernPlus8Check: { pillars: fmt(modern) },
    samePillars: (r.pillars.year + ' ' + r.pillars.month + ' ' + r.pillars.day + ' ' + r.pillars.hour) === fmt(modern),
  }
})

// ── 边界命主四柱（任务书 §2.2：23:34 与 0:35 单独列出）──
const boundary = records.filter(r => (r.birth.hour === 23 && r.birth.minute >= 0) || r.birth.hour === 0)

const out = {
  _meta: {
    generatedAt: new Date().toISOString(),
    engine: 'bazi-mvp paipan()（lunar-javascript，晚子时 setSect(1)，真太阳时校正）',
    upstream: 'https://github.com/ChenJiangxi/BaziQA data/contest8_{2021..2025}.json',
    note: '本文件为我们的加工结果，upstream/ 原样未动；answer 字段一律不入本文件。',
  },
  usSensitivity,
  mySensitivity,
  boundaryCases: boundary.map(r => ({
    person_id: r.person_id,
    birth: `${r.birth.year}-${r.birth.month}-${r.birth.day} ${String(r.birth.hour).padStart(2, '0')}:${String(r.birth.minute).padStart(2, '0')} ${r.birth.place}`,
    timezoneOffsetApplied: r.timezoneOffsetApplied,
    utcOffsetHoursApplied: r.utcOffsetHoursApplied,
    pillars: r.pillars,
  })),
  records,
}

writeFileSync(join(EVAL_DIR, 'paipan-results.json'), JSON.stringify(out, null, 2), 'utf8')

// ── 控制台输出 ──
console.log(`排盘完成：${records.length} 位命主 → ${join(EVAL_DIR, 'paipan-results.json')}`)
console.log('')
console.log('=== place → 时区/经度 对照表（任务书 §4.2 验收③）===')
const seen = new Set()
for (const t of tzTable) {
  if (seen.has(t.place)) continue
  seen.add(t.place)
  const m = mappingFor(t.place)
  console.log(`${t.place.padEnd(10)} → ${m.zone.padEnd(20)} lng=${String(m.lng).padStart(8)} ${m.coarse ? '【粗粒度】' : ''}${m.note}`)
}
console.log('')
console.log('=== 逐命主 timezoneOffsetApplied（任务书 §4.2：逐一记录，不得只抽查）===')
for (const t of tzTable) {
  console.log(`${t.person_id.padEnd(38)} utcOff=${String(t.utcOffsetHoursApplied).padStart(5)}h trueSolar=${String(t.timezoneOffsetApplied).padStart(5)}min  四柱=${t.pillars.year} ${t.pillars.month} ${t.pillars.day} ${t.pillars.hour}`)
}
console.log('')
console.log('=== 边界命主四柱（23:00 换日约定）===')
for (const b of out.boundaryCases) console.log(`${b.person_id} ${b.birth} 真太阳偏移=${b.timezoneOffsetApplied}min → ${b.pillars.year} ${b.pillars.month} ${b.pillars.day} ${b.pillars.hour}`)
console.log('')
console.log('=== 敏感性①「美国」美东 vs 美西 ===')
if (usSensitivity) console.log(`主选美东: ${usSensitivity.primaryEast.pillars} | 美西: ${usSensitivity.westCheck.pillars} | 四柱相同=${usSensitivity.samePillars}`)
console.log('')
console.log('=== 敏感性② 1982 前马来西亚 历史+7:30 vs 现代+8 平读 ===')
for (const s of mySensitivity) console.log(`${s.person_id} ${s.birth} 主选(历史): ${s.primaryEra.pillars} (utcOff=${s.primaryEra.utcOffsetHoursApplied}h) | +8平读: ${s.modernPlus8Check.pillars} | 相同=${s.samePillars}`)
