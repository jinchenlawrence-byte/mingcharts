// AI 输出合规判据（单一事实源）：产品防线（各 generate* 函数）与验收脚本共用
// 依据纪律 §8.4.5（否定式）、§8.4.6（抽样）

export const FORBIDDEN_WORDS = ['大吉', '大凶', '积极进取', '突破性进展', '必', '一定', '注定'] as const

const GANZHI_RE = /[甲乙丙丁戊己庚辛壬癸][子丑寅卯辰巳午未申酉戌亥]/g

export const splitSentences = (t: string): string[] =>
  t.split(/[。；！？\n]/).map(s => s.trim()).filter(Boolean)

export interface HitSentence {
  w: string
  s: string
}

// 禁用词检查（§8.4.5）：
//   hits    —— 真违规（FAIL）
//   skipped —— 词前 3 字内紧邻否定（无/非/不/未…，不跨标点），INFO 留痕不判失败
// strictBi：合婚口径物理禁「必」字（含不必/未必，任务书 aiHemun 第9条）
export function findForbidden(text: string, strictBi = false): { hits: HitSentence[]; skipped: HitSentence[] } {
  const sentences = splitSentences(text)
  const NEG_BEFORE = /(并非|不是|不可|不属|非|无|未|没有|不具|不含)[^，、。；！？]{0,3}$/
  const hits: HitSentence[] = []
  const skipped: HitSentence[] = []
  for (const w of FORBIDDEN_WORDS) {
    for (const s of sentences) {
      let idx = s.indexOf(w)
      while (idx >= 0) {
        const negNear = NEG_BEFORE.test(s.slice(0, idx))
        if (negNear && !(strictBi && w === '必')) {
          if (!skipped.some(h => h.w === w && h.s === s)) skipped.push({ w, s })
        } else if (!hits.some(h => h.w === w && h.s === s)) {
          hits.push({ w, s })
        }
        idx = s.indexOf(w, idx + 1)
      }
    }
  }
  return { hits, skipped }
}

// 产品设定/古法/民俗维度的触发词——这些维度不得被说成典籍所载
const BASIS_CONFUSE = /生肖|纳音|大运同步/

// 归属断言（混淆词被说成属于典籍）才是真违规；仅同句共现不等于违规——
// 依据分级的标准正确写法就是「干支为典籍、纳音为古法、生肖为民俗」三者同句并列。
// 方向一：混淆词 → 归属词（源自/依据/为/乃/与…）→ 典籍（所载）
// 方向二：典籍 → 有明训/明载/载有/论及…（断言典籍支持混淆词）
// 归属词两侧窗口都卡 14 字内且不跨逗号——逗号前后通常是不同主语的并列分级
const ATTR_RE = new RegExp(
  '(?:生肖|纳音|大运同步)[^。；！，、]{0,14}' +
  '(?:源自|源于|出自|根据|依据|按照|本于|出于|为|乃|与)[^。；！，、]{0,4}典籍(?:所载)?' +
  '|典籍[^。；！，、]{0,10}(?:有明训|明载|明训|载有|论及|有言)',
  'g'
)
const ATTR_WORDS = ['源自', '源于', '出自', '根据', '依据', '按照', '本于', '出于', '为', '乃', '与',
  '有明训', '明载', '明训', '载有', '论及', '有言']
// 归属词前 3 字内紧邻否定（非/不是/并非/无/未…）→ 归属断言被否认，INFO 留痕
const NEG_BEFORE_ATTR = /(并非|不是|不可|非|无|未|不)[^，、。；！？]{0,3}$/

// 依据混淆两档分类：
//   fail —— 存在非否定的归属断言（混淆维度被说成典籍所载）
//   info —— 归属断言被紧邻否定否认（合规表述，打印供人工复核，不判失败）
export function classifyConfuse(text: string): { fail: string[]; info: string[] } {
  const fail: string[] = []
  const info: string[] = []
  for (const s of splitSentences(text)) {
    if (!BASIS_CONFUSE.test(s) || !s.includes('典籍')) continue
    ATTR_RE.lastIndex = 0
    let m: RegExpExecArray | null
    let sentenceFail = false
    let sentenceInfo = false
    while ((m = ATTR_RE.exec(s))) {
      const frag = m[0]
      const negated = ATTR_WORDS.some(w => {
        const i = frag.indexOf(w)
        return i >= 0 && NEG_BEFORE_ATTR.test(frag.slice(0, i))
      })
      if (negated) sentenceInfo = true
      else sentenceFail = true
    }
    // 同句若有任一非否定归属 → FAIL；仅否定归属 → INFO
    if (sentenceFail) fail.push(s)
    else if (sentenceInfo) info.push(s)
  }
  return { fail, info }
}

// 干支溯源（§2.3 第7项）：返回文中出现但不在事实集内的干支（编造/笔误）
export function unknownGanzhi(text: string, facts: Set<string>): string[] {
  return [...new Set(text.match(GANZHI_RE) || [])].filter(g => !facts.has(g))
}

// 通用「调用 → 校验 → 重试一次」编排：
//   validate 返回 null 为通过；返回错误描述则打印并重试；重试仍不通过 → null（调用方回退规则版）
export async function withComplianceRetry<T>(
  attempt: () => Promise<T | null>,
  validate: (r: T) => string | null,
  label: string
): Promise<T | null> {
  const first = await attempt()
  if (!first) return null
  const err = validate(first)
  if (!err) return first
  const second = await attempt()
  if (!second) return null
  const err2 = validate(second)
  if (err2) {
    // ★ 回退必须可见（任务书 §四）：重试后放弃 AI 结果不得静默
    console.warn(`[${label}] 重试后仍不合规（${err2}），放弃 AI 结果，回退规则版`)
    return null
  }
  return second
}
