#!/usr/bin/env node
/**
 * 打包命例库 → src/data/mingli-cases.json
 * 供前端运行时检索（无需数据库）
 */
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const SRC_CASES_DIR = 'C:/Users/Administrator/.trae-cn/skills/bazi-mingli/references/cases'
const OUT_JSON = path.resolve(__dirname, '../src/data/mingli-cases.json')

const GAN = '甲乙丙丁戊己庚辛壬癸'
const ZHI = '子丑寅卯辰巳午未申酉戌亥'
const validGZ = (s) => typeof s === 'string' && s.length === 2 && GAN.includes(s[0]) && ZHI.includes(s[1])

function normalizeSource(source) {
  if (!source) return ''
  if (typeof source === 'string') return source
  const parts = []
  if (source['书']) parts.push(source['书'])
  if (source['卷']) parts.push(source['卷'])
  if (source['法门']) parts.push(source['法门'])
  return parts.join(' · ')
}

function extractCase(r) {
  // ① 记录级：非命例直接剔除（无论历法是否通过）
  if (r['非命例'] === true) return null
  const p = r['四柱']
  if (!p) return null
  if (!validGZ(p['年']) || !validGZ(p['月']) || !validGZ(p['日']) || !validGZ(p['时'])) return null
  if (r['可用'] === false) return null
  let person = r['人物'] || null
  const text = (r['断语'] || r['应验'] || r['原文'] || '').trim()
  if (!text) return null
  const source = normalizeSource(r['来源'])
  if (SKIP_BOOKS.some((b) => source.includes(b))) return null

  // ⑤ 文本质量门槛（P1-1）
  const isSanmingTable = source.includes('三命通会')
  if (/^[，。、；：]/.test(text)) return null                       // 以标点开头 = 截断残片
  if (TRUNC_END.test(text) && text.length < 12) return null        // 明显截断尾
  if (!isSanmingTable && text.length < 6) return null              // 长度下限（三命通会命例表豁免）
  if (isSanmingTable && /^[甲乙丙丁戊己庚辛壬癸][子丑寅卯辰巳午未申酉戌亥]\s*[甲乙丙丁戊己庚辛壬癸][子丑寅卯辰巳午未申酉戌亥]$/.test(text)) return null // 纯干支无断语

  // ⑥ person 噪声过滤（P1-2）
  if (person) {
    person = person.trim()
    if (KNOWN_NOISE.has(person) || NOT_A_NAME.test(person) || BAD_PATTERN.test(person) || BAD_PATTERN2.test(person) || person.length > 4) {
      person = null
    }
  }

  return {
    id: r['id'] || null,
    year: p['年'],
    month: p['月'],
    day: p['日'],
    hour: p['时'],
    dayMaster: r['日主'] || p['日'][0],
    person,
    text,
    source,
    ...(r['salvaged'] ? { salvaged: true, salvagedReason: r['抢救原因'] || null } : {})
  }
}

// ② 文件级黑名单：这些文件不得进入用户库（聚合文件=其他文件并集会重复+污染；
//    noncases 已标废；prime 是交付物本身，保留在库里供别的用途但不读入）
const SKIP_FILES = new Set([
  'cases-web-wxw-noncases.jsonl', // 已标废：纳音规则陈述，非命例
  'cases-all.jsonl',              // 聚合文件
  'cases-web-all.jsonl',          // 聚合文件
  'cases-prime.jsonl',            // 聚合精选（交付物）
  'cases-web-gist.jsonl',         // 已被 cases-web-gist-v2.jsonl 取代
])

// ③ 打包白名单：只从 index.json 中的 A/B 级原子文件构建
const idx = JSON.parse(fs.readFileSync(path.join(SRC_CASES_DIR, 'index.json'), 'utf8'))
const gradeOf = Object.fromEntries(idx['明细'].map((d) => [d['文件'], d['质量等级'] || 'C']))
const ALLOW = new Set(
  idx['明细'].filter((d) => ['A', 'B'].includes(d['质量等级'])).map((d) => d['文件'])
)

// ④ 来源书级黑名单：《五行精纪》内容为纳音规则罗列（非命例），REVIEW 已整书标废；
//    但 A 级文件（cases-wxl-llm / cases-web-gist-v2）重提取时混入了个别记录，按来源书名兜底剔除
const SKIP_BOOKS = ['五行精纪']

// ⑤ P1-1 文本质量门槛：剔除截断/残缺；但《三命通会》命例表本就极简（"戊子通判辛酉"式），
//    属源数据形态而非残缺，故长度门槛对其豁免，只剔"以标点开头"的明确截断残片
const TRUNC_END = /(之命。|于大学士。)$/  // 明显截断尾

// ⑥ P1-2 person 噪声过滤：功名词、语气词开头、跨句拼接碎片不得当人名；宁可不显示，也不显示错的
// 已知个案噪声（直接黑名单），见回传审核
const KNOWN_NOISE = new Set(['陆商阎','相文敏','状元尚书','盖庚丁两'])
const NOT_A_NAME = /^(孝廉|茂才|进士|举人|解元|状元|贡士|生员|秀才|明经|及第|女命|尚书|知府|侍郎)$/
const BAD_PATTERN = /^(盖|如|若|夫|且|然|故|此|其|凡|按|又|或|一|二|三|上|下|中|为|与|于|乃|即|则|而|以|之|也|者)/
const BAD_PATTERN2 = /(两|三|四|透|藏|通|根)$/   // "盖庚丁两"式截断碎片

// ⑦ P2-4 五行精纪抢救：2 条确证真命例已独立成档 cases-salvaged.jsonl 并被 index.json 收录，
//    按普通文件读取，此处不再硬编码（§5.6 数据与代码分离）
//    （原硬编码已删，见 docs/交接记录/04-修复相似命例数据污染/ 回传记录）

// 去重取优：质量等级第一优先（A>B>C），同级再比有无人物，最后才比文本长度
// 按四柱聚合：多流派断语保留为 readings（§五.5 去重原则，不得去重成一条）
const gradeRank = { A: 3, B: 2, C: 1 }
const groups = new Map() // key → { year, month, day, hour, dayMaster, readings: [{text, source, person}], _grade }
let total = 0

function addToGroup(c) {
  total++
  const key = c.year + c.month + c.day + c.hour
  const g = groups.get(key)
  if (!g) {
    groups.set(key, {
      id: c.id,
      year: c.year, month: c.month, day: c.day, hour: c.hour,
      dayMaster: c.dayMaster,
      readings: [{ text: c.text, source: c.source, person: c.person }],
      _grade: c._grade,
      ...(c.salvaged ? { salvaged: true, salvagedReason: c.salvagedReason } : {})
    })
    return
  }
  // 抢救标记随任一同组记录带上即保留
  if (c.salvaged && !g.salvaged) { g.salvaged = true; g.salvagedReason = c.salvagedReason }
  // 同书同人同文视为重复，不重复入 readings
  const dup = g.readings.some((rd) => rd.text === c.text && rd.source === c.source)
  if (!dup) {
    g.readings.push({ text: c.text, source: c.source, person: c.person })
    // 保留等级最高的来源用于整体展示排序
    if ((gradeRank[c._grade] || 0) > (gradeRank[g._grade] || 0)) {
      g._grade = c._grade
    }
  }
  // 人名取优：现组无人名而新记录有，则以新记录人名补第一条
  if (!g.readings[0].person && c.person) g.readings[0].person = c.person
}

for (const f of fs.readdirSync(SRC_CASES_DIR).filter((f) => f.endsWith('.jsonl'))) {
  if (SKIP_FILES.has(f)) continue          // 文件级黑名单
  if (!ALLOW.has(f)) continue              // 白名单：仅 A/B 级原子文件
  const grade = gradeOf[f] || 'C'
  const fp = path.join(SRC_CASES_DIR, f)
  for (const line of fs.readFileSync(fp, 'utf8').split(/\r?\n/)) {
    if (!line.trim()) continue
    let r
    try {
      r = JSON.parse(line)
    } catch {
      continue
    }
    const c = extractCase(r)
    if (!c) continue
    c._grade = grade
    addToGroup(c)
  }
}

// 抢救条目已随 cases-salvaged.jsonl 走普通文件读取（B 级白名单内），无需额外注入

// readings 内部排序：有具名优先、同书去重后按文本长度降序；代表字段取首条
const records = Array.from(groups.values()).map((g) => {
  g.readings.sort((a, b) => {
    const ap = a.person ? 1 : 0
    const bp = b.person ? 1 : 0
    if (bp !== ap) return bp - ap
    return b.text.length - a.text.length
  })
  const head = g.readings[0]
  return {
    id: g.id,
    year: g.year, month: g.month, day: g.day, hour: g.hour,
    dayMaster: g.dayMaster,
    person: head.person,
    text: head.text,      // 代表断语 = 最优一条，向后兼容旧字段
    source: head.source,  // 代表来源
    readings: g.readings, // 多流派全部断语
    ...(g.salvaged ? { salvaged: true, salvagedReason: g.salvagedReason } : {})
  }
})
const named = records.filter((c) => c.person).length
const unnamed = records.length - named
const multi = records.filter((c) => c.readings.length > 1).length

console.log(`原始可用记录: ${total}`)
console.log(`聚合后: ${records.length}（具名 ${named}，无名 ${unnamed}；多流派断语 ${multi} 条命盘）`)

fs.mkdirSync(path.dirname(OUT_JSON), { recursive: true })
fs.writeFileSync(OUT_JSON, JSON.stringify(records), 'utf8')
console.log(`已写入 ${OUT_JSON}`)
