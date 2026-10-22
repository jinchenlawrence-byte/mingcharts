// hreflang 矩阵（单一事实源）
//
// 为什么单独成文件：简繁两边的 alternates 必须【逐字一致且双向】，任何一边手写就会漂移。
// 页面侧只传「简体路径」，矩阵由这里生成；canonical 仍由各页自己指向自身。
import { twinPath } from './hant'

/** 繁体语系标识：一个 zh-Hant 内容，对多个地区标签（台/港/澳）声明同一 URL */
export const HANT_LOCALES = ['zh-Hant', 'zh-TW', 'zh-HK', 'zh-MO'] as const

/** 完整语言集合（含简体与 x-default），供断言与文档引用 */
export const HANT_HREFLANG = ['zh-Hans', ...HANT_LOCALES, 'x-default'] as const

/**
 * 生成 Next metadata.alternates.languages。
 * @param hansPath 简体页路径（如 '/shengxiao/shu'），繁体路径由 twinPath 推导
 */
export function hantAlternates(hansPath: string): Record<string, string> {
  const hans = hansPath.startsWith('/') ? hansPath : `/${hansPath}`
  const hant = twinPath(hans, 'zh-Hant')
  const languages: Record<string, string> = {
    'zh-Hans': hans,
    'x-default': hans,
  }
  for (const locale of HANT_LOCALES) languages[locale] = hant
  return languages
}
