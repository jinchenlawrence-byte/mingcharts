// 公开示例命书（HANDOFF-万字补全与文案返修 §三）
// ★ 静态资产模式：与 daily-signs / daily-personal 同类——一次性脚本预生成 JSON，
//   页面读 JSON 渲染，零 AI、零 IO。生成脚本 scripts/build-demo-fatebook.mjs 不纳入 verify。
// ★ 本文件是「前 30% 裁剪」的唯一事实源：生成脚本、示例页、验收断言共用这些常量与函数。
import type { AnalyzableChart, LuckCycles } from './analysis'
import type { AIPaidAnalysis } from './aiAnalysis'
import type { SimilarCase } from './caseSearch'

// ── 示例出生资料（★ 虚构：不得使用用户八字 1991-04-12 03:10，不得用命例库真实人物）──
export const DEMO_BIRTH = {
  year: 1990, month: 6, day: 15, hour: 10, minute: 30,
  gender: 1 as const, place: '上海', lng: 121.4737, zone: 'Asia/Shanghai'
}
export const DEMO_NAME = '示例 · 甲先生'

// ── 「前 30%」边界（按板块切，不按字数拦腰截断）──
export const DEMO_FULL_SECTIONS: Array<keyof AIPaidAnalysis> = ['overview', 'personality', 'yongShen']
export const DEMO_SUMMARY_BODY = 150   // 摘要正文截取码点数
export const DEMO_SUMMARY_MAX = 200    // 摘要含截断提示的总长上限（断言读它）
export const DEMO_DAYUN_COUNT = 2      // 岁运只展示前 2 步大运
export const DEMO_LIUNIAN_COUNT = 1    // 流年只展示当年
export const DEMO_CASE_COUNT = 1       // 古籍命例只展示 1 条

export interface DemoFatebook {
  meta: {
    name: string
    gender: string
    birthText: string
    place: string
    fictional: true
    generatedAt: string
    // ★ 岁运锚定年份（= 生成时 luckCycles.currentYear，单一事实源）。
    //   静态资产跨年过期提醒：B8 断言 anchoredYear >= 运行年-1；翻红＝预期的年度刷新提醒（重跑 build:demo），非缺陷。
    anchoredYear: number
  }
  pillars: Array<{ label: string; ganZhi: string; tenGodGan: string; cangGanText: string }>
  dayMaster: string
  taiYuan: string
  mingGong: string
  wangShuai: string
  geJu: string
  daYun: Array<{ ganZhi: string; startYear: number; endYear: number; startAge: number }>
  sections: Record<keyof AIPaidAnalysis, string>  // 前 3 完整 + 后 7 摘要
  fullSections: Array<keyof AIPaidAnalysis>       // = DEMO_FULL_SECTIONS，供页面打标
  sectionList: Array<{ key: keyof AIPaidAnalysis; name: string }> // 板块键名与显示名（页面自包含，无需 import aiAnalysis）
  luckCycles: LuckCycles                          // 已裁剪：前 2 步大运 + 当年流年，无流月
  similarCases: SimilarCase[]                     // 已裁剪：1 条
}

// 摘要裁剪：截正文后补「完整内容约 X 字」提示（总长 ≤ DEMO_SUMMARY_MAX）
export function toSummary(text: string): string {
  const chars = [...text]
  const body = chars.slice(0, DEMO_SUMMARY_BODY).join('')
  const hint = `……（完整内容约 ${chars.length} 字）`
  const budget = DEMO_SUMMARY_MAX - [...hint].length
  return [...body].slice(0, budget).join('') + hint
}

// 由完整生成结果裁剪出公开示例（纯函数，生成脚本调用；断言验证其输出）
export function buildDemoFatebook(args: {
  chart: AnalyzableChart
  sections: AIPaidAnalysis
  luckCycles: LuckCycles
  similarCases: SimilarCase[]
  generatedAt: string
  sectionMeta: Array<{ key: keyof AIPaidAnalysis; name: string }>
}): DemoFatebook {
  const { chart, sections, luckCycles, similarCases, generatedAt, sectionMeta } = args
  const p = chart.pillars
  const trimmed = {} as Record<keyof AIPaidAnalysis, string>
  for (const key of Object.keys(sections) as Array<keyof AIPaidAnalysis>) {
    const v = sections[key]
    if (typeof v !== 'string') continue // 跳过 _usage 等附属键
    trimmed[key] = DEMO_FULL_SECTIONS.includes(key) ? v : toSummary(v)
  }
  return {
    meta: {
      name: DEMO_NAME,
      gender: chart.input.gender === 1 ? '男' : '女',
      birthText: `公历 ${chart.input.year} 年 ${chart.input.month} 月 ${chart.input.day} 日 ${chart.input.hour} 时 ${chart.input.minute} 分`,
      place: DEMO_BIRTH.place,
      fictional: true,
      generatedAt,
      anchoredYear: luckCycles.currentYear
    },
    pillars: [
      { label: '年柱', ganZhi: p.year.ganZhi, tenGodGan: p.year.tenGodGan, cangGanText: p.year.cangGan.map((g, i) => `${g}${p.year.tenGodCangGan[i]}`).join('、') },
      { label: '月柱', ganZhi: p.month.ganZhi, tenGodGan: p.month.tenGodGan, cangGanText: p.month.cangGan.map((g, i) => `${g}${p.month.tenGodCangGan[i]}`).join('、') },
      { label: '日柱', ganZhi: p.day.ganZhi, tenGodGan: p.day.tenGodGan || '日主', cangGanText: p.day.cangGan.map((g, i) => `${g}${p.day.tenGodCangGan[i]}`).join('、') },
      { label: '时柱', ganZhi: p.hour.ganZhi, tenGodGan: p.hour.tenGodGan, cangGanText: p.hour.cangGan.map((g, i) => `${g}${p.hour.tenGodCangGan[i]}`).join('、') }
    ],
    dayMaster: chart.dayMaster,
    taiYuan: chart.taiYuan,
    mingGong: chart.mingGong,
    wangShuai: chart.analysis.wangShuai,
    geJu: chart.analysis.geJu,
    daYun: chart.daYun.map(d => ({ ganZhi: d.ganZhi, startYear: d.startYear, endYear: d.endYear, startAge: d.startAge })),
    sections: trimmed,
    fullSections: [...DEMO_FULL_SECTIONS],
    sectionList: sectionMeta.map(s => ({ key: s.key, name: s.name })),
    luckCycles: {
      currentDaYunGanZhi: luckCycles.currentDaYunGanZhi,
      currentYear: luckCycles.currentYear,
      daYun: luckCycles.daYun.slice(0, DEMO_DAYUN_COUNT),
      // ★ 流年范围于 19 号扩为「过去 8 年应期回看 + 未来三年」后，slice(0,1) 会取到 8 年前；
      //   示例只展示【当年】，故按 current 选取（与范围排序解耦）
      liuNian: luckCycles.liuNian.filter(y => y.current).slice(0, DEMO_LIUNIAN_COUNT),
      liuYue: []
    },
    similarCases: similarCases.slice(0, DEMO_CASE_COUNT)
  }
}
