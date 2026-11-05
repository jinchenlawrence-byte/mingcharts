// English UI copy for the shared Ziwei result skeleton.
//
// The skeleton (components/reports/ZiweiResultView.tsx) is shared by /ziwei, /tw/ziwei
// and /en/ziwei. Chinese trees take their text from lib/hant.localize; the English tree
// reads this table instead. Keep this file CJK-free.
import type { ZiweiAIReport } from '@/lib/aiZiwei'

export const ZIWEI_UI_EN = {
  chartTitle: 'Zi Wei chart',
  trueSolar: 'True solar time: ',
  minutes: ' min',
  dstNote: 'This birth time falls near a daylight-saving transition; the engine resolved it automatically.',
  soulLabel: 'Soul',
  bodyLabel: 'Body',
  badgeLife: 'Life',
  badgeBody: 'Body',
  badgeDecade: 'Decade',
  badgeAnnual: 'Annual',
  badgeMinor: 'Minor',
  emptyPalace: 'Empty palace',
  clickPalace: 'Tap a palace to see its stars',
  palaceWord: ' palace',
  bodyTag: 'Body palace',
  majorStars: 'Major stars',
  emptyBorrow: 'Empty palace, borrowing the opposite palace: ',
  oppositeEmpty: 'the opposite palace is empty too',
  minorMixed: 'Minor and mixed stars',
  none: 'None',
  changsheng: 'Long-life stage: ',
  decadalAge: 'Decadal ages: ',
  patterns: 'Traditional patterns',
  conditions: 'Conditions: ',
  strengthenedBy: 'Strengthened by: ',
  brokenBy: 'Broken by: ',
  basis: 'Basis: ',
  transforms: 'Birth-year Four Transformations',
  starsLabel: 'Stars: ',
  transformsLabel: 'Transformations: ',
  basePalaceMid: ', with the Life palace on natal ',
  inDepth: 'In-depth reading',
  regen: 'Regenerate free',
  regenBusy: 'Regenerating...',
  regenNote: 'No extra charge · the AI rewrites the full report and replaces this one',
  lockedChip: 'Full text after purchase',
  unlock: 'Unlock the full English report',
  extraCycles: 'Additional cycles',
  smallLimitLine: 'Small limit: age ',
  originPalace: 'Origin palace: ',
  selfMutations: 'Palace self-transformations',
  laiYin: 'Lai Yin palace: ',
} as const

/** Twelve AI section titles, in the same order as the shared SECTIONS table. */
export const ZIWEI_AI_TITLES_EN: Record<keyof ZiweiAIReport, string> = {
  overview: 'Chart overview',
  personality: 'Temperament',
  palaces: 'Twelve palaces',
  career: 'Career structure',
  wealth: 'Wealth',
  marriage: 'Relationships',
  health: 'Health tendencies',
  transforms: 'Four Transformations',
  patterns: 'Patterns',
  decadal: 'Decade',
  yearly: 'Annual and monthly',
  advice: 'Practical advice',
}

/** Map the English rule-level back to the badge palette used by the Chinese skeleton. */
export const LEVEL_STYLE_EN: Record<string, string> = {
  Favorable: 'bg-green-100 text-green-700',
  Neutral: 'bg-gold/10 text-ink/70',
  Challenging: 'bg-red-100 text-red-700',
}

/** Transformation colour palette by English label prefix. */
export function mutagenStyleEn(mutagen: string): string {
  if (mutagen.startsWith('Lu')) return 'text-green-700'
  if (mutagen.startsWith('Quan')) return 'text-indigo-700'
  if (mutagen.startsWith('Ke')) return 'text-cyan-700'
  if (mutagen.startsWith('Ji')) return 'text-red-700'
  return 'text-ink'
}
