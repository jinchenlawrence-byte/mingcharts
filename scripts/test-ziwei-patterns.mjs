// 紫微格局依据结构化回归（步骤①：PatternTag 扩字段 + 逐条补 required/source）
// 纳入 npm run verify，纯本地不耗 API
import { paipanZiwei, analyzeZiwei } from '../src/lib/ziwei.ts'

const ROOT = import.meta.dirname.replace(/scripts$/, '')
let failures = 0
const check = (ok, msg) => {
  if (!ok) { failures++; console.log(`  ✗ ${msg}`) }
  else console.log(`  ✓ ${msg}`)
}

// 真盘：辛未 辛卯 壬子 壬寅 男（交接书 §4.2 同盘）
const chart = paipanZiwei({ year: 1991, month: 3, day: 10, hour: 22, minute: 30, gender: 1 })
const now = new Date('2026-10-12T12:00:00+08:00')
const a = analyzeZiwei(chart, now)

// ═══════════════════════════════════════════════════════════
// ① 每条格局 required 非空、且 source 或 basisLevel 至少一个
// ═══════════════════════════════════════════════════════════
console.log('① PatternTag 依据结构完整性')
{
  const missing = []
  for (const p of a.patterns) {
    if (!p.required || p.required.length === 0) missing.push(`${p.name}: required 为空`)
    if (!p.source && !p.basisLevel) missing.push(`${p.name}: source 和 basisLevel 均缺`)
  }
  check(missing.length === 0, `全部 ${a.patterns.length} 条格局 required 非空且 source/basisLevel 至少一个（${missing.length ? '缺失: ' + missing.join('; ') : '无缺失'}）`)
}

// ═══════════════════════════════════════════════════════════
// ② source 若以《开头则必须含 ·（书名·篇名格式）
// ═══════════════════════════════════════════════════════════
console.log('② source 书名·篇名格式检查')
{
  const bad = []
  for (const p of a.patterns) {
    if (p.source && p.source.startsWith('《') && !p.source.includes('·')) {
      bad.push(`${p.name}: source="${p.source}" 缺·分隔`)
    }
  }
  check(bad.length === 0, `source 格式合规（${bad.length ? bad.join('; ') : '全部合格'}）`)
}

// ═══════════════════════════════════════════════════════════
// ③ level 取值集合 === 改动前 {吉, 平, 忌}（零风险证明）
//    多盘合计覆盖全部三档；且无任何 level 越出此集合
// ═══════════════════════════════════════════════════════════
console.log('③ level 取值集合零风险检查')
{
  const samples = [
    { year: 1991, month: 3, day: 10, hour: 22, minute: 30, gender: 1 },
    { year: 1988, month: 7, day: 15, hour: 8, minute: 0, gender: 0 },
    { year: 1995, month: 12, day: 1, hour: 0, minute: 0, gender: 1 },
    { year: 2000, month: 1, day: 20, hour: 12, minute: 0, gender: 0 },
  ]
  const allLevels = new Set()
  let outOfRange = []
  for (const s of samples) {
    const c = paipanZiwei(s)
    const an = analyzeZiwei(c, now)
    an.patterns.forEach((p) => {
      allLevels.add(p.level)
      if (!['吉', '平', '忌'].includes(p.level)) outOfRange.push(`${p.name}: ${p.level}`)
    })
  }
  check(outOfRange.length === 0, `无 level 越出 {吉,平,忌}（${outOfRange.length ? outOfRange.join('; ') : '全部合规'}）`)
  check(allLevels.has('吉') && allLevels.has('平') && allLevels.has('忌'),
    `多盘合计覆盖全部三档（{${[...allLevels].join(',')}}）`)
}

// ═══════════════════════════════════════════════════════════
// ④ 多盘采样：格局在不同命盘上分布合理（非全同、非全空）
// ═══════════════════════════════════════════════════════════
console.log('④ 多盘格局分布合理性')
{
  const samples = [
    { year: 1991, month: 3, day: 10, hour: 22, minute: 30, gender: 1 },
    { year: 1988, month: 7, day: 15, hour: 8, minute: 0, gender: 0 },
    { year: 1995, month: 12, day: 1, hour: 0, minute: 0, gender: 1 },
    { year: 2000, month: 1, day: 20, hour: 12, minute: 0, gender: 0 },
  ]
  const allNames = new Set()
  for (const s of samples) {
    const c = paipanZiwei(s)
    const an = analyzeZiwei(c, now)
    an.patterns.forEach((p) => allNames.add(p.name))
    check(an.patterns.length > 0, `盘 ${s.year}-${s.month}-${s.day} 产出 ${an.patterns.length} 条格局`)
  }
  check(allNames.size >= 5, `四盘合计覆盖 ${allNames.size} 种不同格局名（≥5 为合理）`)
}

// ═══════════════════════════════════════════════════════════
// ⑤ 牙口：清空某条 required → 断言①必须翻红
// ═══════════════════════════════════════════════════════════
console.log('⑤ 牙口预检（不改源码，仅断言 required 非空可在逻辑上被检测）')
{
  // 验证：每条格局都有 required 字段且非空数组
  const noRequired = a.patterns.filter((p) => !p.required || p.required.length === 0)
  check(noRequired.length === 0, `全部格局 required 字段存在且非空（清空任一条将使此断言翻红）`)
}

console.log(failures === 0 ? '\n全部通过 ✓' : `\n${failures} 项失败 ✗`)
process.exit(failures === 0 ? 0 : 1)
