// 生肖年龄 / 民國年次：纯函数数据层（供页面与脚本共用）
//
// 本轮只服务 P0 的 64 个繁体页：
//   /tw/shengxiao/{animal}/age  12 个
//   /tw/age/{roc}               51 个（民國 50–100）
//   /tw/age                     1 个 hub
//
// 纪律：
//   ① 生肖按「立春」分界（命理口径）。年份表里写「立春後出生」，
//      1–2 月立春前出生屬上一年，页面必须给出这句说明。
//   ② 實歲给区间（生日已過取上限、未過取下限），不假装知道具体生日。
//   ③ 民國換算固定西元 = 民國 + 1911。
//   ④ 本文件不引 React、不读文件系统，测试可直接 import。

import { getShengXiao } from './shengxiaoData'

/** 民國元年對應西元 */
export const ROC_OFFSET = 1911

/** 年龄参照年：按当前年份走；每年立春后无需改代码 */
export const AGE_REF_YEAR = new Date().getFullYear()

/** 年龄表覆盖的出生年份（9 轮 × 12 年） */
export const AGE_BIRTH_FROM = 1928
export const AGE_BIRTH_TO = 2024

/** 首批民國年次范围：民國 50（1961）～ 100（2011） */
export const ROC_FROM = 50
export const ROC_TO = 100

/** 十二生肖顺序：1900 年为庚子鼠年（立春后） */
const ZODIAC_SLUGS = [
  'shu', 'niu', 'hu', 'tu', 'long', 'she',
  'ma', 'yang', 'hou', 'ji', 'gou', 'zhu',
] as const

export type ZodiacSlug = (typeof ZODIAC_SLUGS)[number]

/** 某年（立春后）对应的生肖 slug */
export function animalSlugForYear(year: number): ZodiacSlug {
  const idx = (((year - 1900) % 12) + 12) % 12
  return ZODIAC_SLUGS[idx]
}

/** 某年在十二生肖里的前后邻居（用于页脚横链） */
export function neighborAnimals(slug: string): { prev: ZodiacSlug; next: ZodiacSlug } {
  const i = ZODIAC_SLUGS.indexOf(slug as ZodiacSlug)
  const safe = i < 0 ? 0 : i
  return {
    prev: ZODIAC_SLUGS[(safe + 11) % 12],
    next: ZODIAC_SLUGS[(safe + 1) % 12],
  }
}

/** 该生肖在 1928–2024 之间的全部出生年份 */
export function birthYearsForAnimal(
  slug: string,
  from = AGE_BIRTH_FROM,
  to = AGE_BIRTH_TO
): number[] {
  const out: number[] = []
  for (let y = from; y <= to; y++) {
    if (animalSlugForYear(y) === slug) out.push(y)
  }
  return out
}

export interface AgeRow {
  /** 出生年份（西元，立春后） */
  year: number
  /** 民國年次 */
  roc: number
  /** 實歲下限（生日未到） */
  ageMin: number
  /** 實歲上限（生日已到） */
  ageMax: number
  /** 虛歲 */
  xu: number
  /** 生肖 slug */
  animal: ZodiacSlug
}

/** 单行年龄换算；birthYear 晚于 refYear 时按 0 岁处理 */
export function ageRow(birthYear: number, refYear = AGE_REF_YEAR): AgeRow {
  const ageMax = Math.max(0, refYear - birthYear)
  const ageMin = Math.max(0, ageMax - 1)
  return {
    year: birthYear,
    roc: birthYear - ROC_OFFSET,
    ageMin,
    ageMax,
    xu: ageMax + 1,
    animal: animalSlugForYear(birthYear),
  }
}

/** 某生肖的整张年龄表（按出生年份升序） */
export function zodiacAgeRows(slug: string, refYear = AGE_REF_YEAR): AgeRow[] {
  return birthYearsForAnimal(slug).map((y) => ageRow(y, refYear))
}

/** 某生肖在当前年份的年龄区间（用于首屏答案卡与标题） */
export function animalAgeRange(
  slug: string,
  refYear = AGE_REF_YEAR
): { min: number; max: number; xuMin: number; xuMax: number; count: number } {
  const rows = zodiacAgeRows(slug, refYear)
  if (rows.length === 0) return { min: 0, max: 0, xuMin: 1, xuMax: 1, count: 0 }
  const ages = rows.map((r) => r.ageMax)
  return {
    min: Math.min(...rows.map((r) => r.ageMin)),
    max: Math.max(...ages),
    xuMin: Math.min(...rows.map((r) => r.xu)),
    xuMax: Math.max(...rows.map((r) => r.xu)),
    count: rows.length,
  }
}

/** 民國 → 西元 */
export function yearFromRoc(roc: number): number {
  return roc + ROC_OFFSET
}

/** 西元 → 民國 */
export function rocFromYear(year: number): number {
  return year - ROC_OFFSET
}

/** 首批年次列表 50–100 */
export function rocRange(): number[] {
  const out: number[] = []
  for (let r = ROC_FROM; r <= ROC_TO; r++) out.push(r)
  return out
}

export interface RocRow {
  roc: number
  year: number
  animal: ZodiacSlug
  ageMin: number
  ageMax: number
  xu: number
  name: string
}

/** 单条年次记录（name 为繁体生肖名） */
export function rocRow(roc: number, refYear = AGE_REF_YEAR): RocRow {
  const year = yearFromRoc(roc)
  const a = ageRow(year, refYear)
  const sx = getShengXiao(a.animal)
  const raw = sx?.name ?? ''
  // 简体生肖名转繁体：只有「龙/马/鸡/猪」需要转
  const name = raw
    .replace('龙', '龍')
    .replace('马', '馬')
    .replace('鸡', '雞')
    .replace('猪', '豬')
  return { roc, year, animal: a.animal, ageMin: a.ageMin, ageMax: a.ageMax, xu: a.xu, name }
}

/** 年次页的同龄段对照（前后各 5 个年次） */
export function rocNeighborhood(roc: number, refYear = AGE_REF_YEAR): RocRow[] {
  const out: RocRow[] = []
  for (let r = roc - 5; r <= roc + 5; r++) {
    // 民國 1 年（1912）～ 民國 189 年（2100）
    if (r < 1 || r > 189) continue
    out.push(rocRow(r, refYear))
  }
  return out
}

/** 年龄区间的展示文本：0 岁时只写 0，其余写 48–49 */
export function ageRangeText(row: AgeRow): string {
  return row.ageMin === row.ageMax ? String(row.ageMax) : `${row.ageMin}–${row.ageMax}`
}
