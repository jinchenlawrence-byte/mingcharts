/**
 * BaziQA Contest8 外部准确率基准 —— 共享库（纯 JS；通过 tsx 导入 src/lib/*.ts）
 *
 * 性质：外部评估（HANDOFF-21），不是产品功能。只【读】产品引擎，不改任何既有判定逻辑。
 * 消费方：
 *   scripts/baziqa-paipan.mjs   排盘 → eval/baziqa/paipan-results.json
 *   scripts/baziqa-eval.mjs     A/B 两组 AI 评测 → eval/baziqa/results/
 *   scripts/baziqa-report.mjs   汇总报告 → eval/baziqa/report.md
 *   scripts/test-baziqa-bench.mjs  断言（纳入 verify）
 */
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { Solar, LunarUtil } from 'lunar-javascript'
import { paipan, getWangShuai, getGeJu, shiShenOf } from '../src/lib/paipan.ts'
import { buildLuckCycles, getFavorSets, tiaoHouWuxing } from '../src/lib/analysis.ts'
import { getUtcOffsetHours } from '../src/lib/solarTime.ts'
import { LIU_CHONG, LIU_HE, LIU_HAI, XIANG_XING } from '../src/lib/branchRelations.ts'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
export const EVAL_DIR = join(ROOT, 'eval', 'baziqa')
export const UPSTREAM_DIR = join(EVAL_DIR, 'upstream')

// ─────────────────────────────────────────────────────────────
// 一、place → { zone, lng } 映射表（手工核准，逐字面覆盖；无 fallback，未知名单者直接抛错）
//   任务书 §4.2：必须按 place 逐一设，不许猜；粗粒度地名须显式声明处理方式。
// ─────────────────────────────────────────────────────────────
export const PLACE_MAP = {
  '中国大陆': { zone: 'Asia/Shanghai', lng: 120.0, label: '中国大陆（未指明城市）', coarse: true, note: '粗粒度地名：按 UTC+8 标准经线（120°E）处理，不作城市级经度修正' },
  '中国': { zone: 'Asia/Shanghai', lng: 120.0, label: '中国（未指明城市）', coarse: true, note: '粗粒度地名：按 UTC+8 标准经线（120°E）处理，不作城市级经度修正' },
  '广东，中国': { zone: 'Asia/Shanghai', lng: 113.27, label: '广东（取广州）', coarse: false, note: '省级地名取省会经度' },
  '广东潮汕': { zone: 'Asia/Shanghai', lng: 116.68, label: '广东潮汕（取汕头）', coarse: false, note: '潮汕地区取汕头经度' },
  '广东潮汕，中国': { zone: 'Asia/Shanghai', lng: 116.68, label: '广东潮汕（取汕头）', coarse: false, note: '潮汕地区取汕头经度' },
  '北京，中国': { zone: 'Asia/Shanghai', lng: 116.41, label: '北京', coarse: false, note: '' },
  '香港': { zone: 'Asia/Hong_Kong', lng: 114.17, label: '香港', coarse: false, note: '' },
  '香港，中国': { zone: 'Asia/Hong_Kong', lng: 114.17, label: '香港', coarse: false, note: '' },
  '中国香港': { zone: 'Asia/Hong_Kong', lng: 114.17, label: '香港', coarse: false, note: '' },
  '台湾': { zone: 'Asia/Taipei', lng: 121.56, label: '台湾（取台北）', coarse: false, note: '省级地名取台北经度' },
  '台湾，中国': { zone: 'Asia/Taipei', lng: 121.56, label: '台湾（取台北）', coarse: false, note: '省级地名取台北经度' },
  '中国台湾': { zone: 'Asia/Taipei', lng: 121.56, label: '台湾（取台北）', coarse: false, note: '省级地名取台北经度' },
  '新加坡': { zone: 'Asia/Singapore', lng: 103.82, label: '新加坡', coarse: false, note: '' },
  '马来西亚': { zone: 'Asia/Kuala_Lumpur', lng: 101.69, label: '马来西亚（取吉隆坡）', coarse: false, note: '国家级地名取首都经度；1982-01-01 前当地钟表时间为 UTC+7:30，tzdata 历史偏移自动处理' },
  '日本宫崎县': { zone: 'Asia/Tokyo', lng: 131.42, label: '日本宫崎县（取宫崎市）', coarse: false, note: 'UTC+9，无夏令时' },
  // 粗粒度「美国」：取美东为代表（1974-04-28 出生恰逢美国 1974 全年夏令时时期，EDT=UTC−4，
  // tzdata 自动处理）；另在排盘脚本中附美西（America/Los_Angeles）敏感性核验。
  '美国': { zone: 'America/New_York', lng: -74.01, label: '美国（粗粒度，取美东/纽约为代表）', coarse: true, note: '粗粒度地名：时区不可知，取美东为代表并附美西敏感性核验（见排盘结果 sensitivity 字段）' },
}

export function mappingFor(place) {
  const m = PLACE_MAP[place]
  if (!m) throw new Error(`[baziqa] 未核准的出生地「${place}」——映射表必须逐字面覆盖，禁止 fallback（任务书 §4.2/§五③）`)
  return m
}

// ─────────────────────────────────────────────────────────────
// 二、数据装载（第 0 项是元信息，不是命主——任务书 §2.2 实测要点）
// ─────────────────────────────────────────────────────────────
export function loadAllPersons() {
  const out = []
  for (const y of [2021, 2022, 2023, 2024, 2025]) {
    const raw = JSON.parse(readFileSync(join(UPSTREAM_DIR, `contest8_${y}.json`), 'utf8'))
    const meta = raw[0]
    if (meta.contest_id !== `contest8_${y}`) throw new Error(`[baziqa] ${y} 文件元信息错位：${meta.contest_id}`)
    for (const p of raw.slice(1)) {
      out.push({
        contestYear: Number(meta.current_year),
        person_id: p.person_id,
        name: p.name,
        gender: p.profile.gender,
        birth: p.profile.birth,
        questions: p.questions,
      })
    }
  }
  return out
}

// ─────────────────────────────────────────────────────────────
// 三、排盘（我们自己的 paipan 引擎；官方排盘结果未开源，任务书 §〇3）
// ─────────────────────────────────────────────────────────────
export function paipanPerson(p) {
  const m = mappingFor(p.birth.place)
  const gender = p.gender === 'male' ? 1 : 0
  const chart = paipan({
    year: p.birth.year, month: p.birth.month, day: p.birth.day,
    hour: p.birth.hour, minute: p.birth.minute,
    gender, birthZone: m.zone, birthLng: m.lng,
  })
  const wangShuai = getWangShuai(chart)
  const geJu = getGeJu(chart)
  const analyzable = { ...chart, analysis: { wangShuai, geJu, isPaid: false } }
  // 「现在」= 竞赛当年年中（6 月 15 日）：题目在当年提出，流年 current/大运 current 以此定位
  const luck = buildLuckCycles(analyzable, new Date(p.contestYear, 5, 15, 12, 0))
  return { chart, analyzable, luck }
}

// ─────────────────────────────────────────────────────────────
// 四、标准排盘文本生成器（贴近官方 dataset_and_input_format.md §4.2 范例）
//   · 与官方格式的差异在文末以【本盘缺字段说明】如实标注（任务书 §4.1 两条要求）
//   · 纳音/空亡/十二长生为六十甲子纯查表（LunarUtil，同一底层库），非新判定逻辑
//   · 神煞/胎息/精确起运日期/交运时间我们没有——如实缺，不编造
// ─────────────────────────────────────────────────────────────
const GAN_WUXING = { '甲': '木', '乙': '木', '丙': '火', '丁': '火', '戊': '土', '己': '土', '庚': '金', '辛': '金', '壬': '水', '癸': '水' }
const ZHI_WUXING = { '子': '水', '丑': '土', '寅': '木', '卯': '木', '辰': '土', '巳': '火', '午': '火', '未': '土', '申': '金', '酉': '金', '戌': '土', '亥': '水' }
const ZHI_ORDER = '子丑寅卯辰巳午未申酉戌亥'
const CHANG_SHENG_12 = ['长生', '沐浴', '冠带', '临官', '帝旺', '衰', '病', '死', '墓', '绝', '胎', '养']
const CHANG_SHENG_OFFSET = { '甲': 1, '丙': 10, '戊': 10, '庚': 7, '壬': 4, '乙': 6, '丁': 9, '己': 9, '辛': 0, '癸': 3 }
// 十二长生（日主对各支）：阳干顺行、阴干逆行；已用官方范例逐柱验证
// （1951-11-14 戊日主：卯沐浴/亥绝/午帝旺/巳临官，与官方排盘示例一致）
function changSheng12(dayGan, zhi) {
  const idx = ZHI_ORDER.indexOf(zhi)
  const off = CHANG_SHENG_OFFSET[dayGan]
  const isYang = '甲丙戊庚壬'.includes(dayGan)
  return CHANG_SHENG_12[isYang ? (idx + off) % 12 : (off - idx + 12) % 12]
}
// 月令旺相休囚死（官方示例同规则：亥月 → 水旺、木相、金休、土囚、火死）
function wangXiangXiuQiuSi(monthZhi) {
  const ling = ZHI_WUXING[monthZhi]
  const WO_SHENG = { '木': '火', '火': '土', '土': '金', '金': '水', '水': '木' }
  const SHENG_WO = { '木': '水', '火': '木', '土': '火', '金': '土', '水': '金' }
  const WO_KE = { '木': '土', '火': '金', '土': '水', '金': '木', '水': '火' }
  const KE_WO = { '木': '金', '火': '水', '土': '木', '金': '火', '水': '土' }
  return { [ling]: '旺', [WO_SHENG[ling]]: '相', [SHENG_WO[ling]]: '休', [KE_WO[ling]]: '囚', [WO_KE[ling]]: '死' }
}
const XING_ZUO_EDGE = [20, 19, 21, 20, 21, 22, 23, 23, 23, 24, 23, 22] // 各月起始日：水瓶1/20、双鱼2/19 …射手11/23、摩羯12/22
const XING_ZUO_BEGIN = ['水瓶', '双鱼', '白羊', '金牛', '双子', '巨蟹', '狮子', '处女', '天秤', '天蝎', '射手', '摩羯']
function xingZuoOf(month, day) {
  // day < 起始日 → 归上一个多月开始的星座；已用官方范例验证（1951-11-14 → 天蝎座）
  const idx = day < XING_ZUO_EDGE[month - 1] ? (month - 2 + 12) % 12 : month - 1
  return XING_ZUO_BEGIN[idx] + '座'
}
const JI_JIE = ['孟春', '仲春', '季春', '孟夏', '仲夏', '季夏', '孟秋', '仲秋', '季秋', '孟冬', '仲冬', '季冬']
const GAN_HE = { '甲': '己', '己': '甲', '乙': '庚', '庚': '乙', '丙': '辛', '辛': '丙', '丁': '壬', '壬': '丁', '戊': '癸', '癸': '戊' }

export function buildStandardText(p, chart) {
  const m = mappingFor(p.birth.place)
  const genderCn = p.gender === 'male' ? '男' : '女'
  const zao = p.gender === 'male' ? '乾造' : '坤造'
  const yuan = p.gender === 'male' ? '元男' : '元女'
  const pillars = chart.pillars
  const order = ['year', 'month', 'day', 'hour']

  // 真太阳时校正后的时刻（与 paipan 内部排盘所用时刻一致）
  const base = new Date(p.birth.year, p.birth.month - 1, p.birth.day, p.birth.hour, p.birth.minute, 0)
  const adj = chart.timezoneOffsetApplied ? new Date(base.getTime() + chart.timezoneOffsetApplied * 60000) : base
  const solar = Solar.fromYmdHms(adj.getFullYear(), adj.getMonth() + 1, adj.getDate(), adj.getHours(), adj.getMinutes(), 0)
  const lunar = solar.getLunar()
  const shiZhi = ZHI_ORDER[Math.floor(((adj.getHours() + 1) % 24) / 2)]

  // 五行统计与旺相休囚死
  const wxCount = { '木': 0, '火': 0, '土': 0, '金': 0, '水': 0 }
  for (const k of order) {
    wxCount[GAN_WUXING[pillars[k].gan]]++
    wxCount[ZHI_WUXING[pillars[k].zhi]]++
  }
  const wxMissing = Object.entries(wxCount).filter(([, n]) => n === 0).map(([w]) => w)
  const wxSeason = wangXiangXiuQiuSi(pillars.month.zhi)

  // 干支关系（复用产品 branchRelations 表）
  const ganRels = []
  const zhiRels = []
  const gans = order.map(k => pillars[k].gan)
  const zhis = order.map(k => pillars[k].zhi)
  for (let i = 0; i < 4; i++) for (let j = i + 1; j < 4; j++) {
    if (GAN_HE[gans[i]] === gans[j]) ganRels.push(`${gans[i]}${gans[j]}合`)
    const a = zhis[i], b = zhis[j]
    if (LIU_CHONG[a] === b) zhiRels.push(`${a}${b}相冲`)
    else if (LIU_HE[a] === b) zhiRels.push(`${a}${b}六合`)
    else if (XIANG_XING[a].includes(b)) zhiRels.push(`${a}${b}相刑`)
    else if (LIU_HAI[a] === b) zhiRels.push(`${a}${b}相害`)
  }

  // 节气信息（用同一 solar/lunar 对象；出生节气 = 校正后钟表时刻距上一节的纯墙钟时长，
  // 两侧都用 Date.UTC 构造（纯墙钟算术，不掺时区），避免本地/UTC 毫秒混用差 8 小时）
  const prevJieQ = lunar.getPrevJie()
  const nextJieQ = lunar.getNextJie()
  const prevJie = prevJieQ.getSolar()
  const nextJie = nextJieQ.getSolar()
  const adjWallMs = Date.UTC(adj.getFullYear(), adj.getMonth(), adj.getDate(), adj.getHours(), adj.getMinutes(), 0)
  const prevJieMs = Date.UTC(prevJie.getYear(), prevJie.getMonth() - 1, prevJie.getDay(), prevJie.getHour(), prevJie.getMinute(), prevJie.getSecond())
  const diffMin = Math.round((adjWallMs - prevJieMs) / 60000)
  const diffDays = Math.floor(diffMin / 1440)
  const diffH = Math.floor((diffMin % 1440) / 60)
  const diffM = diffMin % 60

  // 流年干支表（出生起 60 年；公历 7 月 1 日恒在立春后，年柱正确）
  const liuNianRows = []
  for (let r = 0; r < 6; r++) {
    const cells = []
    for (let i = 0; i < 10; i++) {
      const yy = p.birth.year + r * 10 + i
      const gz = Solar.fromYmdHms(yy, 7, 1, 12, 0, 0).getLunar().getEightChar().getYear()
      cells.push(`${yy}(${gz},${yy - p.birth.year + 1}岁)`)
    }
    liuNianRows.push('  ' + cells.join(' '))
  }
  // 重要流年提示（正财/偏财流年，十神为产品 SHI_SHEN 表纯查表）
  const zhengCai = []
  const pianCai = []
  for (let i = 0; i < 60; i++) {
    const yy = p.birth.year + i
    const gz = Solar.fromYmdHms(yy, 7, 1, 12, 0, 0).getLunar().getEightChar().getYear()
    const ss = shiShenOf(gz[0], chart.dayMaster)
    if (ss === '正财') zhengCai.push(`${yy}(${gz})`)
    if (ss === '偏财') pianCai.push(`${yy}(${gz})`)
  }

  const lunarMonth = Math.abs(lunar.getMonth())
  const lines = []
  lines.push('【八字排盘结果】')
  lines.push('')
  lines.push('【基本信息】')
  lines.push(`性别：${genderCn}`)
  lines.push(`命造：${zao}`)
  lines.push(`公历：${p.birth.year}-${String(p.birth.month).padStart(2, '0')}-${String(p.birth.day).padStart(2, '0')} ${String(p.birth.hour).padStart(2, '0')}:${String(p.birth.minute).padStart(2, '0')}`)
  lines.push(`农历：${lunar.toString()}${shiZhi}时`)
  lines.push(`星期：周${lunar.getWeekInChinese()}`)
  lines.push(`季节：${JI_JIE[lunarMonth - 1]}`)
  lines.push(`生肖：${lunar.getYearShengXiao()}`)
  lines.push(`星座：${xingZuoOf(p.birth.month, p.birth.day)}`)
  lines.push(`出生地：${m.label}（时区 ${m.zone}，经度 ${m.lng}°，真太阳时校正 ${chart.timezoneOffsetApplied >= 0 ? '+' : ''}${chart.timezoneOffsetApplied} 分钟）`)
  lines.push('')
  lines.push('【四柱八字】')
  lines.push('        年柱      月柱      日柱      时柱')
  lines.push(`天干：  ${order.map(k => pillars[k].gan).join('        ')}`)
  lines.push(`地支：  ${order.map(k => pillars[k].zhi).join('        ')}`)
  lines.push(`干支：  ${order.map(k => pillars[k].ganZhi).join('    ')}`)
  lines.push('')
  lines.push('【十神（主星）】')
  lines.push(`        ${order.map(k => (k === 'day' ? yuan : pillars[k].tenGodGan)).join('      ')}`)
  lines.push('')
  lines.push('【五行】')
  lines.push(`年柱：${GAN_WUXING[pillars.year.gan]}${ZHI_WUXING[pillars.year.zhi]}、月柱：${GAN_WUXING[pillars.month.gan]}${ZHI_WUXING[pillars.month.zhi]}、日柱：${GAN_WUXING[pillars.day.gan]}${ZHI_WUXING[pillars.day.zhi]}、时柱：${GAN_WUXING[pillars.hour.gan]}${ZHI_WUXING[pillars.hour.zhi]}`)
  lines.push(`五行统计：${Object.entries(wxCount).map(([w, n]) => `${w}${n}`).join('、')}`)
  if (wxMissing.length) lines.push(`五行缺失：${wxMissing.join('、')}`)
  lines.push(`五行旺衰（月令）：${Object.entries(wxSeason).map(([w, s]) => `${w}${s}`).join('、')}`)
  lines.push('')
  lines.push('【藏干与副星】')
  for (const k of order) {
    const pl = pillars[k]
    const label = { year: '年', month: '月', day: '日', hour: '时' }[k]
    lines.push(`${label}支${pl.zhi}藏干：[${pl.cangGan.join(', ')}]，副星：[${pl.tenGodCangGan.join(', ')}]`)
  }
  lines.push('')
  lines.push('【十二长生】')
  lines.push(`年柱：${changSheng12(chart.dayMaster, pillars.year.zhi)}、月柱：${changSheng12(chart.dayMaster, pillars.month.zhi)}、日柱：${changSheng12(chart.dayMaster, pillars.day.zhi)}、时柱：${changSheng12(chart.dayMaster, pillars.hour.zhi)}`)
  lines.push('')
  lines.push('【纳音】')
  lines.push(`年柱：${LunarUtil.NAYIN[pillars.year.ganZhi]}、月柱：${LunarUtil.NAYIN[pillars.month.ganZhi]}、日柱：${LunarUtil.NAYIN[pillars.day.ganZhi]}、时柱：${LunarUtil.NAYIN[pillars.hour.ganZhi]}`)
  lines.push('')
  lines.push('【空亡】')
  lines.push(`年柱空亡：${LunarUtil.getXunKong(pillars.year.ganZhi)}、日柱空亡：${LunarUtil.getXunKong(pillars.day.ganZhi)}`)
  lines.push('')
  lines.push('【胎元命宫】')
  lines.push(`胎元：${chart.taiYuan}`)
  lines.push(`命宫：${chart.mingGong}`)
  lines.push(`身宫：${chart.shenGong}`)
  lines.push('')
  lines.push('【干支关系】')
  lines.push(`天干关系：[${ganRels.join(', ') || '无'}]`)
  lines.push(`地支关系：[${zhiRels.join(', ') || '无'}]`)
  lines.push('')
  lines.push('【节气信息】')
  lines.push(`上一节：${lunar.getPrevJie().getName()} (${prevJie.toYmdHms()})`)
  lines.push(`下一节：${lunar.getNextJie().getName()} (${nextJie.toYmdHms()})`)
  lines.push(`出生节气：${lunar.getPrevJie().getName()}后${diffDays}天${diffH}小时${diffM}分`)
  lines.push('')
  lines.push('【起运信息】')
  lines.push(`起运说明：${chart.qiYun}`)
  lines.push('')
  lines.push('【大运信息】')
  chart.daYun.forEach((d, i) => {
    lines.push(`  第${i + 1}步大运：${d.startAge}-${d.startAge + 9}岁（${d.startYear}-${d.endYear}年）：${d.ganZhi}`)
  })
  lines.push('')
  lines.push('【流年干支表】')
  lines.push('格式：年份(干支,年龄)')
  lines.push(...liuNianRows)
  lines.push('')
  lines.push('【重要流年提示】')
  lines.push(`正财流年：${zhengCai.slice(0, 15).join(', ')}${zhengCai.length > 15 ? ', ...' : ''}`)
  lines.push(`偏财流年：${pianCai.slice(0, 15).join(', ')}${pianCai.length > 15 ? ', ...' : ''}`)
  lines.push('')
  lines.push('【本盘缺字段说明】以下字段本排盘引擎不提供，如实缺、不编造：')
  lines.push('神煞（八字神煞表）、胎息、精确起运日期与交运时间说明。')
  return lines.join('\n')
}

// ─────────────────────────────────────────────────────────────
// 五、B 组追加事实（我们规则引擎的结构化判断）
// ─────────────────────────────────────────────────────────────
export function buildEnhancedFacts(analyzable, luck) {
  const favors = getFavorSets(analyzable)
  const tiaoHou = tiaoHouWuxing(analyzable.dayMaster, analyzable.pillars.month.zhi)
  const lines = []
  lines.push('')
  lines.push('【本产品算法给出的结构化判断】（规则引擎输出，供参考）')
  lines.push(`旺衰：${analyzable.analysis.wangShuai}`)
  lines.push(`格局：${analyzable.analysis.geJu}`)
  lines.push(`喜用：${favors.favorable.join('、')} ｜ 忌神：${favors.unfavorable.join('、')}`)
  lines.push(`调候用神：${tiaoHou.join('、')}`)
  lines.push(`当前大运：${luck.currentDaYunGanZhi}（现值 ${luck.currentYear} 年）`)
  lines.push('大运（每步：干支 ｜ 起讫年份 ｜ 判词 ｜ 结构病 ｜ 分维度[事业/财运/健康/六亲]）：')
  for (const d of luck.daYun) {
    const dom = d.domains
    lines.push(`  ${d.ganZhi} ｜ ${d.startYear}-${d.endYear}年 ｜ ${d.tag} ｜ ${d.structuralIssues.length ? d.structuralIssues.join('；') : '无'} ｜ 事业${dom.career.tendency}/财运${dom.wealth.tendency}/健康${dom.health.tendency}/六亲${dom.relation.tendency}${d.current ? ' ｜←当前' : ''}`)
  }
  lines.push('流年（干支 ｜ 判词 ｜ 关系 ｜ 结构病）：')
  for (const y of luck.liuNian) {
    lines.push(`  ${y.year}年 ${y.ganZhi} ｜ ${y.tag} ｜ ${y.relations.length ? y.relations.join('；') : '无'} ｜ ${y.structuralIssues.length ? y.structuralIssues.join('；') : '无'}${y.current ? ' ｜←当年' : ''}${y.isPast ? '（已过）' : ''}`)
  }
  return lines.join('\n')
}

// ─────────────────────────────────────────────────────────────
// 六、prompt 构建（A/B 两组；system 两组完全一致，差异仅在 user 首轮）
//   ★ 绝不含 answer / contest_id / description / total_questions（断言守护）
// ─────────────────────────────────────────────────────────────
export const SYSTEM_PROMPT = '你是一位精通中国传统八字命理的专家。请根据提供的排盘信息，运用专业命理知识进行分析，并按要求作答。'

export const ACK_MESSAGE = '收到排盘信息，我已仔细阅读完毕，请提问。'

export function buildFirstUserMessage(standardText, enhancedFacts, currentYear) {
  let msg = standardText
  if (enhancedFacts) msg += enhancedFacts
  msg += `\n\n现在时间是 ${currentYear} 年。请等待我提出问题。`
  return msg
}

export function buildQuestionMessage(index, q) {
  return `问题${index}：${q.question}\n${q.options.join('\n')}\n请先简要分析，最后一行严格按「答案：X」格式输出你的选择（X 为 A/B/C/D 之一）。`
}

// 从模型回复中解析答案字母；解析失败返回 null（记为无效作答，计错并标记）
export function parseAnswer(reply) {
  const matches = [...reply.matchAll(/答案[:：]\s*([A-D])\b/g)]
  if (matches.length === 0) return null
  return matches[matches.length - 1][1]
}
