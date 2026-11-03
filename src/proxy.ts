import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { decideRootLang, homeForLang, LANG_COOKIE } from '@/lib/lang'

// 根路径语言导向（仅 `/`，不动任何深链）
//
// 纪律（2026-11-03）：
//   ① 只对首次进入的根路径做导向；/en、/tw 及其子路径一律直出（matcher 只匹配 '/'）
//   ② 爬虫不重定向（否则 Googlebot 会被 302 到非规范地址，canonical 失效）
//   ③ cookie 优先于 IP：用户手动切换过语言后，不再被地理覆盖
//   ④ 写 cookie 后返回，保证下一次访问稳定
//   ⑤ 无 x-vercel-ip-country（本地/非 Vercel）按英文兜底，不报错、不白屏
//
// 部署环境说明：Vercel 提供 x-vercel-ip-country；Cloudflare 提供 cf-ipcountry（一并兼容）。
// 其它托管若无上述请求头，则永远走英文兜底 —— 这是已记录的限制，不是假装生效。

export function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl

  // 只处理根路径。理论上 matcher 已限定，这里再兜一层，防 matcher 漂移。
  if (pathname !== '/') return NextResponse.next()

  const userAgent = request.headers.get('user-agent')
  const country =
    request.headers.get('x-vercel-ip-country') ??
    request.headers.get('cf-ipcountry')
  const cookie = request.cookies.get(LANG_COOKIE)?.value

  const target = decideRootLang({ cookie, country, userAgent })

  // 目标就是简体首页：不跳转；有明确地理信号时把判定写进 cookie
  if (target === 'zh-Hans') {
    const res = NextResponse.next()
    if (!cookie && country) {
      res.cookies.set(LANG_COOKIE, 'zh-Hans', { path: '/', maxAge: 60 * 60 * 24 * 365, sameSite: 'lax' })
    }
    return res
  }

  const url = request.nextUrl.clone()
  url.pathname = homeForLang(target)
  // 保留查询串（落地参数如 utm_source / ref 不丢）
  url.search = search
  const res = NextResponse.redirect(url)
  // 仅自动判定时写入；用户手动切换的 cookie 不被改写
  if (!cookie) {
    res.cookies.set(LANG_COOKIE, target, { path: '/', maxAge: 60 * 60 * 24 * 365, sameSite: 'lax' })
  }
  return res
}

export const config = {
  matcher: ['/'],
}
