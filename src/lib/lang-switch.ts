// 语言切换目标路径（纯函数，三棵树共用；供组件与断言直接调用）
//
// ★ 为什么不能只用 twinPath：twinPath 只认 /tw 前缀。英文页（/en/xxx）切中文时，
//   twinPath('/en/xxx','zh-Hant') 会原样返回 /en/xxx，再拼成 /tw/en/xxx 这种坏链接。
//   英文页必须先用 pathForLang 剥掉 /en 前缀。

import type { SiteLang } from './lang'
import { pathForLang } from './lang'
import { twinPath } from './hant'

export function langSwitchHref(pathname: string, target: SiteLang): string {
  if (pathname.startsWith('/en')) return pathForLang(pathname, target)
  if (target === 'en') return pathForLang(pathname, 'en')
  if (target === 'zh-Hant') return twinPath(pathname, 'zh-Hant')
  return twinPath(pathname, 'zh-Hans')
}
