// 公开示例命书生成脚本（HANDOFF-万字补全与文案返修 §3.1）
// ★ 真实调用 AI 一次 → 裁剪为「前约 30%」→ 存静态 JSON（src/data/demo-fatebook.json）
// ★ 可重跑，但不纳入 verify（调 AI：慢 + 花钱 + 非确定性）
// ★ 顺带打印完整报告的逐板块字数（兼作「万字补全」实测证据，§1.3-②）
// 用法：npm run build:demo   （需 .env.local 配置 AI_API_KEY）
process.loadEnvFile(new URL('../.env.local', import.meta.url))
if (!process.env.AI_API_KEY) {
  console.log('AI_API_KEY 未配置，无法生成示例命书（.env.local）')
  process.exit(2)
}

const { writeFileSync } = await import('node:fs')
const { paipan, getWangShuai, getGeJu } = await import('../src/lib/paipan.ts')
const { generateAnalysis, buildLuckCycles } = await import('../src/lib/analysis.ts')
const { generateAIAnalysis, SECTION_SPECS } = await import('../src/lib/aiAnalysis.ts')
const { searchSimilarCases } = await import('../src/lib/caseSearch.ts')
const { DEMO_BIRTH, DEMO_FULL_SECTIONS, buildDemoFatebook } = await import('../src/lib/demoFatebook.ts')

// ── 排盘（虚构出生资料，真太阳时校正走生产同一调用链）──
const chart = paipan({
  year: DEMO_BIRTH.year, month: DEMO_BIRTH.month, day: DEMO_BIRTH.day,
  hour: DEMO_BIRTH.hour, minute: DEMO_BIRTH.minute, gender: DEMO_BIRTH.gender,
  birthLng: DEMO_BIRTH.lng, birthZone: DEMO_BIRTH.zone
})
const analyzable = Object.assign(chart, {
  analysis: { wangShuai: getWangShuai(chart), geJu: getGeJu(chart), isPaid: false }
})

const pillarStr = ['year', 'month', 'day', 'hour'].map(k => chart.pillars[k].ganZhi).join(' ')
console.log(`示例四柱：${pillarStr}（${DEMO_BIRTH.year}-${DEMO_BIRTH.month}-${DEMO_BIRTH.day} ${DEMO_BIRTH.hour}:${DEMO_BIRTH.minute} ${DEMO_BIRTH.place}）`)
console.log(`旺衰：${analyzable.analysis.wangShuai}　格局：${analyzable.analysis.geJu}`)

// ★ 红线：示例八字不得等于用户八字（§3.3）
if (pillarStr === '辛未 壬辰 壬子 壬寅') {
  console.error('✗ 示例八字撞上用户八字，中止（不得使用用户八字）')
  process.exit(1)
}

// ── 规则引擎（结构化岁运）＋ 真实 AI（十板块）＋ 命例检索 ──
const rulePaid = generateAnalysis(analyzable)
console.log('\n调用 AI 生成十板块（最长约 2 分钟）……')
const aiPaid = await generateAIAnalysis(analyzable)
if (!aiPaid) {
  console.error('✗ AI 生成失败（未通过校验或 API 异常），请重跑')
  process.exit(1)
}
const similarCases = searchSimilarCases(analyzable)

// ── 实测：逐板块打印字数（§1.3-② 实测证据）──
const clen = (s) => [...s].length
let sectionsTotal = 0
console.log('\n—— 实测：完整报告逐板块字数 ——')
for (const spec of SECTION_SPECS) {
  const n = clen(aiPaid[spec.key])
  sectionsTotal += n
  const range = spec.requirement.match(/(\d+)-(\d+)字/)
  console.log(`  ${spec.key.padEnd(14)} 实际 ${n} 字（要求 ${range ? range[0] : '?'}）`)
}
// ★ 门槛①：示例前 3 板块为「完整展示」，必须达到各自要求下限——
//   否则写入的 JSON 过不了验收断言②（AI 输出非确定性，不达标请直接重跑本脚本）
let shortFail = 0
for (const key of DEMO_FULL_SECTIONS) {
  const spec = SECTION_SPECS.find(s => s.key === key)
  const min = Number(spec.requirement.match(/(\d+)-(\d+)字/)[1])
  const n = clen(aiPaid[key])
  if (n < min) { shortFail++; console.error(`✗ 完整展示板块 ${key} 实际 ${n} 字 < 下限 ${min}，本脚本需重跑`) }
}
if (shortFail) process.exit(1)

// 字数口径：板块按正文全字符计；luckCycles 结构含大量英文字段名与语法符号，
// 按 CJK 汉字计（与交接书「luckCycles 约 3583 字」的正文口径对齐）；
// 命例按【页面实际渲染形态】计——readings 多于一条时页面逐条渲染 readings，否则渲染代表断语。
const cjk = (s) => (s.match(/[一-鿿]/g) || []).length
const luckLen = cjk(JSON.stringify(rulePaid.luckCycles))
const caseLen = similarCases.reduce((s, c) =>
  s + (c.readings && c.readings.length > 1
    ? c.readings.reduce((t, r) => t + clen(r.text), 0)
    : clen(c.text)), 0)
const grandTotal = sectionsTotal + luckLen + caseLen
console.log(`  ────────────────────────────`)
console.log(`  十板块合计 ${sectionsTotal} 字 · luckCycles ${luckLen} 汉字（CJK 口径）· similarCases ${caseLen}`)
console.log(`  ★ 总计 ${grandTotal} 字 —— ${grandTotal >= 10000 ? '≥ 10000 ✓ 万字达成' : '✗ < 10000，未达成，勿收工，回报讨论'}`)
if (aiPaid._usage) console.log(`  token：prompt=${aiPaid._usage.prompt_tokens} completion=${aiPaid._usage.completion_tokens} total=${aiPaid._usage.total_tokens}`)

// ── 裁剪为「前约 30%」并写入静态 JSON ──
const demo = buildDemoFatebook({
  chart: analyzable,
  sections: aiPaid,
  luckCycles: buildLuckCycles(analyzable),
  similarCases,
  generatedAt: new Date().toISOString(),
  sectionMeta: SECTION_SPECS.map(s => ({ key: s.key, name: s.name }))
})
const outPath = new URL('../src/data/demo-fatebook.json', import.meta.url)
writeFileSync(outPath, JSON.stringify(demo, null, 2) + '\n', 'utf8')
const demoLen = Object.values(demo.sections).reduce((s, t) => s + clen(t), 0) +
  clen(JSON.stringify(demo.luckCycles)) +
  demo.similarCases.reduce((s, c) => s + clen(c.text), 0)
console.log(`\n✓ 已写入 src/data/demo-fatebook.json（展示约 ${demoLen} 字，占完整报告 ${Math.round(demoLen / grandTotal * 100)}%）`)
console.log('  前 3 板块完整：overview / personality / yongShen；后 7 板块摘要（≤200 字）；大运前 2 步 + 当年流年；命例 1 条')
