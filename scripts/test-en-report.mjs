// 英文报告管线验收（2026-11-03）
//
// 断的是什么：
//   ① 英文规则版十卷正文零中日韩文字（正则 [\u4e00-\u9fff] 命中 0）
//   ② 零 CJK 校验器有牙口：故意注入一句中文必须被判违规
//   ③ 英文固定免责语三要素（仅供参考 / 非确定性 / 不构成建议）
//   ④ 六个 AI 模块均已接 CJK 校验与英文重试提示
//   ⑤ 英文禁词表覆盖 will definitely / guaranteed / destined / must 等

import { readFileSync } from 'node:fs'
import { join } from 'node:path'

let allPass = true
const fail = (m) => { allPass = false; console.log('  ✗ ' + m) }
const ok = (m) => console.log('  · ' + m)
const assert = (cond, m) => (cond ? ok(m) : fail(m))

const root = new URL('..', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1')
const read = (p) => readFileSync(join(root, p), 'utf8')

const { paipan, getWangShuai, getGeJu } = await import('../src/lib/paipan.ts')
const { buildEnPaidAnalysis } = await import('../src/lib/enAnalysis.ts')
const { containsCJK, findCJK, EN_REPORT_DISCLAIMER, FORBIDDEN_WORDS_EN } = await import('../src/lib/ai-check.ts')
const { EN_OUTPUT_DIRECTIVE } = await import('../src/lib/locale.ts')
const { makeAnalysisComplianceValidator } = await import('../src/lib/aiAnalysis.ts')
const { makeAskComplianceValidator } = await import('../src/lib/aiAsk.ts')
const { buildLuckCycles } = await import('../src/lib/analysis.ts')

const chart = paipan({ year: 1990, month: 5, day: 8, hour: 14, minute: 30, gender: 1 })
const wangShuai = getWangShuai(chart)
const geJu = getGeJu(chart)
const analyzable = Object.assign(chart, { analysis: { wangShuai, geJu, isPaid: false } })

// ---------- ① 英文规则版十卷 ----------
console.log('—— ① 英文规则版十卷零 CJK ——')
{
  const paid = buildEnPaidAnalysis(analyzable)
  const keys = ['overview', 'personality', 'yongShen', 'geJuAnalysis', 'tiaoHou', 'daYunAnalysis', 'career', 'marriage', 'children', 'health']
  const text = keys.map((k) => paid[k]).join('\n')
  assert(keys.every((k) => typeof paid[k] === 'string' && paid[k].length > 0), '十卷均有正文')
  const cjk = findCJK(text)
  assert(cjk.length === 0, `正文零 CJK（若命中：${cjk.slice(0, 10).join('、')}）`)
  assert(containsCJK(text) === false, 'containsCJK 对英文正文返回 false')
  assert(paid.overview.includes('for reference only') && paid.overview.includes('non-deterministic'), 'overview 含英文免责三要素')
  assert(EN_REPORT_DISCLAIMER.split(' ').length > 5, '英文免责语为完整英文句，不是空串')
}

// ---------- ② 牙口：注入中文必须翻红 ----------
console.log('—— ② 零 CJK 校验器牙口自检 ——')
{
  const paid = buildEnPaidAnalysis(analyzable)
  // 中文事实集：与 aiAnalysis 生成时同口径（四柱/胎元/命宫/大运/三年流年/流月）
  const luckNow = buildLuckCycles(analyzable, new Date())
  const facts = new Set([
    analyzable.pillars.year.ganZhi, analyzable.pillars.month.ganZhi,
    analyzable.pillars.day.ganZhi, analyzable.pillars.hour.ganZhi,
    analyzable.taiYuan, analyzable.mingGong,
    ...analyzable.daYun.map((d) => d.ganZhi),
    ...luckNow.liuNian.map((y) => y.ganZhi),
    ...luckNow.liuYue.map((m) => m.ganZhi),
  ])
  const validateEn = makeAnalysisComplianceValidator(facts, true)
  assert(validateEn(paid) === null, '合规英文十卷被放行')
  const injected = { ...paid, overview: paid.overview + ' 这一句是中文。' }
  const reason = validateEn(injected)
  assert(!!reason && reason.includes('检出中文字符'), '注入一句中文后被判违规（零 CJK 断言有牙口）')
  assert(findCJK('这是中文').length > 0, 'findCJK 对中文样本命中')
  assert(findCJK('Jia Zi, Wood over Water').length === 0, 'findCJK 对拼音/英文不误报')

  const askValidate = makeAskComplianceValidator(new Set(), true)
  assert(askValidate('The chart tends to favour steady progress.') === null, '英文追问被放行')
  assert(askValidate('The chart tends to favour steady progress. 仅供参考') !== null, '含中文的英文追问被判违规')
}

// ---------- ③ 六模块接线 ----------
console.log('—— ③ 六个 AI 模块零 CJK 接线 ——')
{
  const modules = ['aiAnalysis', 'aiAsk', 'aiHemun', 'aiZiwei', 'aiGeo', 'aiLiunian']
  for (const m of modules) {
    const src = read(`src/lib/${m}.ts`)
    assert(src.includes('containsCJK') && src.includes('findCJK'), `${m} 已接 containsCJK/findCJK`)
    assert(src.includes('complianceRetryHintEn'), `${m} 英文重试提示为英文（不把中文回灌）`)
  }
  assert(read('src/proxy.ts').includes('x-vercel-ip-country'), '根路径仍读 Vercel 国家头')
}

// ---------- ④ 英文禁词与指令 ----------
console.log('—— ④ 英文禁词 / 输出指令 ——')
{
  const need = ['guaranteed', 'destined', 'definitely', 'must ', 'will definitely', 'bound to']
  for (const w of need) assert(FORBIDDEN_WORDS_EN.includes(w), `英文禁词表包含 ${w}`)
  assert(/ZERO Chinese|zero CJK|CJK/i.test(EN_OUTPUT_DIRECTIVE), '英文输出指令明写零 CJK')
  assert(EN_OUTPUT_DIRECTIVE.includes('for reference only'), '英文输出指令含免责句')
  const ai = read('src/lib/aiAnalysis.ts')
  assert(ai.includes('SECTION_SPECS_EN') && ai.includes('buildUserPromptEn'), '命书 prompt 有英文分支与英文事实 prompt')
  assert(ai.includes('SYSTEM_PROMPT_EN'), '命书英文 system prompt 独立存在')
}

console.log('—— ⑤ 英文紫微规则版（免费试读前两模块）零 CJK ——')
{
  const { paipanZiwei, analyzeZiwei } = await import('../src/lib/ziwei.ts')
  const { englishRuleZiweiText } = await import('../src/lib/aiZiwei.ts')
  const zwChart = paipanZiwei({ year: 1990, month: 6, day: 15, hour: 10, minute: 30, gender: 1 })
  const zwAnalysis = analyzeZiwei(zwChart, new Date('2026-11-09T12:00:00+08:00'))
  const rule = englishRuleZiweiText(zwChart, zwAnalysis)
  const freeKeys = ['overview', 'personality']
  assert(freeKeys.every((k) => typeof rule[k] === 'string' && rule[k].trim().length > 80), '免费试读两卷均有实质正文')
  const cjk = findCJK(freeKeys.map((k) => rule[k]).join('\n'))
  assert(cjk.length === 0, `英文紫微规则版零 CJK（若命中：${cjk.slice(0, 10).join('、')}）`)
  assert(rule.overview.includes('Life Palace') && rule.overview.includes('for reference only'), 'overview 用英文术语并含免责句')
  assert(rule.personality.includes('Fortune Palace'), 'personality 覆盖福德宫')
  const route = read('src/app/api/ziwei/route.ts')
  assert(route.includes('englishRuleZiweiText') && /locale === 'en' \? englishRuleZiweiText/.test(route), '紫微接口在 en 时走英文规则版，不回退中文兜底')
}

console.log('\n' + (allPass ? 'EN_REPORT_PASS' : 'EN_REPORT_FAIL'))
process.exit(allPass ? 0 : 1)
