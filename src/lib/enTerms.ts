// 英文命理术语映射（英文报告/英文排盘共用）
//
// 原则：英文输出里不出现任何中日韩统一表意文字。
// 干支一律用拼音（Jia Zi），十神用行业英文（Ten Gods），吉凶判词用描述性英文。

export const STEM_PINYIN: Record<string, string> = {
  甲: 'Jia', 乙: 'Yi', 丙: 'Bing', 丁: 'Ding', 戊: 'Wu',
  己: 'Ji', 庚: 'Geng', 辛: 'Xin', 壬: 'Ren', 癸: 'Gui',
}

export const BRANCH_PINYIN: Record<string, string> = {
  子: 'Zi', 丑: 'Chou', 寅: 'Yin', 卯: 'Mao', 辰: 'Chen', 巳: 'Si',
  午: 'Wu', 未: 'Wei', 申: 'Shen', 酉: 'You', 戌: 'Xu', 亥: 'Hai',
}

export const STEM_ELEMENT: Record<string, string> = {
  甲: 'Wood', 乙: 'Wood', 丙: 'Fire', 丁: 'Fire', 戊: 'Earth',
  己: 'Earth', 庚: 'Metal', 辛: 'Metal', 壬: 'Water', 癸: 'Water',
}

export const BRANCH_ELEMENT: Record<string, string> = {
  子: 'Water', 丑: 'Earth', 寅: 'Wood', 卯: 'Wood', 辰: 'Earth', 巳: 'Fire',
  午: 'Fire', 未: 'Earth', 申: 'Metal', 酉: 'Metal', 戌: 'Earth', 亥: 'Water',
}

export const TEN_GOD_EN: Record<string, string> = {
  比肩: 'Companion', 劫财: 'Rob Wealth', 食神: 'Eating God', 伤官: 'Hurting Officer',
  偏财: 'Indirect Wealth', 正财: 'Direct Wealth', 七杀: 'Seven Killing',
  正官: 'Direct Officer', 偏印: 'Indirect Resource', 正印: 'Direct Resource',
  日主: 'Day Master',
}

export const FORTUNE_TIER_EN: Record<string, string> = {
  大吉: 'Highly favorable', 吉: 'Favorable', 小吉: 'Slightly favorable',
  平: 'Neutral', 小凶: 'Slightly challenging', 凶: 'Challenging', 大凶: 'Highly challenging',
}

export const LUCK_TAG_EN: Record<string, string> = {
  较宜: 'Favorable', 平顺: 'Smooth', 一般: 'Neutral', 宜慎: 'Caution', 大防: 'Caution',
}

export const ELEMENT_EN: Record<string, string> = {
  木: 'Wood', 火: 'Fire', 土: 'Earth', 金: 'Metal', 水: 'Water',
}

export const ZODIAC_EN: Record<string, string> = {
  鼠: 'Rat', 牛: 'Ox', 虎: 'Tiger', 兔: 'Rabbit', 龙: 'Dragon', 蛇: 'Snake',
  马: 'Horse', 羊: 'Goat', 猴: 'Monkey', 鸡: 'Rooster', 狗: 'Dog', 猪: 'Pig',
  龍: 'Dragon', 馬: 'Horse', 雞: 'Rooster', 豬: 'Pig',
}

export const CHANG_SHENG_EN: Record<string, string> = {
  长生: 'Growth', 沐浴: 'Bath', 冠带: 'Cap', 临官: 'Office', 帝旺: 'Peak',
  衰: 'Decline', 病: 'Illness', 死: 'Death', 墓: 'Tomb', 绝: 'Extinction',
  胎: 'Conception', 养: 'Nourishment',
}

export const SHEN_SHA_EN: Record<string, string> = {
  天乙贵人: 'Heavenly Noble', 文昌贵人: 'Literary Noble', 禄神: 'Prosperity Star',
  羊刃: 'Yang Blade', 太极贵人: 'Taiji Noble', 福星贵人: 'Fortune Noble',
  国印贵人: 'State Seal Noble', 金舆: 'Golden Chariot', 红艳煞: 'Red Beauty',
  天官贵人: 'Heavenly Office Noble', 天厨贵人: 'Heavenly Kitchen Noble',
  学堂: 'Study Hall', 词馆: 'Literary Hall',
  桃花: 'Peach Blossom', 驿马: 'Traveling Horse', 华盖: 'Canopy', 将星: 'General Star',
  劫煞: 'Robbery Star', 灾煞: 'Calamity Star', 亡神: 'Lost Spirit', 六厄: 'Six Hardships',
  金匮: 'Golden Treasury', 孤辰: 'Lonely Star', 寡宿: 'Solitary Star',
  红鸾: 'Red Phoenix', 天喜: 'Heavenly Joy', 元辰: 'Origin Star',
  勾绞煞: 'Entanglement', 血刃: 'Blood Blade', 破碎: 'Fracture',
  天德贵人: 'Heavenly Virtue', 月德贵人: 'Monthly Virtue', 天德合: 'Heavenly Virtue Union',
  月德合: 'Monthly Virtue Union', 天医: 'Heavenly Physician', 天赦: 'Heavenly Pardon',
  四废: 'Four Waste', 魁罡: 'Kuigang', 阴阳差错: 'Yin-Yang Error',
  十恶大败: 'Ten Evils Defeat', 孤鸾煞: 'Lonely Phoenix', 九丑日: 'Nine Ugly Day',
  三奇贵人: 'Three Wonders', 童子煞: 'Tongzi', 德秀贵人: 'Virtue and Elegance',
  金神: 'Metal Spirit', 飞刃: 'Flying Blade', 流霞: 'Flowing Cloud',
  天罗地网: 'Heavenly Net', 六秀日: 'Six Elegance Day', 十灵日: 'Ten Spirits Day',
}

/** 二十八宿首字 → 英文拼音；未知返回空串 */
export const MANSION_EN: Record<string, string> = {
  角: 'Jiao', 亢: 'Kang', 氐: 'Di', 房: 'Fang', 心: 'Xin', 尾: 'Wei', 箕: 'Ji',
  斗: 'Dou', 牛: 'Niu', 女: 'Nv', 虚: 'Xu', 危: 'Wei', 室: 'Shi', 壁: 'Bi',
  奎: 'Kui', 娄: 'Lou', 胃: 'Wei', 昴: 'Mao', 毕: 'Bi', 觜: 'Zi', 参: 'Shen',
  井: 'Jing', 鬼: 'Gui', 柳: 'Liu', 星: 'Xing', 张: 'Zhang', 翼: 'Yi', 轸: 'Zhen',
  婁: 'Lou', 昴宿: 'Mao', 觜宿: 'Zi', 參: 'Shen', 張: 'Zhang', 軫: 'Zhen',
}

export const PENGZU_STEM_EN: Record<string, string> = {
  甲: 'do not open granaries (wealth disperses)',
  乙: 'do not plant trees (they will not thrive)',
  丙: 'do not repair stoves (fire risk)',
  丁: 'do not shave heads (skin irritation)',
  戊: 'do not accept fields (ownership disputes)',
  己: 'do not split contracts (loss to both sides)',
  庚: 'do not weave or stretch looms (wasted work)',
  辛: 'do not make sauces (the host will not taste them)',
  壬: 'do not draw water (take extra care)',
  癸: 'do not litigate (reasoning is weak against a stronger opponent)',
}

export const PENGZU_BRANCH_EN: Record<string, string> = {
  子: 'do not consult divination (invites trouble)',
  丑: 'do not hold a capping ceremony (the guest may not return)',
  寅: 'do not conduct sacrifices (the spirits will not receive them)',
  卯: 'do not dig wells (the water will not be sweet)',
  辰: 'do not wail (deep grief may follow)',
  巳: 'do not travel far (valuables may be mislaid)',
  午: 'do not roof a house (the owner may change plans)',
  未: 'do not take medicine (digestive upset)',
  申: 'do not cut clothes (travel may bring injury)',
  酉: 'do not host guests (drunkenness may lead to wild behaviour)',
  戌: 'do not eat dog meat (restlessness at night)',
  亥: 'do not marry (hard on the groom)',
}

export const MANSION_LUCK_EN: Record<string, string> = {
  吉: 'Auspicious', 凶: 'Challenging', 平: 'Neutral',
}

export const WEEKDAY_EN: Record<string, string> = {
  星期一: 'Monday', 星期二: 'Tuesday', 星期三: 'Wednesday',
  星期四: 'Thursday', 星期五: 'Friday', 星期六: 'Saturday', 星期日: 'Sunday', 星期天: 'Sunday',
}

export const DIRECTION_EN: Record<string, string> = {
  东: 'East', 南: 'South', 西: 'West', 北: 'North', 中: 'Center',
  正东: 'East', 正南: 'South', 正西: 'West', 正北: 'North',
  東: 'East', 東南: 'Southeast', 西南: 'Southwest', 西北: 'Northwest', 東北: 'Northeast',
  东南: 'Southeast', 东北: 'Northeast', 西南方: 'Southwest', 西北方: 'Northwest',
}

const CN_DIGIT: Record<string, number> = {
  〇: 0, 一: 1, 二: 2, 三: 3, 四: 4, 五: 5, 六: 6, 七: 7, 八: 8, 九: 9,
}

function cnNumber(s: string): number | null {
  if (!s) return null
  if (/^[〇一二三四五六七八九]{4}$/.test(s)) {
    const n = [...s].map((c) => CN_DIGIT[c]).join('')
    return Number(n)
  }
  if (s.includes('十')) {
    const [a, b] = s.split('十')
    const tens = a ? CN_DIGIT[a] ?? 0 : 1
    const ones = b ? CN_DIGIT[b] ?? 0 : 0
    return tens * 10 + ones
  }
  if (s.length === 1 && s in CN_DIGIT) return CN_DIGIT[s]
  return null
}

export interface LunarAlmanacEn {
  lunarDate: string
  lunarPillars: string
  weekday: string
  mansion: string
  mansionLuck: string
  pengzu: string[]
  directions: string[]
  clash: string
  sha: string
  nayin: string[]
  spirit: string
}

/** 解析 lunar-javascript 的 toFullString，输出纯英文档案条（无 CJK） */
export function parseLunarAlmanacEn(full: string, dayGan: string, dayZhi: string, dayGz: string): LunarAlmanacEn {
  const head = full.split('纳音')[0].trim()
  const parts = head.split(/\s+/).filter(Boolean)
  const datePart = parts[0] ?? ''
  const yMatch = datePart.match(/([〇一二三四五六七八九]{4})年(.*?)月(.*)/)
  const year = yMatch ? cnNumber(yMatch[1]) : null
  const month = yMatch ? cnNumber(yMatch[2]) : null
  const day = yMatch ? cnNumber(yMatch[3].replace(/日$/, '')) : null
  const lunarDate = year && month && day ? `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}` : 'not available'

  const lunarPillars = parts
    .filter((p) => /(年|月|日|时)$/.test(p))
    .map((p) => {
      const gz = p.match(/[甲乙丙丁戊己庚辛壬癸][子丑寅卯辰巳午未申酉戌亥]/)?.[0]
      const z = p.match(/[子丑寅卯辰巳午未申酉戌亥]/)?.[0]
      const animal = p.match(/\((.)\)/)?.[1]
      if (gz) return `${ganZhiEn(gz)}${animal ? ` (${zodiacEn(animal)})` : ''}`
      if (z) return `${branchEn(z)}${animal ? ` (${zodiacEn(animal)})` : ''}`
      return ''
    })
    .filter(Boolean)
    .join(' · ')

  const bracket = (label: string) => full.match(new RegExp(label + '\\[([^\\]]*)\\]'))?.[1] ?? ''
  const nayinRaw = bracket('纳音').split(/\s+/).filter(Boolean)
  const nayin = nayinRaw.map((n) => elementEn(n.slice(-1))).filter(Boolean)

  const mansionRaw = bracket('星宿')
  const mansionLuckRaw = full.match(/星宿\[[^\]]*\]\((吉|凶|平)\)/)?.[1] ?? ''
  const mansion = mansionRaw ? (MANSION_EN[mansionRaw[0]] ?? '') : ''
  const mansionLuck = MANSION_LUCK_EN[mansionLuckRaw] ?? ''

  const weekdayRaw = full.match(/星期[一二三四五六日天]/)?.[0] ?? ''
  const weekday = WEEKDAY_EN[weekdayRaw] ?? ''
  const spirit = full.includes('西方白虎') ? 'White Tiger of the West' : ''

  const directions = [...full.matchAll(/(喜神|阳贵神|阴贵神|福神|财神)方位\[([^\]]+)\]\(([^)]+)\)/g)]
    .map((m) => {
      const labelEn: Record<string, string> = {
        喜神: 'Joy', 阳贵神: 'Yang Noble', 阴贵神: 'Yin Noble', 福神: 'Fortune', 财神: 'Wealth',
      }
      return `${labelEn[m[1]] ?? m[1]}: ${directionEn(m[3]) || m[3]}`
    })
    .filter(Boolean)

  const clash = full.match(/冲\[\(([^)]+)\)([^\]]*)\]/)
  const clashText = clash ? `Clash: ${ganZhiEn(clash[1]) || ''} ${zodiacEn(clash[2]) || ''}`.trim() : ''
  const sha = full.match(/煞\[([^\]]+)\]/)?.[1] ?? ''

  const pengzu = [
    PENGZU_STEM_EN[dayGan],
    PENGZU_BRANCH_EN[dayZhi],
  ].filter(Boolean) as string[]

  return {
    lunarDate,
    lunarPillars,
    weekday,
    mansion: mansion ? `Mansion: ${mansion}${mansionLuck ? ` (${mansionLuck})` : ''}` : '',
    mansionLuck,
    pengzu,
    directions,
    clash: clashText,
    sha: sha ? `Sha direction: ${directionEn(sha) || sha}` : '',
    nayin,
    spirit,
  }
}

/** 单个天干拼音 */
export function stemEn(g: string): string {
  return STEM_PINYIN[g] ?? ''
}

/** 单个地支拼音 */
export function branchEn(z: string): string {
  return BRANCH_PINYIN[z] ?? ''
}

/** 干支（如「甲子」）→ 「Jia Zi」；无法识别时返回空串，避免中文泄漏 */
export function ganZhiEn(gz: string): string {
  if (!gz || gz.length < 2) return ''
  const s = stemEn(gz[0])
  const b = branchEn(gz[1])
  return s && b ? `${s} ${b}` : ''
}

/** 十神中文 → 英文；未知返回空串，避免中文泄漏 */
export function tenGodEn(g?: string): string {
  if (!g) return ''
  return TEN_GOD_EN[g] ?? ''
}

export function tierEn(t?: string): string {
  if (!t) return ''
  return FORTUNE_TIER_EN[t] ?? ''
}

export function luckTagEn(t?: string): string {
  if (!t) return ''
  return LUCK_TAG_EN[t] ?? ''
}

export function elementEn(e: string): string {
  return ELEMENT_EN[e] ?? ''
}

export function zodiacEn(z: string): string {
  return ZODIAC_EN[z] ?? ''
}

export function directionEn(d: string): string {
  return DIRECTION_EN[d] ?? ''
}
