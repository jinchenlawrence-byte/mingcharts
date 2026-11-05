// 英文规则引擎文案层（合婚 / 紫微 / 方位 / 年运）
//
// 为什么单独一层：中文规则引擎产出的是中文长句，英文页若直接渲染会整段中文；
// 若直接翻译又容易删条目。这里按【同一组结构化事实】重新生成英文，
// 条目数、判定分支与中文逐条对齐（不是摘要），且保证输出零 CJK。
// 只在 locale=en 时由英文页调用；简/繁路径完全不经过本文件。

import type { PaipanResult } from './paipan'
import {
  GAN_HE, GAN_WX, ZHI_WX, ZHI_LIUHE, SANHE, XING_GROUP, WX_SHENG,
  NAYIN_MAP, NAYIN_WX, crossTenGod, zhiRelation, wuxingCount,
  favorableWuxing, currentDaYun, wxSheng, wxKe,
  type HemunChart,
} from './hemun'
import type { ZwChart, ZiweiAnalysis, PeriodRead, PalaceRead } from './ziwei'
import type { GeoAnalysis, GeoCityHit, WX } from './geo'
import type { LuckDaYunItem, LuckLiuNianItem, LuckLiuYueItem, LuckDomain } from './analysis'
import {
  BRANCH_PINYIN, STEM_PINYIN, STEM_ELEMENT, BRANCH_ELEMENT,
  TEN_GOD_EN, FORTUNE_TIER_EN, LUCK_TAG_EN, ELEMENT_EN, ZODIAC_EN,
  ganZhiEn, branchEn, stemEn, elementEn,
} from './enTerms'
import { strengthEn, structureEn } from './enPreview'

const CJK_RE = /[\u4e00-\u9fff]/

/** 零 CJK 牙口：任何英文产物含中日韩文字即返回 true（供验收脚本断言） */
export function hasCJK(text: string): boolean {
  return CJK_RE.test(text)
}

function wxEn(w: string): string {
  return ELEMENT_EN[w] ?? ''
}

function levelEn(level: '吉' | '平' | '忌'): 'Favorable' | 'Neutral' | 'Challenging' {
  return level === '吉' ? 'Favorable' : level === '忌' ? 'Challenging' : 'Neutral'
}

// ═══════════════════════════════════════════════════════════════
// 一、合婚英文
// ═══════════════════════════════════════════════════════════════

export interface HemunBriefEn {
  ganZhi: { year: string; month: string; day: string; hour: string }
  dayMaster: string
  strength: string
  structure: string
  yearNaYin: string
}

export interface HemunDimEn {
  key: string
  name: string
  basis: string
  level: 'Favorable' | 'Neutral' | 'Challenging'
  facts: string[]
  tags: string[]
  verdict: string
  citations: string[]
}

export interface HemunRuleEn {
  male: HemunBriefEn
  female: HemunBriefEn
  dimensions: HemunDimEn[]
  overall: string
  grade: string
  gradeLabel: string
  totalScore: number
  keyTags: string[]
  currentLuck: { male: string; female: string; note: string }
}

const DIM_NAME_EN: Record<string, string> = {
  yearZodiac: 'Zodiac pairing',
  yearGanZhi: 'Year pillars',
  nayin: 'Year-pillar Nayin',
  day: 'Day-pillar spouse palace',
  spouse: 'Spouse star',
  wuxing: 'Five Elements and useful-god support',
  palace: 'Marriage-palace stability',
  shishen: 'Ten Gods cross-reading',
  dayun: 'Luck Pillar synchrony',
}

const BASIS_EN: Record<string, string> = {
  典籍: 'Classical texts',
  古法: 'Old method',
  民俗: 'Folk custom',
  产品设定: 'Product model',
}

const CITE_EN: Record<string, string> = {
  年支: 'Zodiac compatibility is a folk custom; a zodiac clash does not mean the couple cannot marry. Synastry weighs the day-pillar spouse palace and the whole chart first; the zodiac is one minor reference.',
  年干: 'Stem combinations and the Five Element generating and controlling cycles are basic Ziping relations, recorded in sources such as Yuan Hai Zi Ping.',
  纳音: 'Nayin synastry belongs to the Tang-Song old method (the Li Xuzhong lineage) and is not a mainstream Ziping criterion.',
  日柱: 'The day branch is the spouse palace; Six Harmony and Six Clash are used to read marriage, as recorded in San Ming Tong Hui and Yuan Hai Zi Ping.',
  配偶: 'In Ziping practice the Wealth star is the wife for a man and the Officer star the husband for a woman.',
  五行: 'Extrapolated from useful-god theory: classical synastry texts do not explicitly teach Five Element complementarity; this dimension applies Ziping favourable-element theory.',
  婚姻: 'A spouse palace under clash is considered unfavourable in Ziping practice.',
  十神: 'In Ziping practice the Wealth star is the wife for a man and the Officer star the husband for a woman.',
  大运: "Classical synastry has no 'synchronised Luck Pillars' criterion; this dimension is a modern product indicator for pacing only.",
}

const NAYIN_EN: Record<string, string> = {
  海中金: 'Pearl-in-Sea Metal', 炉中火: 'Furnace Fire', 大林木: 'Great Forest Wood',
  路旁土: 'Roadside Earth', 剑锋金: 'Sword-Edge Metal', 山头火: 'Mountain-Top Fire',
  涧下水: 'Ravine Water', 城头土: 'City-Wall Earth', 白蜡金: 'White Wax Metal',
  杨柳木: 'Willow Wood', 泉中水: 'Spring Water', 屋上土: 'Rooftop Earth',
  霹雳火: 'Thunderbolt Fire', 松柏木: 'Pine and Cypress Wood', 长流水: 'Long-Flowing Water',
  沙中金: 'Gold in Sand', 山下火: 'Fire at the Mountain Foot', 平地木: 'Level-Ground Wood',
  壁上土: 'Wall Earth', 金箔金: 'Gold Foil Metal', 覆灯火: 'Lamp Fire',
  天河水: 'Heavenly River Water', 大驿土: 'Great Post-Station Earth', 钗钏金: 'Hairpin Metal',
  桑柘木: 'Mulberry Wood', 大溪水: 'Great Stream Water', 沙中土: 'Earth in Sand',
  天上火: 'Heavenly Fire', 石榴木: 'Pomegranate Wood', 大海水: 'Great Sea Water',
}

const TAG_EN: Record<string, string> = {
  生肖六合: 'Zodiac Six Harmony',
  生肖六冲: 'Zodiac Six Clash',
  生肖六害: 'Zodiac Six Harm',
  生肖相刑: 'Zodiac punishment',
  年支带刑: 'Year branch in punishment',
  年干五合: 'Year-stem Five Combination',
  纳音相生相比: 'Nayin generating or matching',
  纳音相克: 'Nayin controlling',
  日干五合: 'Day-stem Five Combination',
  日干相生: 'Day-stem generation',
  日干同类: 'Same Day-stem element',
  日干相克: 'Day-stem control',
  日支六合: 'Day-branch Six Harmony',
  日支六冲: 'Day-branch Six Clash',
  日支六害: 'Day-branch Six Harm',
  日支相刑: 'Day-branch punishment',
  天合地合: 'Heaven and Earth Harmony',
  五行互补: 'Five Element complementarity',
  女为男之财: 'She is his Wealth star',
  男为女之官: 'He is her Officer star',
  相生有情: 'Mutually supportive',
  大运同步皆助: 'Both Luck Pillars supporting',
  大运同步皆耗: 'Both Luck Pillars draining',
  纳音持平: 'Nayin neutral',
}

function tagEn(t: string): string {
  if (TAG_EN[t]) return TAG_EN[t]
  const m = t.match(/^年支半合(.)局$/)
  if (m) return `Year-branch half ${wxEn(m[1])} combination`
  const m2 = t.match(/^日支半合(.)局$/)
  if (m2) return `Day-branch half ${wxEn(m2[1])} combination`
  return 'Noted relationship'
}

const STEM_LOG: Record<string, string> = {
  甲: 'Jia', 乙: 'Yi', 丙: 'Bing', 丁: 'Ding', 戊: 'Wu',
  己: 'Ji', 庚: 'Geng', 辛: 'Xin', 壬: 'Ren', 癸: 'Gui',
}

function stemLabel(s: string): string {
  return STEM_LOG[s] ?? ''
}

function branchLabel(z: string): string {
  return BRANCH_PINYIN[z] ?? ''
}

function briefEn(c: HemunChart): HemunBriefEn {
  return {
    ganZhi: {
      year: ganZhiEn(c.pillars.year.ganZhi),
      month: ganZhiEn(c.pillars.month.ganZhi),
      day: ganZhiEn(c.pillars.day.ganZhi),
      hour: ganZhiEn(c.pillars.hour.ganZhi),
    },
    dayMaster: `${stemLabel(c.dayMaster)} (${STEM_ELEMENT[c.dayMaster] ?? ''})`.trim(),
    strength: strengthEn(c.analysis?.wangShuai || ''),
    structure: structureEn(c.analysis?.geJu || ''),
    yearNaYin: NAYIN_EN[NAYIN_MAP[c.pillars.year.ganZhi]] ?? '',
  }
}

function nayinEn(name: string): string {
  return NAYIN_EN[name] ?? ''
}

/** 合婚英文版：与 hehun 同一套判定分支，只替换文案，条目数逐条对齐 */
export function hehunEn(maleIn: PaipanResult, femaleIn: PaipanResult, now: Date = new Date()): HemunRuleEn {
  const male = maleIn as unknown as HemunChart
  const female = femaleIn as unknown as HemunChart
  const dims: HemunDimEn[] = []
  const keyTags: string[] = []
  let score = 60

  const finish = (d: Omit<HemunDimEn, 'level'> & { level?: 'Favorable' | 'Neutral' | 'Challenging' }) => {
    const level = d.level ?? (d.level ? d.level : 'Neutral')
    dims.push({ ...d, tags: d.tags.map(tagEn), level })
  }

  const levelOf = (delta: number): 'Favorable' | 'Neutral' | 'Challenging' =>
    delta > 0 ? 'Favorable' : delta < 0 ? 'Challenging' : 'Neutral'

  // ── 1. Zodiac pairing ──
  {
    const facts: string[] = [], tags: string[] = []
    let delta = 0
    const mz = male.pillars.year.zhi, fz = female.pillars.year.zhi
    const rel = zhiRelation(mz, fz)
    if (rel.includes('六合')) { delta += 12; tags.push('生肖六合'); facts.push(`The year branches ${branchLabel(mz)} and ${branchLabel(fz)} form a Six Harmony; the zodiac animals support each other`) }
    if (rel.includes('六冲')) { delta -= 10; tags.push('生肖六冲'); facts.push(`The year branches ${branchLabel(mz)} and ${branchLabel(fz)} are in Six Clash; folk tradition reads this as a clash at the family foundation`) }
    if (rel.includes('六害')) { delta -= 6; tags.push('生肖六害'); facts.push(`The year branches ${branchLabel(mz)} and ${branchLabel(fz)} form a Six Harm; folk tradition sees hidden friction`) }
    if (rel.includes('相刑')) { delta -= 8; tags.push('生肖相刑'); facts.push(`The year branches ${branchLabel(mz)} and ${branchLabel(fz)} are in a punitive relationship`) }
    const zhiPair = [mz, fz]
    for (const { group, ju } of SANHE) {
      const hit = group.filter((g) => zhiPair.includes(g))
      if (hit.length === 2) {
        delta += 8
        tags.push(`年支半合${ju}局`)
        facts.push(`The year branches ${hit.map(branchLabel).join(' and ')} form a half ${wxEn(ju)} Three-Harmony combination, with matching temperament`)
      }
    }
    for (const g of XING_GROUP) {
      const hit = g.filter((x) => zhiPair.includes(x))
      if (hit.length === 2) {
        delta -= 8
        tags.push('年支带刑')
        facts.push(`The year branches ${hit.map(branchLabel).join(' and ')} fall into a three-punishment group`)
      }
    }
    if (!rel.length && !tags.length) facts.push(`The year branches ${branchLabel(mz)} and ${branchLabel(fz)} show no clash, harmony, harm or punishment; neutral`)
    const verdict = delta > 0 ? 'The zodiac animals are compatible; folk tradition treats this as affinity and an easy family foundation'
      : delta < 0 ? 'The zodiac animals carry a clash or punishment; folk tradition asks for more adjustment, but this is a minor custom with limited weight'
        : 'No zodiac clash or harmony; folk tradition treats this as an ordinary pairing'
    finish({ key: 'yearZodiac', name: DIM_NAME_EN.yearZodiac, basis: BASIS_EN.民俗, facts, tags, verdict, citations: [CITE_EN.年支], level: levelOf(delta) })
    score += delta
  }

  // ── 2. Year pillars ──
  {
    const facts: string[] = [], tags: string[] = []
    let delta = 0
    const mg = male.pillars.year.gan, fg = female.pillars.year.gan
    if (GAN_HE[mg] === fg) { delta += 4; tags.push('年干五合'); facts.push(`The year stems ${stemLabel(mg)} and ${stemLabel(fg)} form a Five Combination`) }
    else {
      const wmg = GAN_WX[mg], wfg = GAN_WX[fg]
      if (wxSheng(wmg, wfg) || wxSheng(wfg, wmg)) { delta += 3; facts.push(`The year stems ${stemLabel(mg)} (${wxEn(wmg)}) and ${stemLabel(fg)} (${wxEn(wfg)}) generate each other`) }
      else if (wxKe(wmg, wfg) || wxKe(wfg, wmg)) { delta -= 2; facts.push(`The year stems ${stemLabel(mg)} and ${stemLabel(fg)} control each other`) }
      else facts.push(`The year stems ${stemLabel(mg)} and ${stemLabel(fg)} share the same element; neutral`)
    }
    const verdict = delta > 0 ? 'The year stems combine or generate each other; the two original families share a compatible atmosphere'
      : delta < 0 ? 'The year stems control each other; family backgrounds or values may differ, so communication matters'
        : 'The year stems are neutral; nothing notable at the family level'
    finish({ key: 'yearGanZhi', name: DIM_NAME_EN.yearGanZhi, basis: BASIS_EN.典籍, facts, tags, verdict, citations: [CITE_EN.年干], level: levelOf(delta) })
    score += delta
  }

  // ── 3. Nayin ──
  {
    const facts: string[] = [], tags: string[] = []
    let delta = 0
    const mNayin = NAYIN_MAP[male.pillars.year.ganZhi], fNayin = NAYIN_MAP[female.pillars.year.ganZhi]
    const wm = NAYIN_WX[mNayin], wf = NAYIN_WX[fNayin]
    facts.push(`Year-pillar Nayin: male ${nayinEn(mNayin)} (${wxEn(wm)}), female ${nayinEn(fNayin)} (${wxEn(wf)})`)
    if (wm === wf || wxSheng(wm, wf) || wxSheng(wf, wm)) { delta += 4; tags.push('纳音相生相比') }
    else if (wxKe(wm, wf) || wxKe(wf, wm)) { delta -= 4; tags.push('纳音相克') }
    const verdict = delta > 0 ? 'The Nayin elements generate or match; the old method reads this as compatible life qi'
      : delta < 0 ? 'The Nayin elements control each other; the old method reads this as qi in conflict, but Nayin is a Tang-Song method and only a reference'
        : 'The Nayin elements are neutral; nothing notable in the old method'
    finish({ key: 'nayin', name: DIM_NAME_EN.nayin, basis: BASIS_EN.古法, facts, tags, verdict, citations: [CITE_EN.纳音], level: levelOf(delta) })
    score += delta
  }

  // ── 4. Day pillar spouse palace ──
  {
    const facts: string[] = [], tags: string[] = []
    let delta = 0
    const md = male.pillars.day, fd = female.pillars.day
    let ganTag = ''
    if (GAN_HE[md.gan] === fd.gan) { delta += 10; ganTag = '日干五合'; facts.push(`The day stems ${stemLabel(md.gan)} and ${stemLabel(fd.gan)} form a Five Combination; yin and yang in accord`) }
    else {
      const wm = GAN_WX[md.gan], wf = GAN_WX[fd.gan]
      if (wxSheng(wm, wf) || wxSheng(wf, wm)) { delta += 6; ganTag = '日干相生'; facts.push(`The day stems ${stemLabel(md.gan)} (${wxEn(wm)}) and ${stemLabel(fd.gan)} (${wxEn(wf)}) generate each other, giving mutual warmth`) }
      else if (wm === wf) { delta += 3; ganTag = '日干同类'; facts.push(`Both day stems are ${wxEn(wm)}; similar temperaments`) }
      else if (wxKe(wm, wf) || wxKe(wf, wm)) { delta -= 4; ganTag = '日干相克'; facts.push(`The day stems ${stemLabel(md.gan)} and ${stemLabel(fd.gan)} control each other; temperaments need adjustment`) }
    }
    if (ganTag) tags.push(ganTag)
    const rel = zhiRelation(md.zhi, fd.zhi)
    let zhiTag = ''
    if (rel.includes('六合')) { delta += 10; zhiTag = '日支六合'; facts.push(`The day branches (spouse palaces) ${branchLabel(md.zhi)} and ${branchLabel(fd.zhi)} form a Six Harmony`) }
    if (rel.includes('六冲')) { delta -= 10; zhiTag = '日支六冲'; facts.push(`The spouse palaces ${branchLabel(md.zhi)} and ${branchLabel(fd.zhi)} are in Six Clash; values and daily rhythms can oppose each other`) }
    if (rel.includes('六害')) { delta -= 6; zhiTag = '日支六害'; facts.push(`The spouse palaces ${branchLabel(md.zhi)} and ${branchLabel(fd.zhi)} form a Six Harm`) }
    if (rel.includes('相刑')) { delta -= 8; zhiTag = '日支相刑'; facts.push(`The spouse palaces ${branchLabel(md.zhi)} and ${branchLabel(fd.zhi)} are in a punitive relationship`) }
    for (const { group, ju } of SANHE) {
      const hit = group.filter((g) => [md.zhi, fd.zhi].includes(g))
      if (hit.length === 2) {
        delta += 7
        zhiTag = `日支半合${ju}局`
        facts.push(`The spouse palaces ${hit.map(branchLabel).join(' and ')} form a half ${wxEn(ju)} combination`)
      }
    }
    for (const g of XING_GROUP) {
      const hit = g.filter((x) => [md.zhi, fd.zhi].includes(x))
      if (hit.length === 2) {
        delta -= 8
        zhiTag = '日支带刑'
        facts.push(`The spouse palaces ${hit.map(branchLabel).join(' and ')} fall into a three-punishment group`)
      }
    }
    if (zhiTag) tags.push(zhiTag)
    if (!zhiTag) facts.push(`The day branches ${branchLabel(md.zhi)} and ${branchLabel(fd.zhi)} show no clash or harmony; neutral`)
    if (ganTag === '日干五合' && zhiTag === '日支六合') {
      delta += 8
      tags.push('天合地合')
      keyTags.push('天合地合')
      facts.push('Heaven and Earth Harmony: the day stems form a Five Combination and the day branches a Six Harmony; classical synastry treats this as a top-grade match')
    }
    const verdict = tags.includes('天合地合') ? 'Heaven and Earth Harmony: the spouse palaces meet deeply, a top-grade match in classical synastry'
      : delta > 0 ? 'The spouse palaces combine or generate each other; temperament and intimacy coordinate easily'
        : delta < 0 ? 'The spouse palace carries a clash or punishment; deep values and habits need adjustment and patience'
          : 'The spouse palace is neutral; nothing notable in intimacy'
    finish({ key: 'day', name: DIM_NAME_EN.day, basis: BASIS_EN.典籍, facts, tags, verdict, citations: [CITE_EN.日柱], level: levelOf(delta) })
    score += delta
  }

  // ── 5. Spouse star ──
  {
    const facts: string[] = [], tags: string[] = []
    let delta = 0
    const starCheck = (c: HemunChart, isMale: boolean) => {
      const dm = c.dayMaster
      const ps = [c.pillars.year, c.pillars.month, c.pillars.hour]
      const dayCang = [c.pillars.day.zhi]
      const want = (g: string) => {
        const tg = crossTenGod(dm, g)
        return isMale ? tg.includes('财') : tg.includes('官')
      }
      const tou = ps.filter((p) => want(p.gan)).map((p) => p.gan)
      const inGong = dayCang.filter(want)
      const starName = isMale ? 'Wealth star (spouse star)' : 'Officer star (spouse star)'
      const owner = isMale ? 'Male' : 'Female'
      if (tou.length) { delta += 5; facts.push(`The ${owner.toLowerCase()} chart's ${starName} (${tou.map(stemLabel).join(', ')}) is exposed at the stem level; the spouse star is clear`) }
      if (inGong.length) { delta += 5; facts.push(`The ${owner.toLowerCase()} spouse palace sits on the ${starName}; the spouse star occupies its own palace`) }
      if (!tou.length && !inGong.length) {
        const CANG: Record<string, string[]> = {
          子: ['癸'], 丑: ['己', '癸', '辛'], 寅: ['甲', '丙', '戊'], 卯: ['乙'],
          辰: ['戊', '乙', '癸'], 巳: ['丙', '庚', '戊'], 午: ['丁', '己'], 未: ['己', '丁', '乙'],
          申: ['庚', '壬', '戊'], 酉: ['辛'], 戌: ['戊', '辛', '丁'], 亥: ['壬', '甲'],
        }
        const hidden = [c.pillars.year, c.pillars.month, c.pillars.hour, c.pillars.day]
          .some((p) => (CANG[p.zhi] || []).some(want))
        if (hidden) { delta += 2; facts.push(`The ${owner.toLowerCase()} chart's ${starName} is hidden rather than exposed; the partner theme is more reserved`) }
        else { delta -= 5; facts.push(`The ${owner.toLowerCase()} chart has no ${starName} anywhere; the partner theme is faint and needs conscious effort`) }
      }
    }
    starCheck(male, true)
    starCheck(female, false)
    {
      const maleCai = Object.entries(WX_SHENG).find(([, v]) => WX_SHENG[v] === GAN_WX[male.dayMaster])![0]
      const femaleGuan = Object.entries(WX_SHENG).find(([, v]) => WX_SHENG[GAN_WX[female.dayMaster]] === v)![0]
      const fCnt = wuxingCount(female), mCnt = wuxingCount(male)
      if (fCnt[maleCai] >= 2) { delta += 4; facts.push(`The female chart's ${wxEn(maleCai)} is strong (${fCnt[maleCai]}/8), supporting the male chart's spouse star`) }
      if (mCnt[femaleGuan] >= 2) { delta += 4; facts.push(`The male chart's ${wxEn(femaleGuan)} is strong (${mCnt[femaleGuan]}/8), supporting the female chart's spouse star`) }
    }
    const verdict = delta >= 5 ? 'The spouse stars are clear and each partner holds their own role; the bond runs deep'
      : delta > 0 ? 'The spouse star is placed or supported by the other chart; affinity is fair'
        : 'The spouse star is weak or unclear; the relationship needs conscious effort'
    finish({ key: 'spouse', name: DIM_NAME_EN.spouse, basis: BASIS_EN.典籍, facts, tags, verdict, citations: [CITE_EN.配偶], level: levelOf(delta) })
    score += delta
  }

  // ── 6. Five element complementarity ──
  {
    const facts: string[] = [], tags: string[] = []
    let delta = 0
    const mCnt = wuxingCount(male), fCnt = wuxingCount(female)
    const wxList = ['木', '火', '土', '金', '水']
    facts.push(`Male chart element count: ${wxList.map((w) => `${wxEn(w)} ${mCnt[w]}`).join(', ')}`)
    facts.push(`Female chart element count: ${wxList.map((w) => `${wxEn(w)} ${fCnt[w]}`).join(', ')}`)
    let bu = 0
    for (const w of wxList) {
      if (mCnt[w] <= 1 && fCnt[w] >= 3) { bu++; facts.push(`Male chart ${wxEn(w)} is weak; female chart ${wxEn(w)} is strong (${fCnt[w]}/8) and can compensate`) }
      if (fCnt[w] <= 1 && mCnt[w] >= 3) { bu++; facts.push(`Female chart ${wxEn(w)} is weak; male chart ${wxEn(w)} is strong (${mCnt[w]}/8) and can compensate`) }
    }
    delta += Math.min(bu, 4) * 3
    if (bu) tags.push('五行互补')
    const helpCheck = (self: HemunChart, other: HemunChart, label: string) => {
      const fav = favorableWuxing(self)
      const cnt = wuxingCount(other)
      const n = fav.add.reduce((s, w) => s + cnt[w], 0)
      if (n >= 5) { delta += 6; facts.push(`${label} favours ${fav.add.map(wxEn).join(', ')}; the other chart contains ${n}/8, giving direct support`) }
    }
    helpCheck(male, female, 'Male chart')
    helpCheck(female, male, 'Female chart')
    if (!bu && !tags.some((t) => t.includes('喜用'))) facts.push('No clear element gap between the two charts, and no serious imbalance')
    const verdict = bu > 0 ? 'Five Element complementarity: what one lacks the other supplies, so the couple can support each other'
      : delta > 0 ? 'Each chart supplies elements the other favours; the partner adds what is needed'
        : 'No clear element complementarity; each has its own strengths, so learn from each other'
    finish({ key: 'wuxing', name: DIM_NAME_EN.wuxing, basis: BASIS_EN.典籍, facts, tags, verdict, citations: [CITE_EN.五行], level: levelOf(delta) })
    score += delta
  }

  // ── 7. Marriage palace stability ──
  {
    const facts: string[] = [], tags: string[] = []
    let delta = 0
    const gongCheck = (c: HemunChart, isMale: boolean) => {
      const dz = c.pillars.day.zhi
      const others = [c.pillars.year.zhi, c.pillars.month.zhi, c.pillars.hour.zhi]
      const owner = isMale ? 'Male' : 'Female'
      let bad = 0
      for (const z of others) {
        const rel = zhiRelation(dz, z)
        if (rel.includes('六冲')) { bad -= 6; facts.push(`The ${owner.toLowerCase()} spouse palace ${branchLabel(dz)} is clashed by ${branchLabel(z)}; the natal marriage palace is under clash`) }
      }
      const he = others.filter((z) => ZHI_LIUHE[dz] === z).length
      if (he) { bad -= 2; facts.push(`The ${owner.toLowerCase()} spouse palace ${branchLabel(dz)} is combined by another branch; boundaries after marriage need attention`) }
      if (bad === 0 && !he) facts.push(`The ${owner.toLowerCase()} spouse palace ${branchLabel(dz)} has no clash or combination in the natal chart; the foundation is stable`)
      delta += bad
    }
    gongCheck(male, true)
    gongCheck(female, false)
    const verdict = delta === 0 ? 'Both marriage palaces are stable in the natal charts; the emotional foundation is firm'
      : delta > -4 ? 'The marriage palaces have minor ripples; occasional ups and downs, nothing serious'
        : 'One or both marriage palaces are under clash; the relationship needs careful protection'
    finish({ key: 'palace', name: DIM_NAME_EN.palace, basis: BASIS_EN.典籍, facts, tags, verdict, citations: [CITE_EN.婚姻], level: levelOf(delta) })
    score += delta
  }

  // ── 8. Ten Gods cross-reading ──
  {
    const facts: string[] = [], tags: string[] = []
    let delta = 0
    const mSeesF = crossTenGod(male.dayMaster, female.dayMaster)
    const fSeesM = crossTenGod(female.dayMaster, male.dayMaster)
    facts.push(`Reading the female chart from the male Day Master: she is his "${TEN_GOD_EN[mSeesF] ?? ''}"`)
    facts.push(`Reading the male chart from the female Day Master: he is her "${TEN_GOD_EN[fSeesM] ?? ''}"`)
    if (mSeesF.includes('财')) { delta += 4; tags.push('女为男之财') }
    if (fSeesM.includes('官')) { delta += 4; tags.push('男为女之官') }
    if (mSeesF.includes('印') || fSeesM.includes('印')) { delta += 2; tags.push('相生有情') }
    const verdict = (mSeesF.includes('财') && fSeesM.includes('官')) ? 'She is his Wealth star and he is her Officer star: the most fitting Ten God pairing'
      : (mSeesF.includes('财') || fSeesM.includes('官')) ? 'One partner is the other\'s destined star; the Ten God relation fits'
        : (mSeesF.includes('印') || fSeesM.includes('印')) ? 'One partner is the other\'s Resource star; mutual support in daily life'
          : 'The Day Master Ten God relation is not a classic pairing; depth depends on the other dimensions'
    finish({ key: 'shishen', name: DIM_NAME_EN.shishen, basis: BASIS_EN.典籍, facts, tags, verdict, citations: [CITE_EN.十神], level: levelOf(delta) })
    score += delta
  }

  // ── 9. Luck Pillar synchrony ──
  {
    const facts: string[] = [], tags: string[] = []
    let delta = 0
    const year = now.getFullYear()
    const mDy = currentDaYun(male, year), fDy = currentDaYun(female, year)
    const infoEn = (info: string) => info === '助运' ? 'supporting' : info === '耗运' ? 'draining' : 'neutral'
    if (mDy && fDy) {
      facts.push(`Male currently runs the ${ganZhiEn(mDy.ganZhi)} (${infoEn(mDy.info)}) Luck Pillar; female runs the ${ganZhiEn(fDy.ganZhi)} (${infoEn(fDy.info)})`)
      if (mDy.info === '助运' && fDy.info === '助运') { delta += 4; tags.push('大运同步皆助') }
      else if (mDy.info === '耗运' && fDy.info === '耗运') { delta -= 4; tags.push('大运同步皆耗') }
      else facts.push('The two partners are on one supporting and one neutral or draining pillar; rhythms are slightly out of step, so mutual support helps')
    } else facts.push('Luck Pillar data is incomplete; the synchrony check is skipped')
    const verdict = delta > 0 ? 'Both partners are on supporting pillars; the rhythms align, a good time to move forward together'
      : delta < 0 ? 'Both partners are on draining pillars; the rhythms align but both are working hard, so support each other'
        : 'The two partners\' timelines are slightly offset; mutual patience and support matter'
    finish({ key: 'dayun', name: DIM_NAME_EN.dayun, basis: BASIS_EN.产品设定, facts, tags, verdict, citations: [CITE_EN.大运], level: levelOf(delta) })
    score += delta
  }

  const totalScore = Math.max(0, Math.min(100, Math.round(score)))
  const grade = totalScore >= 85 ? 'An excellent match'
    : totalScore >= 75 ? 'A strong match'
      : totalScore >= 65 ? 'A good match'
        : totalScore >= 55 ? 'An average match; needs work'
          : 'Many ups and downs; needs tolerance'
  const gradeLabel = `Synastry score ${totalScore} / 100 — ${grade}`

  const dimsForOverall = dims.filter((d) => d.key !== 'dayun')
  const ji = dimsForOverall.filter((d) => d.level === 'Favorable').length
  const ji2 = dimsForOverall.filter((d) => d.level === 'Challenging').length
  const n = dimsForOverall.length
  const r = n ? ji / n : 0
  const overall = r >= 0.7 && ji2 <= 1 ? 'Strongly complementary and closely matched'
    : r >= 0.55 ? 'Broadly coordinated, with strengths in the majority'
      : ji2 / n >= 0.55 ? 'Significant differences; needs careful effort'
        : ji >= ji2 ? 'More favourable than unfavourable; communication is the key'
          : 'Each has strengths and weaknesses; the work is in mutual adjustment'

  const year2 = now.getFullYear()
  const mDy2 = currentDaYun(male, year2), fDy2 = currentDaYun(female, year2)
  const luckLabel = (d: { ganZhi: string; info: string } | null) =>
    d ? `${ganZhiEn(d.ganZhi)} · ${d.info === '助运' ? 'supporting' : d.info === '耗运' ? 'draining' : 'neutral'}` : '—'

  return {
    male: briefEn(male),
    female: briefEn(female),
    dimensions: dims,
    overall,
    grade,
    gradeLabel,
    totalScore,
    keyTags: keyTags.map(tagEn),
    currentLuck: {
      male: luckLabel(mDy2),
      female: luckLabel(fDy2),
      note: "Support and drain are judged from each chart's strength and favourable elements; pacing reference only.",
    },
  }
}

// ═══════════════════════════════════════════════════════════════
// 二、紫微英文
// ═══════════════════════════════════════════════════════════════

const PALACE_EN: Record<string, string> = {
  命宫: 'Life', 兄弟: 'Siblings', 夫妻: 'Spouse', 子女: 'Children',
  财帛: 'Wealth', 疾厄: 'Health', 迁移: 'Travel', 仆役: 'Friends',
  官禄: 'Career', 田宅: 'Property', 福德: 'Fortune', 父母: 'Parents',
}

const STAR_EN: Record<string, string> = {
  紫微: 'Purple Star', 天机: 'Heavenly Machine', 太阳: 'Sun', 武曲: 'Martial Song',
  天同: 'Heavenly Joy', 廉贞: 'Integrity Star', 天府: 'Heavenly Treasury', 太阴: 'Moon',
  贪狼: 'Greedy Wolf', 巨门: 'Giant Gate', 天相: 'Heavenly Minister', 天梁: 'Heavenly Beam',
  七杀: 'Seven Killing', 破军: 'Broken Army',
  文昌: 'Literary Prosperity', 文曲: 'Literary Curve', 左辅: 'Left Assistant', 右弼: 'Right Assistant',
  天魁: 'Heavenly Leader', 天钺: 'Heavenly Advisor', 禄存: 'Wealth Storage', 天马: 'Heavenly Horse',
  擎羊: 'Goat Blade', 陀罗: 'Spinning Top', 火星: 'Mars', 铃星: 'Bell Star',
  地空: 'Sky Void', 地劫: 'Earth Robbery',
  红鸾: 'Red Phoenix', 天喜: 'Heavenly Delight', 咸池: 'Salty Pool', 天姚: 'Heavenly Charm',
  华盖: 'Canopy', 孤辰: 'Lonely Star', 寡宿: 'Solitary Star', 截空: 'Intercept Void', 旬空: 'Decade Void',
}

const BRIGHT_EN: Record<string, string> = {
  庙: 'Exalted', 旺: 'Strong', 得: 'Favourable', 利: 'Useful',
  平: 'Neutral', 不得: 'Weak', 不: 'Weak', 陷: 'Fallen',
}

const MUTAGEN_EN: Record<string, string> = { 禄: 'Lu (Wealth)', 权: 'Quan (Power)', 科: 'Ke (Fame)', 忌: 'Ji (Obstruction)' }

// Twelve growth stages shown in the palace detail. Same twelve entries as the Chinese tree.
const CHANGSHENG_EN: Record<string, string> = {
  长生: 'Birth', 沐浴: 'Bath', 冠带: 'Capping', 临官: 'Office', 帝旺: 'Peak', 衰: 'Decline',
  病: 'Illness', 死: 'Death', 墓: 'Tomb', 绝: 'Extinction', 胎: 'Conception', 养: 'Nurture',
}

const PATTERN_EN: Record<string, { name: string; note: string }> = {
  紫府同宫格: { name: 'Purple Star and Treasury in the Life Palace', note: 'Purple Star with Heavenly Treasury: nobility with stability, career and family both secure.' },
  紫微七杀格: { name: 'Purple Star with Seven Killing', note: 'Power is harnessed into authority: firm yet flexible, a commanding talent with strong ambition.' },
  紫微贪狼格: { name: 'Purple Star with Greedy Wolf', note: 'Romance governs the ruler: versatile and socially skilled, but guard against appetite and indulgence.' },
  紫微破军格: { name: 'Purple Star with Broken Army', note: 'The ruler rests while the general labours: bold reform, exceptional daring, success through upheaval.' },
  紫相朝垣格: { name: 'Purple Star with Heavenly Minister', note: 'Steady and reliable with benefactor support; suited to public service and management.' },
  武贪同行格: { name: 'Martial Song with Greedy Wolf', note: 'Late blooming with many skills; success usually arrives after thirty.' },
  巨机同临格: { name: 'Giant Gate with Heavenly Machine', note: 'Eloquent and strategic; best built on speech and intellect.' },
  廉贞贪狼格: { name: 'Integrity Star with Greedy Wolf', note: 'An artistic and romantic pattern: charming and talented, but self-restraint is needed.' },
  廉贞七杀格: { name: 'Integrity Star with Seven Killing', note: 'Strong drive and endurance; suited to technical or disciplined fields, with attention to safety.' },
  日月并明格: { name: 'Sun and Moon Both Bright', note: 'Sun and Moon both bright in one palace: yin and yang balanced, fame and profit together.' },
  日月反背格: { name: 'Sun and Moon Reversed', note: 'Sun and Moon both fallen: hard work and thin family ties; cultivate integrity and act within capacity.' },
  日月同宫格: { name: 'Sun and Moon Together', note: 'Sun and Moon share the palace: a many-sided character; fortune depends on brightness and transformations.' },
  同梁巳亥格: { name: 'Heavenly Joy with Beam in Si or Hai', note: 'Gentle and kind, turning misfortune into fortune; guard against complacency.' },
  同阴格: { name: 'Heavenly Joy with Moon', note: 'Tender and refined with abundant blessing; especially graceful for women.' },
  英星入庙格: { name: 'Broken Army Exalted', note: 'Broken Army exalted in Zi or Wu: bold action and great undertakings.' },
  石中隐玉格: { name: 'Jade Hidden in Stone', note: 'Giant Gate in Zi or Wu: difficulty first, prominence later; fame through speech or expertise.' },
  杀破狼格: { name: 'Seven Killing, Broken Army and Greedy Wolf', note: 'A life of change and pioneering, never mediocre; opportunity and risk come together.' },
  机月同梁格: { name: 'Machine, Moon, Joy and Beam', note: 'The trine gathers Machine, Moon, Joy and Beam: steady planning; suited to public service, planning and advisory roles.' },
  紫府朝垣格: { name: 'Purple Star and Treasury Facing the Palace', note: 'Purple Star and Treasury support from the trine: noble structure and a high career level.' },
  府相朝垣格: { name: 'Treasury and Minister Facing the Palace', note: 'Treasury and Minister support from the trine: stability, sufficiency and many helpers.' },
  阳梁昌禄格: { name: 'Sun, Beam, Literary Prosperity and Lu', note: 'Excellent exam and academic luck; distinction through letters.' },
  火贪格: { name: 'Mars with Greedy Wolf', note: 'Sudden windfall; guard against sudden loss.' },
  铃贪格: { name: 'Bell Star with Greedy Wolf', note: 'Late breakthrough and unconventional fame.' },
  左右守命格: { name: 'Left and Right Assistants in the Life Palace', note: 'Much help and a stable career.' },
  昌曲同宫格: { name: 'Literary Prosperity and Literary Curve', note: 'Clever, studious and artistic.' },
  魁钺守命格: { name: 'Heavenly Leader and Advisor in the Life Palace', note: 'Benefactors lift you and misfortune turns into fortune.' },
  羊陀守命: { name: 'Goat Blade and Spinning Top in the Life Palace', note: 'Principled but conflicted; mind relationships and physical injuries.' },
  擎羊守命: { name: 'Goat Blade in the Life Palace', note: 'Decisive and firm; guard against sharp words and metal injuries.' },
  陀罗守命: { name: 'Spinning Top in the Life Palace', note: 'Second-guessing and delay; act decisively to avoid inner friction.' },
  火铃守命: { name: 'Mars and Bell Star in the Life Palace', note: 'Intense and quick-tempered with explosive energy; train calm.' },
  火星守命: { name: 'Mars in the Life Palace', note: 'Impatient and direct; channel speed into action.' },
  铃星守命: { name: 'Bell Star in the Life Palace', note: 'Reserved with inner fire; express emotions healthily.' },
  马头带箭格: { name: 'Arrow at the Horse’s Head', note: 'Goat Blade in the Wu palace: authority and achievement, but also hard travel and toil.' },
  空劫守命: { name: 'Sky Void and Earth Robbery in the Life Palace', note: 'High ideals and volatile money; build on skills and avoid speculation.' },
  日月夹命格: { name: 'Sun and Moon Flanking the Life Palace', note: 'Balance and noble support, with help from elders.' },
  辅弼夹命格: { name: 'Assistants Flanking the Life Palace', note: 'Much assistance and support from others.' },
  昌曲夹命格: { name: 'Literary Stars Flanking the Life Palace', note: 'Clever, studious and outstandingly talented.' },
  魁钺夹命格: { name: 'Noble Stars Flanking the Life Palace', note: 'Benefactors appear and misfortune turns into fortune.' },
  火铃夹命格: { name: 'Mars and Bell Star Flanking the Life Palace', note: 'Drive and intensity; guard against impatience.' },
  空劫夹命格: { name: 'Void and Robbery Flanking the Life Palace', note: 'Lofty ideals but volatile money; build steadily.' },
  命无主星: { name: 'No Major Star in the Life Palace', note: 'Borrow the opposite palace; adaptable and strongly shaped by environment.' },
  平和守成之局: { name: 'Balanced and Conservative', note: 'No great pattern and no great break; steady progress through quiet effort.' },
}

const SINGLE_STAR_NOTE_EN: Record<string, string> = {
  紫微: 'The emperor star in the Life Palace: dignified and ambitious, with leadership ability; guard against aloofness.',
  天机: 'The machine star: clever and strategic, quick-minded; guard against overthinking and restlessness.',
  太阳: 'The sun: warm, generous and upright; strong when bright, suited to public service and social life.',
  武曲: 'Martial Song: resolute and practical, good with money; guard against rigidity and isolation.',
  天同: 'Heavenly Joy: gentle and fortunate, valuing feeling and comfort; guard against laziness.',
  廉贞: 'Integrity Star: capable and strong-willed, a secondary romance star; guard against temper and entanglement.',
  天府: 'Heavenly Treasury: steady and tolerant, with ample reserves; a life of stability.',
  太阴: 'The moon: gentle and refined, family-minded; strong when bright, favouring property and wealth.',
  贪狼: 'Greedy Wolf: versatile and desirous, socially skilled; guard against over-reaching.',
  巨门: 'Giant Gate: articulate and analytical; guard against gossip and disputes.',
  天相: 'Heavenly Minister: upright and careful, a seal star that helps others; often meets benefactors.',
  天梁: 'Heavenly Beam: mature and upright, a sheltering star that turns misfortune into fortune; suited to public service and education.',
  七杀: 'Seven Killing: strong and decisive, independent and pioneering; guard against isolation and risk.',
  破军: 'Broken Army: breaks the old and builds the new, daring and responsible; success through change.',
}

const PALACE_TAG_EN: Record<string, string> = {
  '化禄·顺遂': 'Lu transformation: smooth',
  '化权·掌权': 'Quan transformation: authority',
  '化科·名声': 'Ke transformation: reputation',
  '化忌·阻滞': 'Ji transformation: obstruction',
  '空宫借对': 'Empty palace, borrows the opposite',
  '禄存·稳守': 'Wealth Storage: steady',
  '天马·动象': 'Heavenly Horse: movement',
  '桃花喜曜': 'Romance stars: attraction',
  '空劫·波动': 'Void and Robbery: fluctuation',
  '羊陀·磨砺': 'Goat Blade and Spinning Top: friction',
  '火铃·急躁': 'Mars and Bell Star: impatience',
  '星曜得地': 'Stars well placed',
  '星曜落陷': 'Stars fallen',
}

function palaceTagEn(t: string): string {
  if (PALACE_TAG_EN[t]) return PALACE_TAG_EN[t]
  const ji = t.match(/^吉星:(.*)$/)
  if (ji) return `Auspicious stars: ${ji[1].split('、').map(starEn).join(', ')}`
  const sha = t.match(/^煞星:(.*)$/)
  if (sha) return `Inauspicious stars: ${sha[1].split('、').map(starEn).join(', ')}`
  return 'Noted condition'
}

function starEn(name: string): string {
  return STAR_EN[name] ?? 'Auxiliary star'
}

function palaceEn(name: string): string {
  return PALACE_EN[name] ?? 'Palace'
}

function parseStarToken(token: string): string {
  const m = token.match(/^(.+?)(?:\(([^)]*)\))?(?:·化(.)?)?$/)
  if (!m) return ''
  const star = starEn(m[1])
  const parts: string[] = [star]
  if (m[2] && BRIGHT_EN[m[2]]) parts.push(`(${BRIGHT_EN[m[2]]})`)
  if (m[3] && MUTAGEN_EN[m[3]]) parts.push(`· ${MUTAGEN_EN[m[3]]}`)
  return parts.join(' ')
}

function rangeEn(range: string): string {
  const m = range.match(/(\d+)-(\d+)岁/)
  return m ? `ages ${m[1]}-${m[2]}` : ''
}

const TRANSFORM_NOTE_EN: Record<string, [string, string, string, string]> = {
  命宫: ['A smooth, well-rounded personality with abundant good fortune', 'Strong opinions and a capacity to lead and control', 'A good reputation with measured behaviour', 'An anxious, self-limiting streak'],
  兄弟: ['Close bonds with siblings and friends', 'Respected among peers', 'Harmonious and well-regarded friendships', 'Thin sibling and friend ties with money friction'],
  夫妻: ['A well-placed partner and a smooth relationship', 'A strong-willed partner; communication matters', 'A refined, reputable partner and calm relations', 'Emotional ups and downs that need patience'],
  子女: ['Warm ties with children and lively romance', 'Independent, strong-willed children', 'Studious, well-regarded children', 'Worry over children and weak partnership luck'],
  财帛: ['Wealth flows smoothly', 'A strong earning drive and control over money', 'Reputation supports earnings', 'Money pressure and delays'],
  疾厄: ['Good health and quick recovery', 'A strong constitution; watch overwork', 'Minor ailments resolve with care', 'Health needs steady attention'],
  迁移: ['Smooth travel and opportunities away from home', 'Respected when away from home', 'A good reputation abroad', 'Travel is bumpy; stay put rather than rush'],
  仆役: ['Helpful friends and subordinates', 'Authority over a team', 'A good name among peers', 'Friction with friends and staff'],
  官禄: ['Career advances smoothly', 'Authority and control at work', 'A professional reputation', 'Career obstacles and delays'],
  田宅: ['Property and family fortune grow', 'Control over property and household', 'A good name for the household', 'Property and family matters need care'],
  福德: ['Contentment and enjoyment', 'Strong inner drive', 'Refined tastes and a good name', 'Inner worry and restlessness'],
  父母: ['Support from parents and elders', 'Strong, strict parents', 'Parents of good standing', 'Distance or friction with parents'],
}

const PATTERN_REQ_EXACT: Record<string, string> = {
  二星皆庙旺: 'both stars exalted or strong',
  二星皆落陷: 'both stars fallen',
  有化禄同会: 'a Lu transformation also meets the trine',
  紫微天府不在命宫同守: 'Purple Star and Treasury are not both in the Life Palace',
  命宫有七杀或破军或贪狼: 'the Life Palace holds Seven Killing, Broken Army or Greedy Wolf',
  命宫居杀破狼则不入此格: 'the Life Palace in the Seven Killing set breaks this pattern',
  煞星同宫则桃花带忌: 'inauspicious stars in the palace turn romance into trouble',
  火星铃星同宫则转火贪格: 'Mars or Bell Star in the palace turns it into the Mars-Greedy Wolf pattern',
  逢煞星则桃花带忌: 'inauspicious stars turn romance into trouble',
  逢地空地劫则横发横破: 'Sky Void or Earth Robbery brings sudden gain and sudden loss',
  命宫无十四主星: 'the Life Palace has no major star',
  未被组合格局覆盖: 'no combined pattern covers the palace',
  命宫无特殊格局亦无煞星: 'no special pattern and no inauspicious star',
}

function patternReqEn(s: string): string {
  if (PATTERN_REQ_EXACT[s]) return PATTERN_REQ_EXACT[s]
  let m = s.match(/^(.+?)与(.+?)同守命宫$/)
  if (m) return `${starEn(m[1])} and ${starEn(m[2])} share the Life Palace`
  m = s.match(/^(.+?)与(.+?)分居命宫前后两宫$/)
  if (m) return `${starEn(m[1])} and ${starEn(m[2])} flank the Life Palace`
  m = s.match(/^(.+?)与(.+?)同宫于三方四正$/)
  if (m) return `${starEn(m[1])} and ${starEn(m[2])} share a palace in the trine`
  m = s.match(/^(.+?)与(.+?)同守命宫/)
  if (m) return `${starEn(m[1])} and ${starEn(m[2])} in the Life Palace`
  m = s.match(/^(.+?)独守命宫$/)
  if (m) return `${starEn(m[1])} alone in the Life Palace`
  m = s.match(/^(.+?)守命宫$/)
  if (m) return `${starEn(m[1])} in the Life Palace`
  m = s.match(/^命宫在(.)或(.)$/)
  if (m) return `Life Palace in ${branchEn(m[1])} or ${branchEn(m[2])}`
  m = s.match(/^三方四正会齐(.+)$/)
  if (m) return `the trine and opposite palaces gather ${m[1].split('、').map(starEn).join(', ')}`
  m = s.match(/^三方四正会(.+)$/)
  if (m) return `the trine and opposite palaces meet ${m[1].split('、').map(starEn).join(', ')}`
  return 'the structural condition is met'
}

function patternNoteEn(name: string, zhNote: string, level: '吉' | '平' | '忌'): string {
  if (PATTERN_EN[name]) return PATTERN_EN[name].note
  const m = name.match(/^(.+)守命格$/)
  if (m && SINGLE_STAR_NOTE_EN[m[1]]) {
    const parts = [SINGLE_STAR_NOTE_EN[m[1]]]
    const bright = zhNote.match(/星曜([庙旺得利平不陷])/)
    if (bright && BRIGHT_EN[bright[1]]) parts.push(`Brightness: ${BRIGHT_EN[bright[1]]}.`)
    const mut = zhNote.match(/又逢化(.)/)
    if (mut && MUTAGEN_EN[mut[1]]) parts.push(`It also meets the ${MUTAGEN_EN[mut[1]]} transformation.`)
    return parts.join(' ')
  }
  return level === '吉' ? 'A supportive structural pattern.' : level === '忌' ? 'A challenging structural pattern.' : 'A mixed structural pattern.'
}

export interface ZiweiStarReadEn {
  name: string
  empty: boolean
  stars: string[]
  auspicious: string[]
  ominous: string[]
  tags: string[]
}

export interface ZiweiPeriodEn {
  title: string
  ganZhi: string
  basePalace: string
  range: string
  stars: string[]
  transforms: string[]
  tags: string[]
}

export interface ZiweiRuleEn {
  header: {
    solarDate: string
    lunarDate: string
    zodiac: string
    sign: string
    fiveElementsClass: string
    soul: string
    body: string
    birthHour: string
    gender: string
  }
  score: number
  scoreLabel: string
  patterns: Array<{
    name: string
    level: 'Favorable' | 'Neutral' | 'Challenging'
    note: string
    required: string[]
    bonus: string[]
    breaking: string[]
    source: string
    basisLevel: string
  }>
  transforms: Array<{ star: string; type: string; palace: string; note: string }>
  /** Palace grid for the shared 4×4 chart (same order as chart.palaces). */
  grid: Array<{
    name: string
    ganZhi: string
    empty: boolean
    majorStars: Array<{ name: string; brightness: string; mutagen: string }>
    minorStars: string[]
    adjectiveStars: string[]
    isBodyPalace: boolean
    changsheng12: string
    decadalRange: [number, number]
  }>
  palaces: ZiweiStarReadEn[]
  decadal: ZiweiPeriodEn
  yearly: ZiweiPeriodEn
  monthly: ZiweiPeriodEn | null
  xiaoxian: { nominalAge: number; basePalace: string; ganZhi: string }
  selfMutations: Array<{ palace: string; ganZhi: string; mutagens: string[] }>
  laiYinPalace: string
}

const SIGN_EN: Record<string, string> = {
  白羊座: 'Aries', 金牛座: 'Taurus', 双子座: 'Gemini', 巨蟹座: 'Cancer',
  狮子座: 'Leo', 处女座: 'Virgo', 天秤座: 'Libra', 天蝎座: 'Scorpio',
  射手座: 'Sagittarius', 摩羯座: 'Capricorn', 水瓶座: 'Aquarius', 双鱼座: 'Pisces',
}

const SCORE_LABEL_EN: Record<string, string> = {
  上格之命: 'A high-grade chart',
  中上格局: 'A good upper-middle chart',
  格局稳健: 'A steady structure',
  '格局平常，宜经营': 'An ordinary structure; effort matters',
  '波折较多，宜守正修身': 'Challenging; keep to integrity and self-cultivation',
}

const BRANCH_HOUR_EN = ['Zi (23:00-00:59)', 'Chou (01:00-02:59)', 'Yin (03:00-04:59)', 'Mao (05:00-06:59)', 'Chen (07:00-08:59)', 'Si (09:00-10:59)', 'Wu (11:00-12:59)', 'Wei (13:00-14:59)', 'Shen (15:00-16:59)', 'You (17:00-18:59)', 'Xu (19:00-20:59)', 'Hai (21:00-22:59)']

function lunarDateEn(s: string): string {
  const m = s.match(/(\d{4})年(\d{1,2})月(\d{1,2})日/)
  return m ? `Lunar ${m[1]}-${String(m[2]).padStart(2, '0')}-${String(m[3]).padStart(2, '0')}` : ''
}

function fiveClassEn(s: string): string {
  const el = ELEMENT_EN[s[0]]
  const numMap: Record<string, number> = { 一: 1, 二: 2, 三: 3, 四: 4, 五: 5, 六: 6 }
  const n = numMap[s[1]]
  if (!el || !n) return ''
  return `${el} ${n} Bureau`
}

function palaceReadEn(p: PalaceRead): ZiweiStarReadEn {
  return {
    name: palaceEn(p.name),
    empty: p.empty,
    stars: p.stars.map(parseStarToken),
    auspicious: p.auspicious.map(parseStarToken),
    ominous: p.ominous.map(parseStarToken),
    tags: p.tags.map(palaceTagEn),
  }
}

function periodEn(p: PeriodRead, now: Date, kind: 'decadal' | 'yearly' | 'monthly'): ZiweiPeriodEn {
  const title = kind === 'decadal'
    ? `Current decade (age period active in ${now.getFullYear()})`
    : kind === 'yearly'
      ? `Annual cycle ${now.getFullYear()}`
      : `Monthly cycle ${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  return {
    title,
    ganZhi: ganZhiEn(p.ganZhi),
    basePalace: palaceEn(p.basePalace),
    range: rangeEn(p.range),
    stars: p.stars.map((s) => {
      const m = s.match(/^空宫（借对宫(.+)）$/)
      if (m) return `Empty palace (borrows ${palaceEn(m[1])})`
      return parseStarToken(s)
    }),
    transforms: p.transforms.map((t) => {
      const m = t.match(/^(.)：(.*?)→(.*)$/)
      if (!m) return ''
      const type = MUTAGEN_EN[m[1]] ?? ''
      return `${type}: ${starEn(m[2])} → ${palaceEn(m[3])}`
    }).filter(Boolean),
    tags: p.tags.map(palaceTagEn),
  }
}

/** 紫微英文版：宫位/星曜/亮度/格局/四化/大限流年逐条重写，条目数与中文一致 */
export function ziweiEn(chart: ZwChart, analysis: ZiweiAnalysis, now: Date = new Date()): ZiweiRuleEn {
  return {
    header: {
      solarDate: chart.ziweiDateStr || '',
      lunarDate: lunarDateEn(chart.lunarDate),
      zodiac: ZODIAC_EN[chart.zodiac] ?? '',
      sign: SIGN_EN[chart.sign] ?? '',
      fiveElementsClass: fiveClassEn(chart.fiveElementsClass),
      soul: starEn(chart.soul),
      body: starEn(chart.body),
      birthHour: BRANCH_HOUR_EN[chart.ziweiTimeIndex] ?? '',
      gender: chart.input.gender === 1 ? 'Male' : 'Female',
    },
    score: analysis.score,
    scoreLabel: SCORE_LABEL_EN[analysis.scoreLabel] ?? '',
    patterns: analysis.patterns.map((p) => ({
      name: PATTERN_EN[p.name]?.name ?? (p.name.match(/^(.+)守命格$/) ? `${starEn(p.name.replace(/守命格$/, ''))} in the Life Palace` : 'Structural pattern'),
      level: levelEn(p.level),
      note: patternNoteEn(p.name, p.note, p.level),
      required: (p.required ?? []).map(patternReqEn),
      bonus: (p.bonus ?? []).map(patternReqEn),
      breaking: (p.breaking ?? []).map(patternReqEn),
      source: p.source ? sourceEn(p.source) : '',
      basisLevel: p.basisLevel === '古籍' ? 'Classical text' : p.basisLevel === '通行做法' ? 'Common practice' : p.basisLevel === '产品设定' ? 'Product model' : '',
    })),
    transforms: analysis.transforms.map((t) => ({
      star: starEn(t.star),
      type: MUTAGEN_EN[t.type] ?? '',
      palace: palaceEn(t.palace),
      note: TRANSFORM_NOTE_EN[t.palace]?.[['禄', '权', '科', '忌'].indexOf(t.type)] ?? '',
    })),
    grid: chart.palaces.map((p) => ({
      name: palaceEn(p.name),
      ganZhi: ganZhiEn(p.ganZhi),
      empty: p.majorStars.length === 0,
      majorStars: p.majorStars.map((s) => ({
        name: starEn(s.name),
        brightness: BRIGHT_EN[s.brightness] ?? '',
        mutagen: MUTAGEN_EN[s.mutagen] ?? '',
      })),
      minorStars: p.minorStars.map((s) => starEn(s.name)),
      adjectiveStars: p.adjectiveStars.map(starEn),
      isBodyPalace: p.isBodyPalace,
      changsheng12: CHANGSHENG_EN[p.changsheng12] ?? '',
      decadalRange: p.decadalRange,
    })),
    palaces: Object.values(analysis.palaces).map(palaceReadEn),
    decadal: periodEn(analysis.decadal, now, 'decadal'),
    yearly: periodEn(analysis.yearly, now, 'yearly'),
    monthly: analysis.monthly ? periodEn(analysis.monthly, now, 'monthly') : null,
    xiaoxian: {
      nominalAge: analysis.xiaoxian.nominalAge,
      basePalace: palaceEn(analysis.xiaoxian.basePalace),
      ganZhi: ganZhiEn(analysis.xiaoxian.ganZhi),
    },
    selfMutations: (analysis.selfMutations ?? []).map((s) => ({
      palace: palaceEn(s.palace),
      ganZhi: ganZhiEn(s.ganZhi),
      mutagens: s.mutagens.map((m) => MUTAGEN_EN[m] ?? ''),
    })),
    laiYinPalace: analysis.laiYinPalace ? palaceEn(analysis.laiYinPalace) : '',
  }
}

function sourceEn(s: string): string {
  if (s.includes('全书')) return 'Zi Wei Dou Shu Quan Shu, Various Stars Q&A'
  if (s.includes('全集')) return 'Zi Wei Dou Shu Quan Ji, Volume 2 or 3'
  return 'Classical Zi Wei text'
}

// ═══════════════════════════════════════════════════════════════
// 三、方位英文
// ═══════════════════════════════════════════════════════════════

export interface GeoCityEn {
  name: string
  region: string
  score: number
  impact: string
  menWx: string
  fangWx: string
  fangLabel: string
  bearing: number
  center: boolean
  diqi: string
  diqiNote: string
  reasons: string[]
}

export interface GeoCategoryEn {
  key: string
  label: string
  targetWx: string
  targetGod: string
  cities: GeoCityEn[]
  notice: string
}

export interface GeoCurrentCityEn {
  name: string
  level: 'Favorable' | 'Neutral' | 'Challenging'
  score: number
  impact: string
  primaryWx: string
  primarySource: string
  godRelation: string
  favorable: boolean
  fangLabel: string
  distanceKm: number | null
  diqi: string
  diqiNote: string
  effects: string[]
  advice: string[]
}

export interface GeoRuleEn {
  dayMaster: string
  dayWx: string
  wangShuai: string
  strong: boolean
  favorableWx: string[]
  unfavorableWx: string[]
  favorableDirections: string[]
  unfavorableDirections: string[]
  birthplace: string
  currentCity: GeoCurrentCityEn | null
  categories: GeoCategoryEn[]
}

const CATEGORY_LABEL_EN: Record<string, string> = {
  wealth: 'City of Wealth', career: 'City of Career', patron: 'City of Benefactors',
  home: 'City of Settling', talent: 'City of Talent',
}

const GOD_EN: Record<string, string> = {
  财星: 'Wealth star', 官杀: 'Officer and Killing', 印星: 'Resource star', 比劫: 'Companion and Rob',
  食伤: 'Output star', '比劫（帮身任财）': 'Companion and Rob (to carry wealth)',
  '印星（扶身立业）': 'Resource star (to support the self)',
}

const IMPACT_EN: Record<string, string> = {
  '强旺 · 助力深厚': 'Very strong: deep support',
  助力显著: 'Clearly supportive',
  可以借势: 'Supportive',
  助力一般: 'Mildly supportive',
  '偏弱 · 待运而发': 'Weak: wait for the right period',
}

const GE_QI_EN: Record<string, string> = {
  金: 'an ordered, administrative, metal-toned city',
  木: 'a growing, cultural, green-toned city',
  水: 'a trading, flowing, water-borne city',
  火: 'a lively, expressive, energy-driven city',
  土: 'a stable, land-bound, storage city',
}

const DIR_EN: Record<string, string> = {
  正北: 'due north', 东北: 'northeast', 正东: 'due east', 东南: 'southeast',
  正南: 'due south', 西南: 'southwest', 正西: 'due west', 西北: 'northwest', 中央: 'the same locality (centre)',
}

const DIR_FULL_EN: Record<string, string> = {
  '正北·坎水': 'due north (Kan, Water)', '东北·艮土': 'northeast (Gen, Earth)',
  '正东·震木': 'due east (Zhen, Wood)', '东南·巽木': 'southeast (Xun, Wood)',
  '正南·离火': 'due south (Li, Fire)', '西南·坤土': 'southwest (Kun, Earth)',
  '正西·兑金': 'due west (Dui, Metal)', '西北·乾金': 'northwest (Qian, Metal)',
  中央: 'the same locality (centre)',
}

const CURRENT_CITY_LEVEL_EN: Record<string, 'Favorable' | 'Neutral' | 'Challenging'> = {
  吉: 'Favorable', 平: 'Neutral', 忌: 'Challenging',
}

function directionEn(s: string): string {
  if (DIR_FULL_EN[s]) return DIR_FULL_EN[s]
  const m = s.match(/^(正[东南西北]|东南|西南|东北|西北)·(.+)$/)
  if (m) return `${DIR_EN[m[1]] ?? m[1]} (${m[2]})`
  return DIR_EN[s] ?? ''
}

function geoCityReasonsEn(city: GeoCityHit, targetWx: WX, strong: boolean, fav: WX[], tiaoHou: WX[]): string[] {
  const out: string[] = []
  for (const zh of city.reasons) {
    // 方位
    if (zh.startsWith('方位：')) {
      const dist = zh.match(/距约(\d+)公里/)
      const angle = zh.match(/方位角约(\d+)°/)
      const precise = zh.includes('精确卦位为')
      out.push(
        `Direction: located ${DIR_FULL_EN[city.fangLabel] ?? 'nearby'} of the birthplace` +
        (angle ? ` (bearing about ${angle[1]}°, about ${dist?.[1] ?? '?'} km away)` : '') +
        `; the broad directional element is ${wxEn(city.menWx)}, matching the target ${GOD_EN[targetWx] ?? ''}` +
        (precise ? ` (the precise trigram position is ${DIR_FULL_EN[city.fangLabel] ?? ''}; the broad sector is used for the element)` : '') +
        '. The direction is measured from the birthplace, as in traditional directional element theory.'
      )
      continue
    }
    // 调候
    if (zh.startsWith('调候：')) {
      const rank = zh.match(/第(\d+)位/)
      out.push(rank
        ? `Seasonal remedy: the city's directional element ${wxEn(targetWx)} matches the ${rank[1] === '1' ? 'primary' : `secondary (rank ${rank[1]})`} seasonal remedy in Qiong Tong Bao Jian, easing the climate's need.`
        : `Seasonal remedy: the city's directional element ${wxEn(targetWx)} is exactly the primary seasonal remedy in Qiong Tong Bao Jian; the direction itself acts as the climate medicine.`)
      continue
    }
    // 地气
    if (zh.startsWith('地气：')) {
      const dq = city.diqi ? wxEn(city.diqi) : ''
      if (zh.includes('未标注地气')) { out.push('City qi: this city has no city-qi label; the direction alone is used.'); continue }
      const same = zh.includes('与目标同气')
      const add = zh.match(/加 (\d+)/)
      const minus = zh.includes('故重减')
      const favQ = zh.includes('为命局喜用')
      const taboo = zh.includes('为命局所忌')
      let core = `City qi: ${dq} (${GE_QI_EN[city.diqi ?? '土'] ?? 'a city of its own character'})`
      if (same && favQ) core += ', the same element as the target and favourable to the chart: direction and city qi reinforce each other'
      else if (same && minus) core += `, the same element as the target, but the chart is ${strong ? 'strong' : 'weak'} and the ${GOD_EN[targetWx] ?? 'target'} is not favourable, so it strengthens a taboo and is heavily reduced`
      else if (zh.includes('合《穷通宝鉴》调候') || add) core += `, a seasonal remedy in Qiong Tong Bao Jian; although not the category target, it eases the climate${add ? ` and adds ${add[1]}` : ''}`
      else if (zh.includes('虽合调候之需')) core += ', matching the seasonal need but a taboo for the current structure; the two are balanced and no bonus is applied'
      else if (favQ) core += ', favourable to the chart; its momentum can be borrowed'
      else if (taboo) core += ', a taboo for the chart; the city qi reinforces what is unfavourable'
      core += ' (city qi is a product model, not a classical source).'
      out.push(core)
      continue
    }
    // 方位纯度
    if (zh.startsWith('方位纯度：')) {
      const off = zh.match(/偏约(\d+)°/)
      const add = zh.match(/\+(\d+(?:\.\d+)?)/)
      out.push(off
        ? `Directional purity: about ${off[1]}° from the home position of ${wxEn(targetWx)}; the closer to the home position, the more concentrated the qi (+${add?.[1] ?? '0.xx'}).`
        : `Directional purity: the same locality is treated as centre; centre is the true position of Earth, so its qi is the most concentrated (+${add?.[1] ?? '0.xx'}).`)
      continue
    }
    // 卦位相扶
    if (zh.startsWith('卦位相扶：')) {
      out.push(`Trigram support: the precise trigram also falls on the home position of ${wxEn(targetWx)}; broad and narrow agree, so the qi is more concentrated (+4).`)
      continue
    }
    // 气聚近处
    if (zh.startsWith('气聚近处：')) {
      const km = zh.match(/约(\d+)公里/)
      const add = zh.match(/\+(\d+(?:\.\d+)?)/)
      out.push(`Qi gathers nearby: about ${km?.[1] ?? '?'} km from the birthplace; among cities of the same element and direction, the nearer one gathers qi (+${add?.[1] ?? '0.xx'}) (product model).`)
      continue
    }
    // 命理张力
    const tension: Record<string, string> = {
      '身弱不任财：财多反累其身，故财富之城取比劫帮身之地，同气相扶方能担财，待岁运扶身再入财乡':
        'A weak Day Master cannot carry wealth: too much wealth weighs it down, so the City of Wealth favours Companion-and-Rob support; only when the luck cycle strengthens the self should one enter the wealth field.',
      '身弱畏官杀之克：事业之城取印星扶身之地，印绶化杀生身，根基稳固后方可担当大任':
        'A weak Day Master fears Officer-and-Killing pressure: the City of Career favours Resource-star support; with the seal converting pressure into support, one can take on great responsibility once the base is firm.',
      '身旺能任财：求财可顺势而为，仍须稳扎稳打，忌孤注一掷':
        'A strong Day Master can carry wealth: pursue money with the current but still build steadily; avoid all-in bets.',
      '身旺喜官杀约束成器：平台与职责反能成就事业高度，可稳步求进':
        'A strong Day Master welcomes Officer-and-Killing discipline: platform and responsibility raise the career ceiling; proceed steadily.',
      '身旺印比本非所喜：此地宜短期休养蓄力，久居易生怠惰，奋发还看财官之方':
        'A strong Day Master does not favour Resource or Companion: use this place for short rest and recovery; long residence invites complacency; ambition belongs to wealth and officer directions.',
      '身弱而食伤泄气：才华之地宜量力而行，先以印比固本，再图施展方不耗元神':
        'A weak Day Master is drained by Output stars: in the City of Talent, act within capacity; first secure the base with Resource and Companion, then display talent without exhausting the spirit.',
      '身旺喜食伤泄秀：此地最利才华抒发，创作表达易出成果，名气可渐积':
        'A strong Day Master benefits from Output stars: this place is best for expressing talent; creative work yields results and reputation accumulates.',
    }
    if (tension[zh]) out.push(tension[zh])
    else if (zh.startsWith('地气：')) out.push('City qi: noted in the Chinese edition.')
    else out.push('Supporting condition.')
  }
  return out
}

function cityEn(city: GeoCityHit, targetWx: WX, strong: boolean, fav: WX[], tiaoHou: WX[]): GeoCityEn {
  const pname = city.name
  return {
    name: pinyinName(pname),
    region: pinyinName(city.region),
    score: city.score,
    impact: IMPACT_EN[city.impact] ?? 'Supportive',
    menWx: wxEn(city.menWx),
    fangWx: wxEn(city.fangWx),
    fangLabel: DIR_FULL_EN[city.fangLabel] ?? (city.center ? DIR_FULL_EN.中央 : ''),
    bearing: city.bearing,
    center: city.center,
    diqi: city.diqi ? wxEn(city.diqi) : '',
    diqiNote: city.diqi ? (GE_QI_EN[city.diqi] ?? '') : '',
    reasons: geoCityReasonsEn(city, targetWx, strong, fav, tiaoHou),
  }
}

/** 城市名中文 → 拼音（页面零 CJK 要求；拼音与国家名已在数据层保留英文时原样返回） */
function pinyinName(s: string): string {
  if (!s) return ''
  if (!CJK_RE.test(s)) return s
  try {
    // 懒加载，避免把 pinyin-pro 打进中文路径的包体
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { pinyin } = require('pinyin-pro') as { pinyin: (t: string, o?: Record<string, unknown>) => string }
    return pinyin(s, { toneType: 'none', type: 'string', v: false })
      .split(' ')
      .map((w) => (w ? w[0].toUpperCase() + w.slice(1) : ''))
      .join(' ')
  } catch {
    return 'Chinese city'
  }
}

function currentCityEn(c: GeoAnalysis['currentCity'], strong: boolean): GeoCurrentCityEn | null {
  if (!c) return null
  const srcEn = c.primarySource === '方位' ? 'Direction' : c.primarySource === '中央' ? 'Centre' : c.primarySource === '地气' ? 'City qi' : ''
  const relEn: Record<string, string> = { 印星: 'Resource', 比劫: 'Companion and Rob', 食伤: 'Output', 财星: 'Wealth', 官杀: 'Officer and Killing' }
  const effects: string[] = []
  if (c.primaryWx) {
    const srcText = srcEn === 'Direction' ? 'The directional element' : srcEn === 'Centre' ? 'The central Earth qi' : 'The city qi'
    const wx = wxEn(c.primaryWx)
    const relation = relEn[c.godRelation] ?? ''
    const pair: Record<string, [string, string]> = {
      Resource: [
        `${srcText} ${wx} is a Resource star: although it generates the self, a strong chart does not need more; long residence breeds comfort and dependence, so self-discipline matters.`,
        `${srcText} ${wx} is a Resource star that supports the self: good for study, documents and elder benefactors; long residence nourishes the base and steadies the foundation.`,
      ],
      'Companion and Rob': [
        `${srcText} ${wx} shares the Day Master's element (Companion and Rob): a strong chart gains more of the same, intensifying competition and splitting wealth; manage money carefully.`,
        `${srcText} ${wx} shares the Day Master's element (Companion and Rob): good for social and business partnerships, steadying the base over time.`,
      ],
      Output: [
        `${srcText} ${wx} is an Output star: good for expression, creative output and building reputation; a strong chart benefits from this release.`,
        `${srcText} ${wx} is an Output star that drains energy: a weak chart is further depleted; ideas are many but stamina runs short, so act within capacity.`,
      ],
      Wealth: [
        `${srcText} ${wx} is a Wealth star: a strong chart can carry wealth, with more earning opportunities; take them steadily and avoid leverage or all-in bets.`,
        `${srcText} ${wx} is a Wealth star: a weak chart cannot carry wealth; opportunity and pressure arrive together, so avoid greed and live within means.`,
      ],
      'Officer and Killing': [
        `${srcText} ${wx} is Officer-and-Killing discipline: a strong chart is shaped by it and suits workplace responsibility; advance steadily.`,
        `${srcText} ${wx} is Officer-and-Killing pressure: a weak chart feels constrained and stressed; dissolve it with Resource (study, benefactors, certificates).`,
      ],
    }
    const p = pair[relation]
    if (p) effects.push(strong ? p[0] : p[1])
    effects.push(c.favorable ? 'This element is favourable to the chart; long residence lets you borrow its momentum.' : 'This element is a taboo to the chart; long residence reinforces what is unfavourable and dilutes luck.')
    if (c.primarySource === '方位' && c.distanceKm !== null) {
      effects.push(`Located ${DIR_FULL_EN[c.fangLabel] ?? c.fangLabel} of the birthplace (about ${c.distanceKm} km away); the directional element is ${c.favorable ? 'favourable, so the direction also supports' : 'a taboo, adjustable through home layout (headboard or desk facing a favourable direction)'}.`)
    }
  } else {
    effects.push('No birthplace was provided and this city has no city-qi label, so neither direction nor city qi can be judged; this entry only records the residence.')
  }

  const advice: string[] = c.primaryWx === null
    ? ['Choose a birthplace to receive a directional element assessment; short residence is fine, and mindset and effort matter most.']
    : c.favorable
      ? [
        'The current element matches the favourable elements; long residence can borrow its momentum, and moving away is unnecessary.',
        `You can develop fields related to the ${relEn[c.godRelation] ?? ''} relation (${wxEn(c.primaryWx)}-type industries: ${industryEn(c.primaryWx)}).`,
      ]
      : [
        'Short residence is fine; the Five Element influence is a slow, long-term process.',
        `For the long term, consider moving toward the ${c.primaryWx ? '' : ''}${''}favourable directions; if you stay, visit favourable directions more often to adjust.`.replace('  ', ' '),
        'Home layout can introduce favourable Five Element elements (colour, material, direction); mindset and effort matter most.',
      ]

  return {
    name: pinyinName(c.name),
    level: CURRENT_CITY_LEVEL_EN[c.level] ?? 'Neutral',
    score: c.score,
    impact: IMPACT_EN[c.impact] ?? '',
    primaryWx: c.primaryWx ? wxEn(c.primaryWx) : '',
    primarySource: srcEn,
    godRelation: relEn[c.godRelation] ?? '',
    favorable: c.favorable,
    fangLabel: DIR_FULL_EN[c.fangLabel] ?? '',
    distanceKm: c.distanceKm,
    diqi: c.diqi ? wxEn(c.diqi) : '',
    diqiNote: c.diqi ? (GE_QI_EN[c.diqi] ?? '') : '',
    effects,
    advice,
  }
}

const INDUSTRY_EN: Record<string, string> = {
  木: 'education, medicine, timber, furniture and landscaping',
  火: 'energy, electronics, food and catering, media and culture',
  土: 'real estate, construction, agriculture and warehousing',
  金: 'finance, machinery, metalwork and the judiciary',
  水: 'trade, shipping, logistics, tourism and fisheries',
}

function industryEn(w: string): string {
  return INDUSTRY_EN[w] ?? ''
}

/** 方位英文版：类别/城市/评分理由/现居影响逐条重写（理由条数与中文一致） */
export function geoEn(geo: GeoAnalysis, tiaoHou: WX[] = []): GeoRuleEn {
  return {
    dayMaster: `${stemEn(geo.dayMaster)} (${wxEn(geo.dayWx)})`.trim(),
    dayWx: wxEn(geo.dayWx),
    wangShuai: strengthEn(geo.wangShuai),
    strong: geo.strong,
    favorableWx: geo.favorableWx.map(wxEn),
    unfavorableWx: geo.unfavorableWx.map(wxEn),
    favorableDirections: geo.favorableDirections.map(directionEn).filter(Boolean),
    unfavorableDirections: geo.unfavorableDirections.map(directionEn).filter(Boolean),
    birthplace: geo.birthplace ? pinyinName(geo.birthplace.name) : '',
    currentCity: currentCityEn(geo.currentCity, geo.strong),
    categories: geo.categories.map((c) => ({
      key: c.key,
      label: CATEGORY_LABEL_EN[c.key] ?? '',
      targetWx: wxEn(c.targetWx),
      targetGod: GOD_EN[c.targetGod] ?? 'target element',
      cities: c.cities.map((city) => cityEn(city, c.targetWx, geo.strong, geo.favorableWx, tiaoHou)),
      notice: noticeEn(c.notice),
    })),
  }
}

function noticeEn(notice?: string): string {
  if (!notice) return ''
  const m = notice.match(/仅得 (\d+) 座/)
  return m ? `Few cities lie in the required direction for this category; all ${m[1]} available cities are listed. This reflects geography, not missing data.` : 'The candidate list is limited by geography, not by missing data.'
}

// ═══════════════════════════════════════════════════════════════
// 四、年运英文
// ═══════════════════════════════════════════════════════════════

export interface LuckDomainEn { tendency: 'Favorable' | 'Neutral' | 'Challenging'; note: string }

export interface DaYunEn {
  ganZhi: string
  startYear: number
  endYear: number
  startAge: number
  shiShenGan: string
  shiShenZhi: string
  score: number
  tag: string
  current: boolean
  relations: string[]
  issues: string[]
  note: string
  domains: Record<'career' | 'wealth' | 'health' | 'relation', LuckDomainEn>
}

export interface LiuNianEn {
  year: number
  ganZhi: string
  shiShenGan: string
  shiShenZhi: string
  score: number
  tag: string
  current: boolean
  isPast: boolean
  daYunGanZhi: string
  relations: string[]
  issues: string[]
  note: string
}

export interface LiuYueEn {
  month: number
  ganZhi: string
  jieQi: string
  rangeLabel: string
  shiShenGan: string
  score: number
  tag: string
  relations: string[]
  note: string
}

export interface LiunianRuleEn {
  favorable: string[]
  unfavorable: string[]
  curDaYun: DaYunEn | null
  liuNian: LiuNianEn[]
  liuYue: LiuYueEn[] | null
}

const JIEQI_EN: Record<string, string> = {
  立春: 'Start of Spring', 雨水: 'Rain Water', 惊蛰: 'Awakening of Insects', 春分: 'Spring Equinox',
  清明: 'Clear and Bright', 谷雨: 'Grain Rain', 立夏: 'Start of Summer', 小满: 'Grain Buds',
  芒种: 'Grain in Ear', 夏至: 'Summer Solstice', 小暑: 'Minor Heat', 大暑: 'Major Heat',
  立秋: 'Start of Autumn', 处暑: 'End of Heat', 白露: 'White Dew', 秋分: 'Autumn Equinox',
  寒露: 'Cold Dew', 霜降: "Frost's Descent", 立冬: 'Start of Winter', 小雪: 'Minor Snow',
  大雪: 'Major Snow', 冬至: 'Winter Solstice', 小寒: 'Minor Cold', 大寒: 'Major Cold',
}

const TEN_GOD_THEME_EN: Record<string, string> = {
  比肩: 'Companion matters: friends and peers, cooperation and competition, independence.',
  劫财: 'Rob Wealth matters: partnerships and contention, spending and loss, risk-taking.',
  食神: 'Eating God matters: talent and creativity, enjoyment, and children.',
  伤官: 'Hurting Officer matters: performance and competition, speech and change, creative expression.',
  偏财: 'Indirect Wealth matters: investment opportunities, irregular income, socialising; also the father.',
  正财: 'Direct Wealth matters: regular income and practical family business; for a man also romance.',
  七杀: 'Seven Killing matters: pressure and challenge, competition and pioneering; also change and disputes.',
  正官: 'Direct Officer matters: office and reputation, rules and discipline; for a woman also marriage.',
  偏印: 'Indirect Resource matters: specialist skills, overthinking, medicine and religion.',
  正印: 'Direct Resource matters: study and documents, benefactors and elders, property and reputation.',
}

const DOMAIN_NOTE_EN: Record<string, string> = {
  '事业运势平平，宜守成积累，不宜冒进': 'Career is average; consolidate and accumulate rather than push ahead.',
  '财星透干、进财机会显现（偏财主事）；然原局比劫旺而夺财，财现亦易破；进财机会与破耗之险并存，宜守不宜投，到手之财先求稳住，忌杠杆投机':
    'The Wealth star is exposed and earning opportunities appear (Indirect Wealth governs); yet the natal chart has strong Companion-and-Rob that competes for wealth, so gains are easily lost. Opportunity and leakage coexist: guard rather than invest, secure what arrives, and avoid leverage or speculation.',
  '健康无大碍，注意规律作息': 'Health is generally fine; keep regular rest and routines.',
  '人际关系平稳，宜以和为贵': 'Relations are steady; harmony is the best policy.',
  '官杀主事，压力与机会并存，量力而行': 'Officer-and-Killing governs: pressure and opportunity coexist; act within capacity.',
  '本运财星不现，求财费力，宜凭专业与勤恳积少成多、等待财星岁运；忌投机博弈、杠杆放大':
    'No Wealth star appears in this period, so money takes effort; build steadily through expertise and diligence and wait for a wealth-bearing cycle; avoid speculation and leverage.',
  '岁运扶助事业，可稳步推进': 'The cycle supports career; proceed steadily.',
  '比劫透干再临，财被劫夺之势更重：求财易破耗，宜守不宜攻，忌杠杆投机、合伙分财，量入为出':
    'Companion-and-Rob appears again at the stem, intensifying the drain on wealth: earning is easily eroded, so defend rather than attack; avoid leverage, speculation and splitting profits with partners, and live within means.',
  '岁运冲原局，防意外伤病与旧疾反复，注意劳逸结合': 'The cycle clashes the natal chart; guard against accidents, illness and old complaints, and balance work with rest.',
  '感情家庭多磨合，多沟通包容': 'Romance and family need adjustment; communicate and be tolerant.',
}

function domainEn(d: LuckDomain): LuckDomainEn {
  return {
    tendency: levelEn(d.tendency === '滞' ? '忌' : d.tendency),
    note: domainNoteEn(d.note),
  }
}

/** 分维度断语：按中文原句的判定分支逐条改写（动态插值句用 includes 区分） */
function domainNoteEn(zh: string): string {
  if (DOMAIN_NOTE_EN[zh]) return DOMAIN_NOTE_EN[zh]
  if (zh.startsWith('官星被印化泄')) return 'The Officer star is drained by the Resource star: rank without real authority, so many titles and little substance; build on expertise rather than positional manoeuvring.'
  if (zh.startsWith('官星孤立无财生')) return 'The Officer star stands alone with no Wealth to feed it: position is hard to secure and the workplace swings; hold your own ground.'
  if (zh.startsWith('官杀主事，事业责任加重')) return 'Officer-and-Killing governs: career responsibility grows, and a strong Day Master can advance steadily.'
  if (zh.startsWith('官杀主事，压力与机会并存')) return 'Officer-and-Killing governs: pressure and opportunity coexist; act within capacity.'
  if (zh.startsWith('财星透干、进财机会显现')) {
    return zh.includes('坐支恰为比劫')
      ? 'The Wealth star is exposed and earning opportunities appear, but the seat is Companion-and-Rob: money comes and goes easily, so guard what arrives and avoid leverage or speculation.'
      : 'The Wealth star is exposed and earning opportunities appear; yet natal Companion-and-Rob is strong and competes for wealth, so opportunity and leakage coexist. Guard rather than invest, secure what arrives, and avoid leverage or speculation.'
  }
  if (zh.startsWith('比劫透干再临')) return 'Companion-and-Rob surfaces again at the stem, intensifying the drain on wealth: defend rather than attack; avoid leverage, speculation and splitting profits with partners, and live within means.'
  if (zh.startsWith('财气现于地支')) return 'Wealth qi shows in the branches and opportunity stays implicit; natal Companion-and-Rob can still seize it, so earn through solid work, secure what arrives, and avoid speculation or large commitments.'
  if (zh.startsWith('本运财星不现')) {
    return zh.includes('运支比劫暗伏')
      ? 'No Wealth star appears in this period, so money takes effort; build steadily through expertise and diligence and wait for a wealth-bearing cycle. Avoid speculation and leverage, and guard against unexpected losses from hidden Companion-and-Rob in the branch.'
      : 'No Wealth star appears in this period, so money takes effort; build steadily through expertise and diligence and wait for a wealth-bearing cycle. Avoid speculation and leverage.'
  }
  return 'Direction noted in the Chinese edition.'
}

function tagTier(t: string): string {
  return FORTUNE_TIER_EN[t] ?? ''
}

const REL_TAIL_EN: Record<string, string> = {
  '事宜心境易有反复': 'matters and moods may repeat',
  '十年祖上/父母宫事宜易有反复': 'ancestral and parent matters may repeat through the decade',
  '十年子女/晚年宫事宜易有反复': 'children and later-life matters may repeat through the decade',
  '祖上/父母宫事宜易有反复': 'ancestral and parent matters may repeat',
  '子女/晚年宫事宜易有反复': 'children and later-life matters may repeat',
  '事宜易有反复': 'matters may repeat',
  '事宜有羁绊亦有合作': 'matters bring both entanglement and cooperation',
  '子女、下属有羁绊之象': 'children and subordinates may feel entangled',
  '事业、平台有羁绊之象': 'career and platform may feel entangled',
  '长辈、合作有羁绊之象': 'elders and partnerships may feel entangled',
  '合作羁绊之象': 'partnerships may feel entangled',
  '十年事业、环境多变动': 'career and environment change a lot through the decade',
  '感情与健康多波动': 'romance and health fluctuate',
  '感情、合作关系多变': 'romance and cooperation change a lot',
  '十年祖上/父母宫所主领域多有牵动': 'ancestral and parent matters are stirred through the decade',
  '十年子女/晚年宫所主领域多有牵动': 'children and later-life matters are stirred through the decade',
  '祖上/父母宫所主领域多有牵动': 'ancestral and parent matters are stirred',
  '子女/晚年宫所主领域多有牵动': 'children and later-life matters are stirred',
  '有变动之机': 'change is likely',
  '环境、事业多有变动': 'environment and career change a lot',
  '十年祖上/父母宫多得助力': 'ancestral and parent matters gain support through the decade',
  '十年子女/晚年宫多得助力': 'children and later-life matters gain support through the decade',
  '祖上/父母宫多得助力': 'ancestral and parent matters gain support',
  '子女/晚年宫多得助力': 'children and later-life matters gain support',
  '人际感情和合': 'relationships and romance harmonise',
  '关系和合': 'the relationship harmonises',
  '感情合作多磨': 'romance and cooperation need work',
  '事业多得呼应': 'career receives support',
  '多得平台际遇之助': 'platform opportunities help',
  '当月顺遂': 'the month goes smoothly',
  '当月多波动': 'the month is volatile',
  '心境易有反复，宜守本心': 'moods may repeat, so hold to your own principles',
  '心境事宜易有反复': 'moods and matters may repeat',
  '提纲/事业宫事宜易有反复': 'career and platform matters may repeat',
  '十年起落较大': 'the decade brings larger swings',
}

function relTail(s: string, fallback: string): string {
  return REL_TAIL_EN[s] ?? fallback
}

function branchScope(prefix: string): string {
  return prefix === '流年支' ? 'annual' : prefix === '月支' ? 'month' : 'period'
}

function relationEn(zh: string): string {
  // 伏吟
  let m = zh.match(/^(运支|流年支|月支)(.)与(夫妻宫|年柱|时柱|月柱|日柱|日支|月令|太岁|运支)(.*?)伏吟，(.+)$/)
  if (m) {
    return `The ${branchScope(m[1])} branch ${branchEn(m[2])} repeats (fuyin) against ${targetEn(m[3])}; ${relTail(m[5], 'matters may repeat')}.`
  }
  // 天干相合
  m = zh.match(/^(运干|流年干)(.)与(日主|时干|月干|年干)(相合)?，(.+)$/)
  if (m) {
    const who = m[1] === '流年干' ? 'annual stem' : 'period stem'
    return `The ${who} ${stemEn(m[2])} combines with ${targetEn(m[3])}; ${relTail(m[5], 'matters bring entanglement and cooperation')}.`
  }
  // 冲（含缺省地支）
  m = zh.match(/^(运支|流年支|月支)(.)?冲(运支|年柱|时柱|月令|提纲|夫妻宫|日支|太岁|原局月令提纲)(.)?，?(.*)$/)
  if (m) {
    const base = `The ${branchScope(m[1])} branch${m[2] ? ` ${branchEn(m[2])}` : ''} clashes ${targetEn(m[3])}${m[4] ? ` (${branchEn(m[4])})` : ''}`
    return `${base}; ${relTail(m[5] || '', 'movement is likely')}.`
  }
  // 合（含缺省地支）
  m = zh.match(/^(运支|流年支|月支)(.)?合(运支|年柱|时柱|月令|夫妻宫|太岁)(.)?，?(.*)$/)
  if (m) {
    const base = `The ${branchScope(m[1])} branch${m[2] ? ` ${branchEn(m[2])}` : ''} combines ${targetEn(m[3])}${m[4] ? ` (${branchEn(m[4])})` : ''}`
    return `${base}; ${relTail(m[5] || '', 'affairs harmonise')}.`
  }
  // 半合（可能缺地支）
  m = zh.match(/^(运支|流年支)与(夫妻宫|年柱|时柱)半合(木|火|土|金|水)局，合出(.)气助(喜用|忌神)$/)
  if (m) {
    return `The ${m[1] === '流年支' ? 'annual' : 'period'} branch forms a half ${wxEn(m[3])} combination with ${targetEn(m[2])}, drawing ${wxEn(m[4])} qi that feeds a ${m[5] === '喜用' ? 'favourable' : 'taboo'} element.`
  }
  // 岁运天克地冲
  m = zh.match(/^流年与大运天克地冲（(..)对(..)），岁运交战，大事宜慎$/)
  if (m) {
    return `The annual cycle and the Luck Pillar clash in both stem and branch (${ganZhiEn(m[1])} against ${ganZhiEn(m[2])}); the two cycles fight, so major undertakings need caution.`
  }
  // 流年支冲运支X
  m = zh.match(/^流年支冲运支(.)，有变动之机$/)
  if (m) return `The annual branch clashes the period branch ${branchEn(m[1])}; change is likely.`
  // 流年支合运支X
  m = zh.match(/^流年支合运支(.)，多得平台际遇之助$/)
  if (m) return `The annual branch combines the period branch ${branchEn(m[1])}; platform opportunities help.`
  // 流年冲提纲（X冲Y）
  m = zh.match(/^流年冲提纲（(.)冲(.)），环境、事业多有变动$/)
  if (m) return `The annual cycle clashes the month command (${branchEn(m[1])} clashing ${branchEn(m[2])}); environment and career change a lot.`
  // 月支合太岁 / 冲太岁 等
  m = zh.match(/^月支(冲|合)(太岁|夫妻宫)，(.+)$/)
  if (m) return `The month branch ${m[1] === '冲' ? 'clashes' : 'combines'} ${targetEn(m[2])}; ${relTail(m[3], 'conditions shift')}.`
  // 整柱伏吟（运临X柱 / 流年与X柱）
  m = zh.match(/^运临(日柱|年柱|月柱|时柱)伏吟，(.+)$/)
  if (m) return `The Luck Pillar repeats the ${targetEn(m[1])} (fuyin); ${relTail(m[2], 'matters may repeat')}.`
  m = zh.match(/^流年与(日柱|年柱|月柱|时柱)伏吟，(.+)$/)
  if (m) return `The annual pillar repeats the ${targetEn(m[1])} (fuyin); ${relTail(m[2], 'matters may repeat')}.`
  // 运与日柱天克地冲
  m = zh.match(/^运与日柱天克地冲（(..)对(..)），十年起落较大$/)
  if (m) return `The period clashes the day pillar in both stem and branch (${ganZhiEn(m[1])} against ${ganZhiEn(m[2])}); the decade brings larger swings.`
  // 流年支合月令
  if (zh === '流年支合月令，事业多得呼应') return 'The annual branch combines the month command; career receives support.'
  // 岁运并临
  if (zh === '岁运并临，吉凶之力加倍，宜稳不宜躁') return 'The annual pillar duplicates the Luck Pillar (suiyun binglin); favourable and adverse effects double, so stay steady rather than restless.'
  return 'A notable interaction with the native chart is recorded.'
}

function issueEn(zh: string): string {
  let m = zh.match(/^(运支|流年支)(.)虽为喜用，内藏(.*)忌神，制身之力不纯，喜中带忌，力度打折$/)
  if (m) {
    const gods = m[3].split('、').map((g) => TEN_GOD_EN[g] ?? '').filter(Boolean).join(', ')
    return `Although ${branchEn(m[2])} is favourable, it hides the taboo ${gods || 'element'}; the support is mixed, so its effect is discounted.`
  }
  m = zh.match(/^(运支|流年支)(.)冲原局(月令提纲|日支|提纲)，(.+?)动荡不稳$/)
  if (m) {
    const core = m[4].includes('官') ? 'the Officer-star foundation' : 'the foundation'
    return `The ${m[1] === '流年支' ? 'annual' : 'period'} branch ${branchEn(m[2])} clashes the natal ${m[3] === '日支' ? 'day branch (spouse palace)' : 'month command'}; ${core} is unstable.`
  }
  m = zh.match(/^运干(正官|七杀|正印|偏印|食神|伤官|正财|偏财|比肩|劫财)（喜）透干，但被原局透干印星化泄（官生印、印生身），官星有名无权，名分大于实权$/)
  if (m) return `The period stem ${TEN_GOD_EN[m[1]] ?? 'Ten God'} surfaces as a favourable element, but natal exposed Resource drains it (Officer generates Resource, Resource generates the Day Master): the Officer star carries rank without real power, and title exceeds authority.`
  if (zh === '食伤势孤，才华难施展，水多木漂') return 'The Output star is isolated: talent struggles to express, and excess Water floats the Wood.'
  if (zh === '官杀无财星相生，官星孤立，名分难固') return 'Officer-and-Killing has no Wealth star to feed it, so the Officer star is isolated and position is hard to secure.'
  if (zh.startsWith('财星深藏不透')) return 'The Wealth star is deeply hidden and does not surface: earning takes effort, and any exposure of wealth is immediately contested by strong Companion stars, so loss is hard to avoid.'
  m = zh.match(/^比劫(\d+)重林立而财星无制，财来即被劫夺，求财易破，忌投机、合伙与杠杆$/)
  if (m) return `Companion and Rob appear ${m[1]} times with no Wealth-star control: gains are seized as they arrive, so avoid speculation, partnerships and leverage.`
  if (zh.startsWith('印星')) return 'The Resource star is heavy: study and support help, but over-reliance can slow action.'
  return 'A structural condition in the native chart is noted.'
}

function targetEn(t: string): string {
  const map: Record<string, string> = {
    夫妻宫: 'the spouse palace', 年柱: 'the year pillar', 时柱: 'the hour pillar',
    月柱: 'the month pillar', 日柱: 'the day pillar', 日支: 'the day branch',
    月令: 'the month command', 提纲: 'the month command', 原局月令提纲: 'the natal month command',
    太岁: 'the annual ruler', 运支: 'the period branch', 日主: 'the Day Master',
    时干: 'the hour stem', 月干: 'the month stem', 年干: 'the year stem',
  }
  return map[t] ?? 'the natal chart'
}

// 七档判词建议（与 analysis.ts 的 FORTUNE_ADVICE / RETRO_ADVICE 逐档对应）
const FORTUNE_ADVICE_EN: Record<string, string> = {
  大吉: 'The cycle fits the chart closely; set out medium- and long-term goals in step with it.',
  吉: 'The cycle supports the favourable elements; plans can advance steadily.',
  小吉: 'The cycle offers modest help; steady, gradual action is enough.',
  平: 'A neutral period; accumulate, and defer major decisions.',
  小凶: 'The cycle holds things back somewhat; hold position and expand little.',
  凶: 'The cycle meets many obstacles; avoid large commitments and major changes.',
  大凶: 'The cycle is structurally unfavourable; stay quiet and guard health and reputation.',
}

const RETRO_ADVICE_EN: Record<string, string> = {
  大吉: 'That cycle fitted the chart closely and brought the benefit of moving with the current.',
  吉: 'That cycle supported the favourable elements; matters advanced steadily.',
  小吉: 'That cycle gave modest support; gradual progress yielded results.',
  平: 'That cycle was neutral; attention went to accumulation, without major swings.',
  小凶: 'That cycle held things back somewhat, and holding position was the main theme.',
  凶: 'That cycle met obstacles; large commitments and major changes brought setbacks.',
  大凶: 'That cycle was structurally unfavourable; quiet holding and guarding health and reputation were the theme.',
}

const TAG_ADVICE_EN: Record<string, string> = {
  较宜: 'The cycle supports the favourable elements; plans can advance steadily.',
  平顺: 'No major swings; build strength as usual.',
  一般: 'A neutral period; defer important decisions and focus on accumulation.',
  宜慎: 'Act with caution; avoid large commitments and impulsive decisions.',
  大防: 'The cycle is unsettled; defer major decisions and watch health and disputes.',
}

const TENDENCY_WORD_EN: Record<string, string> = { 吉: 'favourable', 平: 'steady', 滞: 'sluggish' }

function themeOf(shiShenGan: string): string {
  return TEN_GOD_THEME_EN[shiShenGan] ?? 'The period is read by its governing Ten God.'
}

/** 大运断语：十神主题 + 结构病 + 判词 + 事业/财运倾向（与中文 note 信息项一一对应） */
function daYunNoteEn(d: LuckDaYunItem): string {
  const parts = [themeOf(d.shiShenGan)]
  const issues = d.structuralIssues.map(issueEn).filter(Boolean)
  if (issues.length) parts.push(issues.join(' '))
  parts.push(FORTUNE_ADVICE_EN[d.tag] ?? '')
  parts.push(`Career reads ${TENDENCY_WORD_EN[d.domains.career.tendency] ?? 'steady'} and wealth reads ${TENDENCY_WORD_EN[d.domains.wealth.tendency] ?? 'steady'} in this period.`)
  return parts.filter(Boolean).join(' ').replace(/\s+/g, ' ').trim()
}

/** 流年断语：十神主题 + 结构病 + 判词（过去年用回顾语气） */
function liuNianNoteEn(d: LuckLiuNianItem): string {
  const parts = [themeOf(d.shiShenGan)]
  const issues = d.structuralIssues.map(issueEn).filter(Boolean)
  if (issues.length) parts.push(issues.join(' '))
  const advice = d.isPast ? RETRO_ADVICE_EN[d.tag] : FORTUNE_ADVICE_EN[d.tag]
  if (advice) parts.push(advice)
  return parts.filter(Boolean).join(' ').replace(/\s+/g, ' ').trim()
}

/** 流月断语：十神主题 + 月度建议（月度不出大吉大凶，语气与中文一致） */
function liuYueNoteEn(d: LuckLiuYueItem): string {
  const advice = TAG_ADVICE_EN[d.tag] ?? ''
  return [themeOf(d.shiShenGan), advice].filter(Boolean).join(' ').replace(/\s+/g, ' ').trim()
}

/** 年运英文版：大运/流年/流月断语与标签逐条重写，条目数与中文一致 */
export function liunianEn(input: {
  favorable: string[]
  unfavorable: string[]
  curDaYun: LuckDaYunItem | null
  liuNian: LuckLiuNianItem[]
  liuYue: LuckLiuYueItem[] | null
}): LiunianRuleEn {
  const cleanRel = (rs: string[]) => rs.map(relationEn).filter(Boolean)

  const daYun = (d: LuckDaYunItem): DaYunEn => ({
    ganZhi: ganZhiEn(d.ganZhi),
    startYear: d.startYear,
    endYear: d.endYear,
    startAge: d.startAge,
    shiShenGan: TEN_GOD_EN[d.shiShenGan] ?? '',
    shiShenZhi: TEN_GOD_EN[d.shiShenZhi] ?? '',
    score: d.score,
    tag: tagTier(d.tag),
    current: d.current,
    relations: d.relations.map(relationEn).filter(Boolean),
    issues: d.structuralIssues.map(issueEn).filter(Boolean),
    note: daYunNoteEn(d),
    domains: {
      career: domainEn(d.domains.career),
      wealth: domainEn(d.domains.wealth),
      health: domainEn(d.domains.health),
      relation: domainEn(d.domains.relation),
    },
  })

  return {
    favorable: input.favorable.map(wxEn),
    unfavorable: input.unfavorable.map(wxEn),
    curDaYun: input.curDaYun ? daYun(input.curDaYun) : null,
    liuNian: input.liuNian.map((d) => ({
      year: d.year,
      ganZhi: ganZhiEn(d.ganZhi),
      shiShenGan: TEN_GOD_EN[d.shiShenGan] ?? '',
      shiShenZhi: TEN_GOD_EN[d.shiShenZhi] ?? '',
      score: d.score,
      tag: tagTier(d.tag),
      current: d.current,
      isPast: !!d.isPast,
      daYunGanZhi: ganZhiEn(d.daYunGanZhi),
      relations: cleanRel(d.relations),
      issues: d.structuralIssues.map(issueEn).filter(Boolean),
      note: liuNianNoteEn(d),
    })),
    liuYue: input.liuYue
      ? input.liuYue.map((d) => ({
        month: d.month,
        ganZhi: ganZhiEn(d.ganZhi),
        jieQi: JIEQI_EN[d.jieQi] ?? 'solar term',
        rangeLabel: d.rangeLabel,
        shiShenGan: TEN_GOD_EN[d.shiShenGan] ?? '',
        score: d.score,
        tag: LUCK_TAG_EN[d.tag] ?? '',
        relations: cleanRel(d.relations),
        note: liuYueNoteEn(d),
      }))
      : null,
  }
}
