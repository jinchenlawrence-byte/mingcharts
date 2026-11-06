import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { decideRootLang, homeForLang, LANG_COOKIE, LANG_ASKED_COOKIE } from '@/lib/lang'

// 根路径语言导向（仅 `/`，不动任何深链）
//
// 纪律（2026-11-03 止血后修订）：
//   ① 默认简体，不跳转：中国大陆、未知地区、无国家头一律留在 `/`
//   ② 只有首次访问（无任何语言 cookie）且国家明确时才跳：
//      TW/HK/MO → /tw；GB/US/CA/AU/NZ/IE → /en；MY/SG 与其余 → 简体
//   ③ 只要检测到 mc_lang 或 mc_lang_asked，永不跳转（用户已被一次跳转伤过）
//   ④ 爬虫不重定向（否则 Googlebot 会被 302 到非规范地址，canonical 失效）
//   ⑤ 自动跳转不写 mc_lang：否则第二次访问就不再跳，地区用户会在简体/英文之间来回
//   ⑥ 无 x-vercel-ip-country（本地/非 Vercel）按简体兜底，不报错、不白屏
//
// 部署环境说明：Vercel 提供 x-vercel-ip-country；Cloudflare 提供 cf-ipcountry（一并兼容）。

export function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl

  // ★ 2026-11 收录整治：/bazi 的年/月/日 URL 统一补零。
  //   现状 /bazi/1990/3 与 /bazi/1990/03 都返回 200 且各指自身，属于重复内容。
  //   只做 308 永久归一，不改页面内容；日页虽 noindex，也一并归一避免抓取浪费。
  const bazi = pathname.match(/^\/bazi\/(\d{4})(?:\/(\d{1,2})(?:\/(\d{1,2}))?)?\/?$/)
  if (bazi) {
    const [, year, month, day] = bazi
    if (month) {
      const paddedMonth = month.padStart(2, '0')
      const paddedDay = day ? day.padStart(2, '0') : null
      const isNormalized = month === paddedMonth && (!day || day === paddedDay)
      if (!isNormalized) {
        const url = request.nextUrl.clone()
        url.pathname = `/bazi/${year}/${paddedMonth}${paddedDay ? `/${paddedDay}` : ''}`
        return NextResponse.redirect(url, 308)
      }
    }
  }

  // 只处理根路径。理论上 matcher 已限定，这里再兜一层，防 matcher 漂移。
  if (pathname !== '/') return NextResponse.next()

  const userAgent = request.headers.get('user-agent')
  const country =
    request.headers.get('x-vercel-ip-country') ??
    request.headers.get('cf-ipcountry')
  const cookie = request.cookies.get(LANG_COOKIE)?.value
  const askedCookie = request.cookies.get(LANG_ASKED_COOKIE)?.value

  const target = decideRootLang({ cookie, askedCookie, country, userAgent })

  // 目标就是简体首页：不跳转（绝大多数用户走这条）
  if (target === 'zh-Hans') return NextResponse.next()

  const url = request.nextUrl.clone()
  url.pathname = homeForLang(target)
  // 保留查询串（落地参数如 utm_source / ref 不丢）
  url.search = search
  // 不写 cookie：保留“首次访问才按地区跳”的语义
  return NextResponse.redirect(url)
}

export const config = {
  // ★ 2026-11-06 matcher 收窄：旧的全量通配（/bazi/:path*）会让 /bazi 下全部 URL（含约 7.3 万日页）
  //   每个请求都进一次 middleware。但本文件只对「月份或日期未补零」的形态做 308，
  //   已补零的 URL 不会产生任何响应差异。以下三条正则只命中需要归一的三种形态：
  //     /bazi/1990/3      → 月 1 位
  //     /bazi/1990/3/15   → 月 1 位（日任意）
  //     /bazi/1990/03/5   → 日 1 位
  //   /bazi、/bazi/1990、/bazi/1990/03、/bazi/1990/03/15 等规范路径不再经过 middleware。
  matcher: [
    '/',
    '/bazi/:year(\\d{4})/:month(\\d)',
    '/bazi/:year(\\d{4})/:month(\\d)/:day(\\d{1,2})',
    '/bazi/:year(\\d{4})/:month(\\d{2})/:day(\\d)',
  ],
}
