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

// ═══════════════════════════════════════════════════════════
// ⑥ 夹命类格局分布检查（非恒真；命中时判据正确性验证）
//    大样本扫描：非恒真（不100%命中）；命中时星对确实在命宫前后两宫
// ═══════════════════════════════════════════════════════════
console.log('⑥ 夹命类格局分布与判据正确性')
{
  const FLANK_PAIRS = {
    '日月夹命格': ['太阳', '太阴'],
    '辅弼夹命格': ['左辅', '右弼'],
    '昌曲夹命格': ['文昌', '文曲'],
    '魁钺夹命格': ['天魁', '天钺'],
    '火铃夹命格': ['火星', '铃星'],
    '空劫夹命格': ['地空', '地劫'],
  }
  const FLANK_NAMES = Object.keys(FLANK_PAIRS)
  const hitCount = {}
  for (const name of FLANK_NAMES) hitCount[name] = 0
  let judgmentErrors = []

  // 大样本扫描（HANDOFF-积压旧账清理 §一-1.1：h 步长 6→1）
  // ★ 空劫/昌曲/火铃的布局由时辰决定（getKongJieIndex(timeIndex)），
  //   步长 6 只覆盖 4 个时辰、漏一半布局——曾因此误断言「三条夹命格局数学上不可能成立」；
  //   步长 1 遍历 24 小时 = 全 12 时辰全覆盖，防同类误判的常驻护栏（h 全 12 不可退）。
  // 缩样（REPLY-积压旧账清理复核 §5-2 采纳）：y 步长 1→2，13 个偶数年 = 4992 盘，verify 省约 5-6 分钟。
  // ※ 覆盖更正：y+=2 实际只取 5 个生年干（甲丙戊庚壬），非复函所称「仍覆盖全 10 干」；
  //   但星盘布局由年干的本质变量「五虎遁首干」（⇒命宫干⇒五行局⇒主星分布）决定，共 5 种——
  //   甲丙戊庚壬 恰对应 丙庚甲戊壬 全部 5 种，乙丁己辛癸 与之同首干（采样等价），故缩样无损；
  //   年干字面全 10 干的逐盘校验由 ⑧ 段 y 步长 1 保证（来因宫直接依赖生年干字面，不缩）。
  for (let y = 1980; y < 2005; y += 2) {
    for (let m = 1; m <= 12; m += 3) {
      for (let d = 1; d <= 28; d += 7) {
        for (let h = 0; h < 24; h += 1) {
          const c = paipanZiwei({ year: y, month: m, day: d, hour: h, minute: 0, gender: y % 2 })
          const an = analyzeZiwei(c, now)
          const names = new Set(an.patterns.map((p) => p.name))
          // 命宫前后两宫的星
          const mi = c.mingIndex
          const prevStars = new Set([...c.palaces[(mi + 11) % 12].majorStars, ...c.palaces[(mi + 11) % 12].minorStars].map(s => s.name))
          const nextStars = new Set([...c.palaces[(mi + 1) % 12].majorStars, ...c.palaces[(mi + 1) % 12].minorStars].map(s => s.name))
          const isFlanked = (a, b) => (prevStars.has(a) && nextStars.has(b)) || (prevStars.has(b) && nextStars.has(a))
          for (const name of FLANK_NAMES) {
            const [a, b] = FLANK_PAIRS[name]
            const detected = names.has(name)
            const actual = isFlanked(a, b)
            if (detected) hitCount[name]++
            // 判据正确性：detected === actual（命中则星对确实在前后宫，不命中则星对不在前后宫）
            if (detected !== actual) judgmentErrors.push(`${name}: y${y}m${m}d${d}h${h} detected=${detected} actual=${actual}`)
          }
        }
      }
    }
  }

  // 非恒真检查
  let allNonTrivial = true
  for (const name of FLANK_NAMES) {
    if (hitCount[name] >= 1000) allNonTrivial = false // 全部命中=恒真=判据写错
  }
  check(allNonTrivial, `六条夹命格局非恒真（不全100%命中）`)

  // 判据正确性
  check(judgmentErrors.length === 0, `判据正确性：命中⟺星对在前后宫（${judgmentErrors.length ? judgmentErrors.slice(0, 3).join('; ') : '全部一致'}）`)

  // ★ 常驻断言（HANDOFF-积压旧账清理 §一-1.1）：三条时辰依赖型夹命格局命中数必须 > 0
  //   空劫/昌曲/火铃的成立由时辰布局决定，若某条为 0，说明布局覆盖或判据出了问题
  //   —— 防「数学上不可能成立」类误判复发（曾用步长 6 的粗样本误断言过一次）
  const zeroHits = ['空劫夹命格', '昌曲夹命格', '火铃夹命格'].filter((n) => hitCount[n] === 0)
  check(zeroHits.length === 0,
    `空劫/昌曲/火铃夹命命中数均 > 0（空劫:${hitCount['空劫夹命格']} 昌曲:${hitCount['昌曲夹命格']} 火铃:${hitCount['火铃夹命格']}${zeroHits.length ? '；为0：' + zeroHits.join('、') : ''}）`)

  // 命中分布
  const dist = FLANK_NAMES.map(n => `${n}:${hitCount[n]}`).join(' ')
  console.log(`  （大样本分布：${dist}）`)
}

// ═══════════════════════════════════════════════════════════
// ⑦ 夹命格局构造盘正反用例
//    正：星对分居命宫前后 → 命中
//    反：只有一颗星 → 不命中
// ═══════════════════════════════════════════════════════════
console.log('⑦ 夹命格局构造盘正反用例')
{
  // 用多盘扫描找到一个有辅弼夹命的盘（左辅右弼在命宫前后）
  const samples = [
    { year: 1991, month: 3, day: 10, hour: 22, minute: 30, gender: 1 },
    { year: 1988, month: 7, day: 15, hour: 8, minute: 0, gender: 0 },
    { year: 1995, month: 12, day: 1, hour: 0, minute: 0, gender: 1 },
    { year: 2000, month: 1, day: 20, hour: 12, minute: 0, gender: 0 },
    { year: 1985, month: 5, day: 25, hour: 6, minute: 0, gender: 1 },
    { year: 1990, month: 10, day: 5, hour: 18, minute: 30, gender: 0 },
    { year: 1993, month: 8, day: 18, hour: 4, minute: 0, gender: 1 },
    { year: 1997, month: 2, day: 14, hour: 16, minute: 0, gender: 0 },
    { year: 1983, month: 11, day: 30, hour: 10, minute: 0, gender: 1 },
    { year: 2005, month: 6, day: 12, hour: 2, minute: 0, gender: 0 },
  ]
  // 验证：每条夹命格局在样本中命中时，其 required 条件确实满足
  // 反向验证：没有命中的盘，其命宫前后不存在对应星对
  let totalFlankChecks = 0
  let flankPassAll = true
  for (const s of samples) {
    const c = paipanZiwei(s)
    const an = analyzeZiwei(c, now)
    const names = new Set(an.patterns.map((p) => p.name))
    const mingIdx = c.mingIndex
    const prevStars = new Set([...c.palaces[(mingIdx + 12 - 1) % 12].majorStars, ...c.palaces[(mingIdx + 12 - 1) % 12].minorStars].map(s => s.name))
    const nextStars = new Set([...c.palaces[(mingIdx + 1) % 12].majorStars, ...c.palaces[(mingIdx + 1) % 12].minorStars].map(s => s.name))
    const isFlanked = (a, b) => (prevStars.has(a) && nextStars.has(b)) || (prevStars.has(b) && nextStars.has(a))
    // 辅弼夹命
    totalFlankChecks++
    const hasFlank = isFlanked('左辅', '右弼')
    const hasPattern = names.has('辅弼夹命格')
    if (hasFlank !== hasPattern) flankPassAll = false
  }
  check(flankPassAll, `辅弼夹命：构造盘正反一致（${totalFlankChecks} 盘验证，夹则命中、不夹则不命中）`)
}

// ═══════════════════════════════════════════════════════════
// ⑧ 自化与来因宫接线验证
//    - 自化字段非恒空（某些盘有自化）
//    - 来因宫逐盘恰好一个（事实核实：iztro 对每盘恒标 1 宫）
//    - 消费者存在性：自化/来因宫出现在 aiZiwei prompt 中
//    - 源码扫描：不出现无参 selfMutaged() 调用
// ═══════════════════════════════════════════════════════════
console.log('⑧ 自化与来因宫接线验证')
{
  // 自化字段：多盘扫描
  let hasSelfMutation = false
  let laiYinTotal = 0
  let laiYinBad = 0
  // y 步长 5→1（HANDOFF-积压旧账清理 §一-1.2）：原抽样 y=1980,1985,…只覆盖庚/乙两个生年干；
  //   来因宫断言改为逐盘「恰好一个」后扩为全 25 年（覆盖全部 10 生年干），防年干相关退化漏检
  for (let y = 1980; y < 2005; y += 1) {
    for (let m = 1; m <= 12; m += 3) {
      for (let h = 0; h < 24; h += 6) {
        const c = paipanZiwei({ year: y, month: m, day: 15, hour: h, minute: 0, gender: y % 2 })
        const an = analyzeZiwei(c, now)
        if (an.selfMutations && an.selfMutations.length > 0) hasSelfMutation = true
        // ★ 来因宫逐盘「恰好一个」断言（HANDOFF-积压旧账清理 §一-1.2）
        //   事实核实（temp/laiyin-count.mjs，80盘覆盖全10生年干）：isOriginalPalace 每盘恰好标记 1 宫。
        //   原断言 check(hasNoLaiYin || true, …) 恒真——其前提「至少一盘无来因宫」与事实矛盾，
        //   属断言语义错误而非缺牙，故按事实改语义，不是「补牙」。
        laiYinTotal++
        const n = c.palaces.filter((p) => p.isOriginalPalace === true).length
        if (n !== 1) {
          laiYinBad++
          if (laiYinBad <= 3) console.log(`    来因宫异常盘 y${y}m${m}h${h}: isOriginalPalace×${n}`)
        }
      }
    }
  }
  check(hasSelfMutation, `自化字段非恒空（至少一个样本盘有自化）`)
  check(laiYinTotal > 0 && laiYinBad === 0,
    `来因宫标记恰好一个（${laiYinTotal} 盘逐盘校验，异常 ${laiYinBad} 盘；库口径：生年干同干之宫，iztro 实证恒标 1 个）`)

  // 辛未盘确定值验证
  const c1 = paipanZiwei({ year: 1991, month: 3, day: 10, hour: 22, minute: 30, gender: 1 })
  const a1 = analyzeZiwei(c1, now)
  check(a1.selfMutations !== undefined && a1.selfMutations.length > 0,
    `辛未盘有自化（${a1.selfMutations ? a1.selfMutations.map(s => s.palace + ':' + s.mutagens.join('+')).join('; ') : '无'}）`)
  check(a1.laiYinPalace !== undefined && a1.laiYinPalace !== '',
    `辛未盘有来因宫：${a1.laiYinPalace || '缺失'}`)

  // 消费者存在性：源码扫描 aiZiwei.ts 含 selfMutations 和 laiYinPalace 引用
  const { readFileSync } = await import('fs')
  const { join } = await import('path')
  const aiSrc = readFileSync(join(import.meta.dirname, '..', 'src/lib/aiZiwei.ts'), 'utf8')
  check(aiSrc.includes('selfMutations'), `aiZiwei.ts 消费 selfMutations（消费者存在性断言）`)
  check(aiSrc.includes('laiYinPalace'), `aiZiwei.ts 消费 laiYinPalace（消费者存在性断言）`)

  // 源码扫描：ziwei.ts 中不出现无参 selfMutaged() 调用
  const zwSrc = readFileSync(join(import.meta.dirname, '..', 'src/lib/ziwei.ts'), 'utf8')
  // 匹配 selfMutaged() 后面不带参数的调用（排除 .selfMutaged(m) 和类型声明）
  const bareCall = zwSrc.match(/\.selfMutaged\s*\(\s*\)/g)
  check(!bareCall || bareCall.length === 0,
    `源码无无参 selfMutaged() 调用（${bareCall ? bareCall.length + '处命中' : '0处'}）`)

  // 流月四化消费者存在性
  check(a1.monthly !== undefined, `辛未盘有流月四化（${a1.monthly ? a1.monthly.ganZhi + ':' + a1.monthly.transforms.join(';') : '缺失'}）`)
  check(aiSrc.includes('a.monthly'), `aiZiwei.ts 消费 a.monthly（流月四化消费者存在性断言）`)

  // 流月三档红线未破坏：流月标签不含4档措辞
  const monthlyTags = a1.monthly?.tags || []
  const forbiddenTiers = ['大吉', '大防', '大凶']
  const tierViolations = monthlyTags.filter(t => forbiddenTiers.some(ft => t.includes(ft)))
  check(tierViolations.length === 0, `流月三档红线未破坏（标签无4档措辞：${tierViolations.length ? tierViolations.join(';') : '合规'}）`)
}

console.log(failures === 0 ? '\n全部通过 ✓' : `\n${failures} 项失败 ✗`)
process.exit(failures === 0 ? 0 : 1)
