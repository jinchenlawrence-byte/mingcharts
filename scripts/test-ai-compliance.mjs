// AI 输出合规抽验：4 个 AI 模块 × 每模块 3 个用例 = 12 次真实 API 调用
// 需网络与 API 额度；单独入口 npm run verify:ai（不并入 verify，verify 须可离线跑）
//
// ※ 抽样性质（纪律 §8.4.6）：AI 输出具非确定性，单次结果不构成稳定保证
//
// AI 模块在模块初始化时读取 process.env，故先加载 .env.local，再动态导入
process.loadEnvFile(new URL('../.env.local', import.meta.url))
if (!process.env.AI_API_KEY) {
  console.log('AI_API_KEY 未配置，无法抽验（.env.local）')
  process.exit(2)
}

const { paipan, getWangShuai, getGeJu } = await import('../src/lib/paipan.ts')
const { generateAnalysis } = await import('../src/lib/analysis.ts')
const { generateAIAnalysis } = await import('../src/lib/aiAnalysis.ts')
const { hehun } = await import('../src/lib/hemun.ts')
const { generateAIHemun } = await import('../src/lib/aiHemun.ts')
const { analyzeGeo } = await import('../src/lib/geo.ts')
const { generateAIGeo } = await import('../src/lib/aiGeo.ts')
const { paipanZiwei, analyzeZiwei } = await import('../src/lib/ziwei.ts')
const { generateAIZiwei } = await import('../src/lib/aiZiwei.ts')
const {
  findForbidden, classifyConfuse, unknownGanzhi, splitSentences
} = await import('../src/lib/ai-check.ts')

// ---------- 检查常量 ----------
const BASIS_WORDS = ['典籍', '古法', '民俗', '产品设定']
const JIAZI_RE = /[甲乙丙丁戊己庚辛壬癸][子丑寅卯辰巳午未申酉戌亥]/g
// 紫微 prompt 实际给出宫干支的 7 个关键宫（其余 5 宫 prompt 未给，不进事实集）
const ZW_KEY7 = new Set(['命宫', '官禄', '财帛', '夫妻', '迁移', '福德', '疾厄'])

// 7 项检查；opts：needBasis（合婚/地理才查 3、4）；dayunSection（批命查 5、6）；strictBi（合婚物理禁必）
function runChecks(label, sections, factsGanzhi, opts) {
  const text = Object.values(sections).join('\n')
  let ok = true
  const mark = (b, line) => { if (!b) ok = false; console.log(`  ${b ? '✓' : '✗'} ${line}`) }

  console.log(`\n========== ${label}（全文 ${text.length} 字）==========`)

  // 1 禁用词（判据来自共享源 src/lib/ai-check.ts，与产品兜底同源）
  const { hits, skipped } = findForbidden(text, opts.strictBi)
  mark(hits.length === 0, hits.length
    ? `禁用词命中：${[...new Set(hits.map(h => h.w))].join('、')}`
    : '禁用词 0 命中')
  hits.forEach(h => console.log(`     「${h.s}」（${h.w}）`))
  skipped.forEach(h => console.log(`  ℹ️ 否定式不判违规：「${h.s}」（${h.w}）`))

  // 2 免责立场
  const hasSoft = /倾向|参考|宜|注意/.test(text)
  const hasDisc = /非确定性|仅供参考|不构成/.test(text)
  mark(hasSoft && hasDisc, `免责立场（留余地词 ${hasSoft ? '✓' : '✗'}＋免责声明 ${hasDisc ? '✓' : '✗'}）`)

  // 3 依据分级（仅合婚/地理）
  if (opts.needBasis) {
    const basis = BASIS_WORDS.filter(w => text.includes(w))
    mark(basis.length >= 2, `依据分级出现 ${basis.length} 类：${basis.join('、') || '无'}（须≥2）`)

    // 4 不得混淆依据：两档判定（§8.4.5）；INFO 打印但不判失败，不静默丢弃
    const { fail, info } = classifyConfuse(text)
    mark(fail.length === 0, fail.length
      ? `依据混淆 ${fail.length} 句：「${fail[0]}」`
      : '无依据混淆')
    info.forEach(s => console.log(`  ℹ️ 已排除否定式：「${s}」`))
  }

  // 5/6 批命大运段
  if (opts.dayunSection) {
    const dy = sections[opts.dayunSection] || ''
    const domains = ['事业', '财运', '健康', '六亲'].filter(w => dy.includes(w))
    mark(domains.length >= 3, `大运段分维度 ${domains.length} 个：${domains.join('、') || '无'}（须≥3）`)

    const diseaseWords = ['被合', '被冲', '被化', '被夺', '深藏', '孤立', '印化', '比劫']
    const diseases = diseaseWords.filter(w => dy.includes(w))
    // 同义合规表述：大运段内出现喜用效果折损论述（不绑定「结构病」固定字样——
    // 模型两轮均写「制身之力不纯、喜中带忌、力度打折」，实质就是点明喜用是否真正有效）
    const diseaseMarked = /不纯|喜中带忌|力度打折|受制|被绊|有损/.test(dy)
    const hasDisease = diseases.length > 0 || diseaseMarked
    mark(hasDisease, hasDisease
      ? `大运段结构病：${diseases.join('、') || '效果折损表述（须≥1）'}`
      : '大运段结构病词：无（须≥1）')
    // 0 命中时打印大运段原文，供甄别「真缺失」还是「同义换词」
    if (!hasDisease) {
      console.log(`     大运段原文：${dy.slice(0, 300)}${dy.length > 300 ? '…' : ''}`)
    }
  }

  // 7 不编造：文中干支须在算法事实集内（判据来自共享源）
  const unknown = unknownGanzhi(text, factsGanzhi)
  const used = [...new Set(text.match(JIAZI_RE) || [])]
  mark(unknown.length === 0, unknown.length
    ? `干支未见于算法事实集：${unknown.join('、')}`
    : `文中干支均可溯源（${used.join('、') || '无'}）`)
  // 未溯源干支打印所在句，供甄别笔误/编造
  unknown.forEach(g => {
    const s = splitSentences(text).find(x => x.includes(g))
    if (s) console.log(`     「${s.slice(0, 120)}」（${g}）`)
  })

  return ok
}

// ---------- 用例定义 ----------
const now = new Date()
const modules = ['aiAnalysis', 'aiHemun', 'aiGeo', 'aiZiwei']
const tally = Object.fromEntries(modules.map(m => [m, { pass: 0, n: 0 }]))
const usageSum = { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 }
let apiCalls = 0

// ── ① 批命 aiAnalysis：①回归（身强七杀）②身弱财官旺 ③女命 ──
const analysisCases = [
  { label: '回归·身强七杀格', input: { year: 1991, month: 4, day: 12, hour: 3, minute: 10, gender: 1 } },
  { label: '身弱财官旺·七杀格', input: { year: 1982, month: 7, day: 7, hour: 12, minute: 0, gender: 1 } },
  { label: '女命·身弱伤官格', input: { year: 1996, month: 1, day: 30, hour: 5, minute: 0, gender: 0 } }
]
for (let i = 0; i < analysisCases.length; i++) {
  const { label, input } = analysisCases[i]
  const chart = paipan(input)
  chart.analysis = { wangShuai: getWangShuai(chart), geJu: getGeJu(chart), isPaid: true }
  const a = generateAnalysis(chart)
  console.log(`\n① [aiAnalysis #${i + 1} ${label}] 调用 generateAIAnalysis…`)
  const ai = await generateAIAnalysis(chart)
  apiCalls++
  let ok = false
  if (!ai) {
    console.log('  ✗ AI 返回 null（API 失败），该用例不通过')
  } else {
    if (ai._usage) Object.keys(usageSum).forEach(k => { usageSum[k] += ai._usage[k] || 0 })
    // 事实集严格对齐 prompt：四柱＋【大运】九步＋三年流年＋当年流月
    const facts = new Set([
      chart.pillars.year.ganZhi, chart.pillars.month.ganZhi,
      chart.pillars.day.ganZhi, chart.pillars.hour.ganZhi,
      ...chart.daYun.map(d => d.ganZhi),
      ...a.luckCycles.liuNian.map(y => y.ganZhi),
      ...a.luckCycles.liuYue.map(m => m.ganZhi)
    ])
    ok = runChecks(`aiAnalysis #${i + 1} ${label}`, ai, facts, { dayunSection: 'daYunAnalysis' })
  }
  tally.aiAnalysis.n++
  if (ok) tally.aiAnalysis.pass++
}

// ── ② 合婚 aiHemun：①原测试对 ②年日双冲·多忌 ③天合地合·多吉 ──
const hemunCases = [
  {
    label: '回归·原测试对',
    male: { year: 1990, month: 5, day: 8, hour: 16, minute: 30, gender: 1 },
    female: { year: 1992, month: 8, day: 15, hour: 9, minute: 0, gender: 0 }
  },
  {
    label: '多忌·年日双重子午冲',
    male: { year: 1979, month: 1, day: 21, hour: 12, minute: 59, gender: 1 },
    female: { year: 1984, month: 5, day: 24, hour: 21, minute: 20, gender: 0 }
  },
  {
    label: '多吉·天合地合',
    male: { year: 1986, month: 9, day: 12, hour: 2, minute: 0, gender: 1 },
    female: { year: 1989, month: 4, day: 4, hour: 14, minute: 0, gender: 0 }
  }
]
for (let i = 0; i < hemunCases.length; i++) {
  const { label, male: mi, female: fi } = hemunCases[i]
  const m = paipan(mi)
  const f = paipan(fi)
  m.analysis = { wangShuai: getWangShuai(m), geJu: getGeJu(m), isPaid: true }
  f.analysis = { wangShuai: getWangShuai(f), geJu: getGeJu(f), isPaid: true }
  const r = hehun(m, f)
  console.log(`\n② [aiHemun #${i + 1} ${label}] 调用 generateAIHemun…（规则总观感：${r.overall}）`)
  const ai = await generateAIHemun(m, f, r)
  apiCalls++
  let ok = false
  if (!ai) {
    console.log('  ✗ AI 返回 null（API 失败），该用例不通过')
  } else {
    if (ai._usage) Object.keys(usageSum).forEach(k => { usageSum[k] += ai._usage[k] || 0 })
    // 事实集对齐 prompt：双方四柱＋「当前大运」干支（prompt 未给其余大运）
    const curYear = new Date().getFullYear()
    const curGz = (c) => c.daYun.find(d => curYear >= d.startYear && curYear <= d.endYear)?.ganZhi
    const facts = new Set([
      m.pillars.year.ganZhi, m.pillars.month.ganZhi, m.pillars.day.ganZhi, m.pillars.hour.ganZhi,
      f.pillars.year.ganZhi, f.pillars.month.ganZhi, f.pillars.day.ganZhi, f.pillars.hour.ganZhi,
      curGz(m), curGz(f)
    ])
    ok = runChecks(`aiHemun #${i + 1} ${label}`, ai, facts, { needBasis: true, strictBi: true })
  }
  tally.aiHemun.n++
  if (ok) tally.aiHemun.pass++
}

// ── ③ 地理 aiGeo：①广州（回归）②内陆中心西安 ③边陲乌鲁木齐；日主旺衰各异走不同分支 ──
const geoCases = [
  { label: '回归·广州·壬水身强', dayMaster: '壬', wangShuai: '身强', birthplace: { name: '广州', lat: 23.13, lng: 113.26 } },
  { label: '内陆·西安·甲木身弱', dayMaster: '甲', wangShuai: '身弱', birthplace: { name: '西安', lat: 34.27, lng: 108.95 } },
  { label: '边陲·乌鲁木齐·丙火身强', dayMaster: '丙', wangShuai: '身强', birthplace: { name: '乌鲁木齐', lat: 43.83, lng: 87.62 } }
]
for (let i = 0; i < geoCases.length; i++) {
  const c = geoCases[i]
  const geo = analyzeGeo(c)
  console.log(`\n③ [aiGeo #${i + 1} ${c.label}] 调用 generateAIGeo…`)
  const ai = await generateAIGeo(geo)
  apiCalls++
  let ok = false
  if (!ai) {
    console.log('  ✗ AI 返回 null（API 失败），该用例不通过')
  } else {
    if (ai._usage) Object.keys(usageSum).forEach(k => { usageSum[k] += ai._usage[k] || 0 })
    // prompt 未给干支事实，地理文不应出现干支
    ok = runChecks(`aiGeo #${i + 1} ${c.label}`, ai, new Set(), { needBasis: true })
  }
  tally.aiGeo.n++
  if (ok) tally.aiGeo.pass++
}

// ── ④ 紫微 aiZiwei：①回归 ②身弱型 ③女命 ──
const ziweiCases = [
  { label: '回归·身强男命', input: { year: 1991, month: 4, day: 12, hour: 3, minute: 10, gender: 1 } },
  { label: '身弱型·辛金身弱', input: { year: 1982, month: 7, day: 7, hour: 12, minute: 0, gender: 1 } },
  { label: '女命·身弱伤官', input: { year: 1996, month: 1, day: 30, hour: 5, minute: 0, gender: 0 } }
]
for (let i = 0; i < ziweiCases.length; i++) {
  const { label, input } = ziweiCases[i]
  const chart = paipanZiwei(input)
  const a = analyzeZiwei(chart, now)
  console.log(`\n④ [aiZiwei #${i + 1} ${label}] 调用 generateAIZiwei…`)
  const ai = await generateAIZiwei(chart, a)
  apiCalls++
  let ok = false
  if (!ai) {
    console.log('  ✗ AI 返回 null（API 失败），该用例不通过')
  } else {
    if (ai._usage) Object.keys(usageSum).forEach(k => { usageSum[k] += ai._usage[k] || 0 })
    // 事实集对齐 prompt：palaceBlock 实际给干支的 7 个关键宫＋大限/流年/小限
    const facts = new Set([
      ...chart.palaces.filter(p => ZW_KEY7.has(p.name)).map(p => p.ganZhi),
      a.decadal.ganZhi, a.yearly.ganZhi, a.xiaoxian.ganZhi
    ])
    ok = runChecks(`aiZiwei #${i + 1} ${label}`, ai, facts, {})
  }
  tally.aiZiwei.n++
  if (ok) tally.aiZiwei.pass++
}

// ---------- 抽样汇总 ----------
const totalPass = modules.reduce((s, m) => s + tally[m].pass, 0)
const totalN = modules.reduce((s, m) => s + tally[m].n, 0)
console.log('\n========================================')
console.log(`AI 合规抽验（4 模块 × 3 用例 = ${apiCalls} 次调用）`)
for (const m of modules) {
  const { pass, n } = tally[m]
  console.log(`  ${m.padEnd(12)} ${pass}/${n} ${pass === n ? '✓' : '✗（见上）'}`)
}
const verdict = totalPass === totalN
  ? `AI_COMPLIANCE_PASS（${totalPass}/${totalN}）`
  : totalPass === 0
    ? `AI_COMPLIANCE_FAIL（0/${totalN}）`
    : `AI_COMPLIANCE_PARTIAL（${totalPass}/${totalN}）`
console.log(verdict)
console.log('※ 本结果为单次抽样；AI 输出具非确定性，不构成稳定保证')
console.log(`※ token 用量合计：输入 ${usageSum.prompt_tokens} ＋ 输出 ${usageSum.completion_tokens} ＝ ${usageSum.total_tokens}`)
process.exit(totalPass === totalN ? 0 : 1)
