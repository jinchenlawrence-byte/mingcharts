// 合婚配对规则引擎 —— 纯确定性计算（干支关系/纳音/配偶星/五行互补/十神互见/大运同步）
// 纪律：只输出可复算的事实；评分规则公开在文件内；不编造、不静默改干支。
import type { PaipanResult } from './paipan'
// ★ 冲/合/害/刑表复用 branchRelations.ts 的单一事实源（HANDOFF-个性化日运 §二）
import { LIU_CHONG, LIU_HE, LIU_HAI, SAN_XING_GROUPS } from './branchRelations'

// ───────── 基础常量 ─────────
const GAN = ['甲','乙','丙','丁','戊','己','庚','辛','壬','癸']
const ZHI = ['子','丑','寅','卯','辰','巳','午','未','申','酉','戌','亥']
export const GAN_WX: Record<string,string> = {
  '甲':'木','乙':'木','丙':'火','丁':'火','戊':'土','己':'土','庚':'金','辛':'金','壬':'水','癸':'水'
}
export const ZHI_WX: Record<string,string> = {
  '子':'水','丑':'土','寅':'木','卯':'木','辰':'土','巳':'火','午':'火','未':'土','申':'金','酉':'金','戌':'土','亥':'水'
}
const GAN_HE: Record<string,string> = { '甲':'己','己':'甲','乙':'庚','庚':'乙','丙':'辛','辛':'丙','丁':'壬','壬':'丁','戊':'癸','癸':'戊' }
// ★ 冲/合/害表：复用 branchRelations.ts 单一事实源（机械别名，内容逐支一致）
const ZHI_CHONG: Record<string,string> = LIU_CHONG
const ZHI_HAI: Record<string,string> = LIU_HAI
const ZHI_LIUHE: Record<string,string> = LIU_HE
const SANHE: Array<{ group: string[]; ju: string }> = [
  { group: ['申','子','辰'], ju: '水' }, { group: ['寅','午','戌'], ju: '火' },
  { group: ['巳','酉','丑'], ju: '金' }, { group: ['亥','卯','未'], ju: '木' }
]
// ★ 三刑组复用 branchRelations.ts（SAN_XING_GROUPS，内容一致）
const XING_GROUP = SAN_XING_GROUPS as readonly (readonly string[])[]
// 子卯（两支即成立）与自刑支：刑事实源的派生选择器（与 XIANG_XING 一致，
// 仅在此处按「两支成立 vs 三支全」分流，避免 zhiRelation 误报三刑半刑）
const ZI_MAO = new Set(['子', '卯'])
const ZI_XING = new Set(['辰', '午', '酉', '亥'])

// 60甲子纳音表
const NAYIN: Array<[string[],string]> = [
  [['甲子','乙丑'],'海中金'], [['丙寅','丁卯'],'炉中火'], [['戊辰','己巳'],'大林木'],
  [['庚午','辛未'],'路旁土'], [['壬申','癸酉'],'剑锋金'], [['甲戌','乙亥'],'山头火'],
  [['丙子','丁丑'],'涧下水'], [['戊寅','己卯'],'城头土'], [['庚辰','辛巳'],'白蜡金'],
  [['壬午','癸未'],'杨柳木'], [['甲申','乙酉'],'泉中水'], [['丙戌','丁亥'],'屋上土'],
  [['戊子','己丑'],'霹雳火'], [['庚寅','辛卯'],'松柏木'], [['壬辰','癸巳'],'长流水'],
  [['甲午','乙未'],'沙中金'], [['丙申','丁酉'],'山下火'], [['戊戌','己亥'],'平地木'],
  [['庚子','辛丑'],'壁上土'], [['壬寅','癸卯'],'金箔金'], [['甲辰','乙巳'],'覆灯火'],
  [['丙午','丁未'],'天河水'], [['戊申','己酉'],'大驿土'], [['庚戌','辛亥'],'钗钏金'],
  [['壬子','癸丑'],'桑柘木'], [['甲寅','乙卯'],'大溪水'], [['丙辰','丁巳'],'沙中土'],
  [['戊午','己未'],'天上火'], [['庚申','辛酉'],'石榴木'], [['壬戌','癸亥'],'大海水'],
]
const NAYIN_MAP: Record<string,string> = {}
for (const [[a,b],name] of NAYIN) { NAYIN_MAP[a] = name; NAYIN_MAP[b] = name }
const NAYIN_WX: Record<string,string> = {
  '海中金':'金','剑锋金':'金','白蜡金':'金','沙中金':'金','金箔金':'金','钗钏金':'金',
  '炉中火':'火','山头火':'火','霹雳火':'火','山下火':'火','覆灯火':'火','天上火':'火',
  '大林木':'木','杨柳木':'木','平地木':'木','松柏木':'木','石榴木':'木',
  '路旁土':'土','城头土':'土','屋上土':'土','壁上土':'土','大驿土':'土','沙中土':'土',
  '涧下水':'水','泉中水':'水','长流水':'水','天河水':'水','大溪水':'水','大海水':'水',
}
const WX_SHENG: Record<string,string> = { '木':'火','火':'土','土':'金','金':'水','水':'木' }

// ───────── 类型 ─────────
export interface HemunChart {
  dayMaster: string
  input: { gender: number }
  lunarDate?: string
  pillars: {
    year: { gan: string; zhi: string; ganZhi: string }
    month: { gan: string; zhi: string; ganZhi: string }
    day: { gan: string; zhi: string; ganZhi: string }
    hour: { gan: string; zhi: string; ganZhi: string }
  }
  daYun?: Array<{ ganZhi: string; startYear: number; endYear: number; startAge: number }>
  analysis?: { wangShuai: string; geJu: string }
}

export type DimLevel = '吉' | '平' | '忌'
// 依据分级：典籍（子平通说/经典所载）｜古法（唐宋古法，非子平主流）｜民俗（民间生肖俗论）｜产品设定（本产品自创，古典合婚无此判据）
export type DimBasis = '典籍' | '古法' | '民俗' | '产品设定'
export interface HemunDimension {
  key: string
  name: string
  delta: number          // 该维度净加减分（仅供内部排序/调试，不做主展示）
  level: DimLevel
  facts: string[]       // 算法确认的事实
  tags: string[]        // 吉凶标签
  basis: DimBasis       // 依据分级
  verdict: string       // 一句话人话结论（非标签）
  citations?: string[]  // 典籍出处（可选）
}
export interface HemunResult {
  male: ChartBrief
  female: ChartBrief
  dimensions: HemunDimension[]
  overall: string        // 总观感（由维度分布决定，非分数）
  totalScore: number     // 内部参考分，前端不得主展示
  grade: string
  gradeLabel: string
  keyTags: string[]
  currentLuck: { male: string; female: string; note: string }
}
interface ChartBrief {
  ganZhi: { year: string; month: string; day: string; hour: string }
  dayMaster: string
  wangShuai: string
  geJu: string
  lunarDate: string
  yearNaYin: string
}

// ───────── 工具函数 ─────────
function wxSheng(a: string, b: string): boolean { return WX_SHENG[a] === b }         // a 生 b
function wxKe(a: string, b: string): boolean { return WX_SHENG[WX_SHENG[a]] === b } // a 克 b
// 跨日主十神：A 日主看 B 天干
function crossTenGod(a: string, b: string): string {
  const wa = GAN_WX[a], wb = GAN_WX[b]
  const sameYinYang = GAN.indexOf(a) % 2 === GAN.indexOf(b) % 2
  if (wa === wb) return sameYinYang ? '比肩' : '劫财'
  if (wxSheng(wa, wb)) return sameYinYang ? '食神' : '伤官'   // A 生 B
  if (wxKe(wa, wb)) return sameYinYang ? '偏财' : '正财'     // A 克 B
  if (wxKe(wb, wa)) return sameYinYang ? '七杀' : '正官'     // B 克 A
  return sameYinYang ? '偏印' : '正印'                        // B 生 A
}

// 地支在一个集合中的关系
function zhiRelation(a: string, b: string): string[] {
  const out: string[] = []
  if (ZHI_CHONG[a] === b) out.push('六冲')
  if (ZHI_LIUHE[a] === b) out.push('六合')
  if (ZHI_HAI[a] === b) out.push('六害')
  if (ZI_MAO.has(a) && ZI_MAO.has(b) && a !== b) out.push('相刑')
  if (a === b && ZI_XING.has(a)) out.push('自刑')
  // 寅巳申 / 丑戌未 三刑须三支全，在三合判定处处理
  return out
}

// 八字五行计数（4天干 + 4地支本气，共8字）
function wuxingCount(c: HemunChart): Record<string, number> {
  const cnt: Record<string, number> = { '木': 0,'火': 0,'土': 0,'金': 0,'水': 0 }
  const ps = [c.pillars.year, c.pillars.month, c.pillars.day, c.pillars.hour]
  for (const p of ps) { cnt[GAN_WX[p.gan]]++; cnt[ZHI_WX[p.zhi]]++ }
  return cnt
}

// 旺衰 → 喜用五行类别
function favorableWuxing(c: HemunChart): { add: string[]; reduce: string[] } {
  const dm = c.dayMaster
  const self = GAN_WX[dm]
  const yin = Object.entries(WX_SHENG).find(([, v]) => v === self)![0] // 生我者
  const shi = WX_SHENG[self]                                          // 我生者
  const cai = Object.entries(WX_SHENG).find(([, v]) => WX_SHENG[v] === self)![0] // 我克者
  const guan = Object.entries(WX_SHENG).find(([, v]) => WX_SHENG[self] === v)![0] // 克我者
  const weak = /身弱/.test(c.analysis?.wangShuai || '')
  return weak
    ? { add: [yin, self], reduce: [cai, guan, shi] }
    : { add: [cai, guan, shi], reduce: [yin, self] }
}

function currentDaYun(c: HemunChart, nowYear: number): { ganZhi: string; info: string } | null {
  const dy = (c.daYun || []).find(d => nowYear >= d.startYear && nowYear <= d.endYear)
  if (!dy) return null
  // 运之喜忌：运支五行对喜用
  const fav = favorableWuxing(c)
  const zhiWx = ZHI_WX[dy.ganZhi[1]]
  const ganWx = GAN_WX[dy.ganZhi[0]]
  const zhiOk = fav.add.includes(zhiWx), ganOk = fav.add.includes(ganWx)
  const info = (zhiOk || ganOk) ? '助运' : (fav.reduce.includes(zhiWx) || fav.reduce.includes(ganWx)) ? '耗运' : '平运'
  return { ganZhi: dy.ganZhi, info }
}

// ───────── 主函数 ─────────
export function hehun(maleIn: PaipanResult, femaleIn: PaipanResult, now: Date = new Date()): HemunResult {
  const male: HemunChart = maleIn as unknown as HemunChart
  const female: HemunChart = femaleIn as unknown as HemunChart
  const dims: HemunDimension[] = []
  const keyTags: string[] = []
  let score = 60 // 基础分

  const finish = (d: Omit<HemunDimension, 'level'> & { level?: DimLevel }) => {
    const level: DimLevel = d.level ?? (d.delta > 0 ? '吉' : d.delta < 0 ? '忌' : '平')
    dims.push({ ...d, level })
    score += d.delta
  }

  // ════ 维度1a：生肖配对（民俗）════
  {
    const facts: string[] = [], tags: string[] = []
    let delta = 0
    const mz = male.pillars.year.zhi, fz = female.pillars.year.zhi
    const rel = zhiRelation(mz, fz)
    if (rel.includes('六合')) { delta += 12; tags.push('生肖六合'); facts.push(`年支${mz}与${fz}六合，生肖相生相合`) }
    if (rel.includes('六冲')) { delta -= 10; tags.push('生肖六冲'); facts.push(`年支${mz}与${fz}六冲，民俗视为根基对冲`) }
    if (rel.includes('六害')) { delta -= 6; tags.push('生肖六害'); facts.push(`年支${mz}与${fz}六害，民俗视为暗中有损`) }
    if (rel.includes('相刑')) { delta -= 8; tags.push('生肖相刑'); facts.push(`年支${mz}与${fz}相刑`) }
    const zhiPair = [mz, fz]
    for (const { group, ju } of SANHE) {
      const hit = group.filter(g => zhiPair.includes(g))
      if (hit.length === 2) { delta += 8; tags.push(`年支半合${ju}局`); facts.push(`年支${hit.join('、')}半合${ju}局，气息相投`) }
    }
    for (const g of XING_GROUP) {
      const hit = g.filter(x => zhiPair.includes(x))
      if (hit.length === 2) { delta -= 8; tags.push('年支带刑'); facts.push(`年支${hit.join('、')}入${g.join('')}三刑之组`) }
    }
    if (!rel.length && !tags.length) facts.push(`年支${mz}与${fz}无冲合害刑，中性`)
    const verdict = delta > 0 ? '生肖彼此投合，民俗视为有缘、家庭根基易融洽'
      : delta < 0 ? '生肖带冲刑，民俗认为相处需多磨合；此属民间俗论，权重有限，不必介怀'
      : '生肖无冲无合，民俗上属平常之配'
    finish({ key: 'yearZodiac', name: '生肖配对', basis: '民俗', delta, facts, tags, verdict,
      citations: ['生肖合冲为民间俗论，生肖不合 ≠ 不能结婚；合婚以日柱夫妻宫与全局五行为重，生肖仅一项参考、权重有限'] })
  }

  // ════ 维度1b：年柱干支（典籍）════
  {
    const facts: string[] = [], tags: string[] = []
    let delta = 0
    const mg = male.pillars.year.gan, fg = female.pillars.year.gan
    if (GAN_HE[mg] === fg) { delta += 4; tags.push('年干五合'); facts.push(`年干${mg}与${fg}五合`) }
    else {
      const wmg = GAN_WX[mg], wfg = GAN_WX[fg]
      if (wxSheng(wmg, wfg) || wxSheng(wfg, wmg)) { delta += 3; facts.push(`年干${mg}(${wmg})与${fg}(${wfg})五行相生`) }
      else if (wxKe(wmg, wfg) || wxKe(wfg, wmg)) { delta -= 2; facts.push(`年干${mg}与${fg}五行相克`) }
      else facts.push(`年干${mg}与${fg}同气，中性`)
    }
    const verdict = delta > 0 ? '年柱天干相合相生，双方原生家庭气场相投'
      : delta < 0 ? '年柱天干相克，双方家庭背景或观念或有差异，宜多沟通'
      : '年柱天干平和，家庭层面无显著吉凶'
    finish({ key: 'yearGanZhi', name: '年柱干支', basis: '典籍', delta, facts, tags, verdict,
      citations: ['干支五合、五行生克为子平基本关系，《渊海子平》等皆有载'] })
  }

  // ════ 维度1c：年柱纳音（古法）════
  {
    const facts: string[] = [], tags: string[] = []
    let delta = 0
    const mNayin = NAYIN_MAP[male.pillars.year.ganZhi], fNayin = NAYIN_MAP[female.pillars.year.ganZhi]
    const wm = NAYIN_WX[mNayin], wf = NAYIN_WX[fNayin]
    facts.push(`年柱纳音：男${mNayin}(${wm})、女${fNayin}(${wf})`)
    if (wm === wf || wxSheng(wm, wf) || wxSheng(wf, wm)) { delta += 4; tags.push('纳音相生相比') }
    else if (wxKe(wm, wf) || wxKe(wf, wm)) { delta -= 4; tags.push('纳音相克') }
    const verdict = delta > 0 ? '纳音相生相比，古法视为命气相得'
      : delta < 0 ? '纳音相克，古法认为命气相制；纳音为唐宋古法，非子平主流，仅作参考'
      : '纳音平和，古法上无显著吉凶'
    finish({ key: 'nayin', name: '年柱纳音', basis: '古法', delta, facts, tags, verdict,
      citations: ['纳音合婚属唐宋古法（《李虚中命书》一脉），非子平主流判据'] })
  }

  // ════ 维度2：日柱夫妻宫 ════
  {
    const facts: string[] = [], tags: string[] = []
    let delta = 0
    const md = male.pillars.day, fd = female.pillars.day
    // 日干
    let ganTag = ''
    if (GAN_HE[md.gan] === fd.gan) { delta += 10; ganTag = '日干五合'; facts.push(`日干${md.gan}与${fd.gan}五合，阴阳相契`) }
    else {
      const wm = GAN_WX[md.gan], wf = GAN_WX[fd.gan]
      if (wxSheng(wm, wf) || wxSheng(wf, wm)) { delta += 6; ganTag = '日干相生'; facts.push(`日干${md.gan}(${wm})与${fd.gan}(${wf})相生，有情互助`) }
      else if (wm === wf) { delta += 3; ganTag = '日干同类'; facts.push(`日干同属${wm}，性情相近`) }
      else if (wxKe(wm, wf) || wxKe(wf, wm)) { delta -= 4; ganTag = '日干相克'; facts.push(`日干${md.gan}与${fd.gan}五行相克，性情需磨合`) }
    }
    if (ganTag) tags.push(ganTag)
    // 日支
    const rel = zhiRelation(md.zhi, fd.zhi)
    let zhiTag = ''
    if (rel.includes('六合')) { delta += 10; zhiTag = '日支六合'; facts.push(`日支（夫妻宫）${md.zhi}与${fd.zhi}六合`) }
    if (rel.includes('六冲')) { delta -= 10; zhiTag = '日支六冲'; facts.push(`夫妻宫${md.zhi}与${fd.zhi}六冲，价值观与生活节奏易对立`) }
    if (rel.includes('六害')) { delta -= 6; zhiTag = '日支六害'; facts.push(`夫妻宫${md.zhi}与${fd.zhi}六害`) }
    if (rel.includes('相刑')) { delta -= 8; zhiTag = '日支相刑'; facts.push(`夫妻宫${md.zhi}与${fd.zhi}相刑`) }
    for (const { group, ju } of SANHE) {
      const hit = group.filter(g => [md.zhi, fd.zhi].includes(g))
      if (hit.length === 2) { delta += 7; zhiTag = `日支半合${ju}局`; facts.push(`夫妻宫${hit.join('、')}半合${ju}局`) }
    }
    for (const g of XING_GROUP) {
      const hit = g.filter(x => [md.zhi, fd.zhi].includes(x))
      if (hit.length === 2) { delta -= 8; zhiTag = '日支带刑'; facts.push(`夫妻宫${hit.join('、')}入三刑之组`) }
    }
    if (zhiTag) tags.push(zhiTag)
    if (!zhiTag) facts.push(`日支${md.zhi}与${fd.zhi}无冲合，中性`)
    // 天合地合
    if (ganTag === '日干五合' && zhiTag === '日支六合') {
      delta += 8; tags.push('天合地合'); keyTags.push('天合地合')
      facts.push('两柱天合地合——日柱天干五合且地支六合，传统合婚视为上上等之配')
    }
    const verdictDay = tags.includes('天合地合') ? '日柱天合地合，夫妻宫相契至深，传统合婚视为上等之配'
      : delta > 0 ? '夫妻宫相合相生，两人性情与亲密关系易协调'
      : delta < 0 ? '夫妻宫带冲刑，深层价值观与生活习惯需磨合，宜多体谅'
      : '夫妻宫平和，亲密关系无显著吉凶'
    finish({ key: 'day', name: '日柱夫妻宫', basis: '典籍', delta, facts, tags, verdict: verdictDay,
      citations: ['日支为夫妻宫，六合六冲论婚姻，《三命通会》《渊海子平》皆有载'] })
  }

  // ════ 维度3：配偶星（男财星、女官星）════
  {
    const facts: string[] = [], tags: string[] = []
    let delta = 0
    const starCheck = (c: HemunChart, label: string) => {
      const dm = c.dayMaster
      const ps = [c.pillars.year, c.pillars.month, c.pillars.hour]
      const dayCang = [c.pillars.day.zhi] // 夫妻宫
      const want = (g: string) => {
        const tg = crossTenGod(dm, g)
        return label === '男' ? tg.includes('财') : tg.includes('官')
      }
      const tou = ps.filter(p => want(p.gan)).map(p => p.gan)
      const inGong = dayCang.filter(want)
      const starName = label === '男' ? '财星（妻星）' : '官星（夫星）'
      if (tou.length) { delta += 5; facts.push(`${label}命${starName}${tou.join('、')}透干，配偶星明朗`) }
      if (inGong.length) { delta += 5; facts.push(`${label}命夫妻宫坐${starName}，得配偶星入宫`) }
      if (!tou.length && !inGong.length) {
        // 查地支藏干中有无
        const CANG: Record<string,string[]> = {
          '子':['癸'],'丑':['己','癸','辛'],'寅':['甲','丙','戊'],'卯':['乙'],
          '辰':['戊','乙','癸'],'巳':['丙','庚','戊'],'午':['丁','己'],'未':['己','丁','乙'],
          '申':['庚','壬','戊'],'酉':['辛'],'戌':['戊','辛','丁'],'亥':['壬','甲']
        }
        const hidden = [c.pillars.year, c.pillars.month, c.pillars.hour, c.pillars.day]
          .some(p => (CANG[p.zhi] || []).some(want))
        if (hidden) { delta += 2; facts.push(`${label}命${starName}藏而不透，配偶缘分偏内敛`) }
        else { delta -= 5; facts.push(`${label}命全局不见${starName}，配偶缘分偏淡，宜后天经营`) }
      }
    }
    starCheck(male, '男')
    starCheck(female, '女')
    // 对方五行补益配偶星
    {
      const maleCai = Object.entries(WX_SHENG).find(([, v]) => WX_SHENG[v] === GAN_WX[male.dayMaster])![0] // 男所克=财
      const femaleGuan = Object.entries(WX_SHENG).find(([, v]) => WX_SHENG[GAN_WX[female.dayMaster]] === v)![0] // 克女=官
      const fCnt = wuxingCount(female), mCnt = wuxingCount(male)
      if (fCnt[maleCai] >= 2) { delta += 4; facts.push(`女命八字${maleCai}旺（${fCnt[maleCai]}/8），生助男命妻星`) }
      if (mCnt[femaleGuan] >= 2) { delta += 4; facts.push(`男命八字${femaleGuan}旺（${mCnt[femaleGuan]}/8），生助女命夫星`) }
    }
    const verdictSp = delta >= 5 ? '配偶星明朗，双方命式中夫星妻星各得其位，感情缘分深厚'
      : delta > 0 ? '配偶星得位或得对方八字生助，感情缘分尚可'
      : '配偶星偏弱或不明，感情缘分宜后天主动经营'
    finish({ key: 'spouse', name: '配偶星', basis: '典籍', delta, facts, tags, verdict: verdictSp,
      citations: ['男以财为妻、女以官为夫，子平通说'] })
  }

  // ════ 维度4：五行互补与喜用互助 ════
  {
    const facts: string[] = [], tags: string[] = []
    let delta = 0
    const mCnt = wuxingCount(male), fCnt = wuxingCount(female)
    const wxList = ['木','火','土','金','水']
    facts.push(`男命五行分布：${wxList.map(w => `${w}${mCnt[w]}`).join('、')}`)
    facts.push(`女命五行分布：${wxList.map(w => `${w}${fCnt[w]}`).join('、')}`)
    // 互补：一方明显不足(≤1/8)恰为另一方有余(≥3/8)
    let bu = 0
    for (const w of wxList) {
      if (mCnt[w] <= 1 && fCnt[w] >= 3) { bu++; facts.push(`男命${w}偏弱，女命${w}旺（${fCnt[w]}/8）可补`) }
      if (fCnt[w] <= 1 && mCnt[w] >= 3) { bu++; facts.push(`女命${w}偏弱，男命${w}旺（${mCnt[w]}/8）可补`) }
    }
    delta += Math.min(bu, 4) * 3
    if (bu) tags.push('五行互补')
    // 喜用互助：对方八字中自己喜用五行占比
    const helpCheck = (self: HemunChart, other: HemunChart, label: string) => {
      const fav = favorableWuxing(self)
      const cnt = wuxingCount(other)
      const n = fav.add.reduce((s, w) => s + cnt[w], 0)
      if (n >= 5) { delta += 6; facts.push(`${label}喜用${fav.add.join('、')}，对方八字含${n}/8，正得其助`) }
    }
    helpCheck(male, female, '男命')
    helpCheck(female, male, '女命')
    if (!bu && !tags.some(t => t.includes('喜用'))) facts.push('双方五行无明显互补缺口，亦无大碍')
    const verdictWx = bu > 0 ? '五行互补，一方所缺恰为对方所有，相处中能彼此扶持'
      : delta > 0 ? '喜用互有所助，对方八字能补益自己所需'
      : '五行无明显互补，各有所长，宜在相处中取长补短'
    finish({ key: 'wuxing', name: '五行互补·喜用互助', basis: '典籍', delta, facts, tags, verdict: verdictWx,
      citations: ['据用神理论延伸——古典合婚专论未明言五行互补一法，本维度为子平喜用理论的引申应用'] })
  }

  // ════ 维度5：各自婚姻宫稳定度 ════
  {
    const facts: string[] = [], tags: string[] = []
    let delta = 0
    const gongCheck = (c: HemunChart, label: string) => {
      const dz = c.pillars.day.zhi
      const others = [c.pillars.year.zhi, c.pillars.month.zhi, c.pillars.hour.zhi]
      let bad = 0
      for (const z of others) {
        const rel = zhiRelation(dz, z)
        if (rel.includes('六冲')) { bad -= 6; facts.push(`${label}命夫妻宫${dz}受${z}冲，原局婚姻宫逢冲`) }
      }
      const he = others.filter(z => ZHI_LIUHE[dz] === z).length
      if (he) { bad -= 2; facts.push(`${label}命夫妻宫${dz}被他支合，婚后须注意感情界限`) }
      if (bad === 0 && !he) facts.push(`${label}命夫妻宫${dz}在原局无冲无合，根基安稳`)
      delta += bad
    }
    gongCheck(male, '男')
    gongCheck(female, '女')
    const verdictPal = delta === 0 ? '双方婚姻宫在原局皆安稳，感情根基牢固'
      : delta > -4 ? '婚姻宫小有波澜，感情中偶有起伏，无大碍'
      : '一方或双方婚姻宫逢冲，感情路上易有波折，需用心守护'
    finish({ key: 'palace', name: '婚姻宫稳定度', basis: '典籍', delta, facts, tags, verdict: verdictPal,
      citations: ['夫妻宫逢冲不吉，子平通说'] })
  }

  // ════ 维度6：十神互见 ════
  {
    const facts: string[] = [], tags: string[] = []
    let delta = 0
    const mSeesF = crossTenGod(male.dayMaster, female.dayMaster)   // 男日主看女日主
    const fSeesM = crossTenGod(female.dayMaster, male.dayMaster)   // 女日主看男日主
    facts.push(`以男命日主看女命：女为男之「${mSeesF}」`)
    facts.push(`以女命日主看男命：男为女之「${fSeesM}」`)
    if (mSeesF.includes('财')) { delta += 4; tags.push('女为男之财') }
    if (fSeesM.includes('官')) { delta += 4; tags.push('男为女之官') }
    if (mSeesF.includes('印') || fSeesM.includes('印')) { delta += 2; tags.push('相生有情') }
    const verdictSs = (mSeesF.includes('财') && fSeesM.includes('官')) ? '女为男之财、男为女之官，互为正配，十神上最契合'
      : (mSeesF.includes('财') || fSeesM.includes('官')) ? '一方为对方之正缘星，十神关系契合'
      : (mSeesF.includes('印') || fSeesM.includes('印')) ? '一方为对方之印，相生有情，相处多扶持'
      : '日主十神非正配关系，缘分深浅须看其他维度'
    finish({ key: 'shishen', name: '十神互见', basis: '典籍', delta, facts, tags, verdict: verdictSs,
      citations: ['男以财为妻、女以官为夫，子平通说'] })
  }

  // ════ 维度7：大运同步 ════
  {
    const facts: string[] = [], tags: string[] = []
    let delta = 0
    const year = now.getFullYear()
    const mDy = currentDaYun(male, year), fDy = currentDaYun(female, year)
    if (mDy && fDy) {
      facts.push(`男当前行${mDy.ganZhi}运（${mDy.info}）；女当前行${fDy.ganZhi}运（${fDy.info}）`)
      if (mDy.info === '助运' && fDy.info === '助运') { delta += 4; tags.push('大运同步皆助') }
      else if (mDy.info === '耗运' && fDy.info === '耗运') { delta -= 4; tags.push('大运同步皆耗') }
      else facts.push('双方当前运一助一平/耗，节奏略有先后，宜互相扶持')
    } else facts.push('大运信息不全，略过同步校验')
    const verdictDy = delta > 0 ? '双方当前同处助运，人生节奏同频，正宜携手共进'
      : delta < 0 ? '双方当前同处耗运，节奏同频但皆辛苦，宜相互扶持共渡'
      : '双方当前运势一先一后，节奏略有错位，宜互相体谅扶持'
    finish({ key: 'dayun', name: '大运同步', basis: '产品设定', delta, facts, tags, verdict: verdictDy,
      citations: ['古典合婚文献无「双方大运同步」判据，本维度为本产品自创的现代指标，仅供节奏参考'] })
  }

  // ── 总分（内部参考，非主展示）──
  const totalScore = Math.max(0, Math.min(100, Math.round(score)))
  const grade = totalScore >= 85 ? '上等良缘'
    : totalScore >= 75 ? '上等婚配'
    : totalScore >= 65 ? '中上等婚配'
    : totalScore >= 55 ? '中等婚配·宜多经营'
    : '波折较多·需多包容'
  const gradeLabel = `合婚总分 ${totalScore} / 100　${grade}`

  // ── 总观感：按维度分布比例（非分数求和；维度数不写死）──
  // dayun（大运同步）为产品自创节奏指标、非典籍判据，不参与 overall 分布
  const dimsForOverall = dims.filter(d => d.key !== 'dayun')
  const ji = dimsForOverall.filter(d => d.level === '吉').length
  const ji2 = dimsForOverall.filter(d => d.level === '忌').length
  const n = dimsForOverall.length
  const r = ji / n
  const overall =
    r >= 0.7 && ji2 <= 1 ? '互补性强，契合度高' :
    r >= 0.55 ? '整体协调，长处在多' :
    ji2 / n >= 0.55 ? '差异较大，需用心经营' :
    ji >= ji2 ? '吉多于忌，宜多沟通' :
    '各有长短，重在磨合'

  const brief = (c: HemunChart): ChartBrief => ({
    ganZhi: {
      year: c.pillars.year.ganZhi, month: c.pillars.month.ganZhi,
      day: c.pillars.day.ganZhi, hour: c.pillars.hour.ganZhi
    },
    dayMaster: c.dayMaster,
    wangShuai: c.analysis?.wangShuai || '',
    geJu: c.analysis?.geJu || '',
    lunarDate: c.lunarDate || '',
    yearNaYin: NAYIN_MAP[c.pillars.year.ganZhi],
  })

  const year2 = now.getFullYear()
  const mDy = currentDaYun(male, year2), fDy = currentDaYun(female, year2)

  return {
    male: brief(male),
    female: brief(female),
    dimensions: dims,
    overall,
    totalScore,
    grade,
    gradeLabel,
    keyTags,
    currentLuck: {
      male: mDy ? `${mDy.ganZhi}·${mDy.info}` : '—',
      female: fDy ? `${fDy.ganZhi}·${fDy.info}` : '—',
      note: '大运助耗以各自旺衰喜用判定，仅作节奏参考',
    },
  }
}
