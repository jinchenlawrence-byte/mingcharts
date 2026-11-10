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

// 410 响应体：不引用站点样式（越界日页不该走渲染管线），只给一句人话 + 回程链接。
const GONE_HTML = `<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><title>日期已超出可查询范围</title><meta name="robots" content="noindex"></head><body><h1>日期已超出可查询范围</h1><p>本页仅支持 1950-01-01 至 2010-12-31 的出生日期排盘，该日期已不再提供内容（410 Gone）。</p><p>This date is outside the supported range (1950-01-01 to 2010-12-31); the page has been permanently removed.</p><p><a href="/bazi">返回八字算命</a></p></body></html>`

export function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl

  // ★ 2026-11-10（GSC 404 清理）：繁体与英文树没有 /bazi 路由，
  //   但 Google 仍在抓 /tw/bazi/1978/08、/en/bazi/1978/08/20 等深链（各返回 404）。
  //   这些 URL 多来自历史内链/hreflang 残留：对搜索引擎是错误信号，对用户是死路。
  //   301 到对应语言树的入口页（/tw、/en）—— 保留任何残留权重，404 清零。
  //   注意：不能 301 到 /bazi（中文页）—— 那会把繁体/英文用户直接扔进简体内容。
  const otherTreeBazi = pathname.match(/^\/(tw|en)\/bazi(?:\/.*)?$/)
  if (otherTreeBazi) {
    const url = request.nextUrl.clone()
    url.pathname = `/${otherTreeBazi[1]}`
    url.search = ''
    return NextResponse.redirect(url, 301)
  }

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

  // ★ 2026-11-09：日页只覆盖 1950-01-01 ～ 2010-12-31（边界日正常 200）。
  //   范围外返回 410 Gone，而不是 404（不存在）或 200（正常排盘页）：
  //   日页本身 noindex，410 才是给搜索引擎的「已删除」信号 —— 否则越界日期会被当成
  //   有效薄内容反复抓取，正是这次要消掉的浪费。响应体给一段明确说明 + 回 /bazi 的链接。
  const dayGone = pathname.match(/^\/bazi\/(\d{1,4})\/(\d{2})\/(\d{2})\/?$/)
  if (dayGone) {
    const yearNum = Number(dayGone[1])
    if (yearNum < 1950 || yearNum > 2010) {
      return new NextResponse(GONE_HTML, {
        status: 410,
        headers: {
          'content-type': 'text/html; charset=utf-8',
          // 410 已是删除信号；再叠一层 noindex，防止抓到就不放的爬虫行为
          'x-robots-tag': 'noindex',
          'cache-control': 'public, s-maxage=86400, stale-while-revalidate=604800',
        },
      })
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
    // ★ 2026-11-09：日页 410 判定必须在边缘层完成（页面组件无法自行返回 410）。
    //   已补零的在范围内日期会立刻 next()，不产生响应差异；只为能判出越界年份多一次边缘调用。
    '/bazi/:year(\\d{1,4})/:month(\\d{2})/:day(\\d{2})',
    '/bazi/:year(\\d{4})/:month(\\d)',
    '/bazi/:year(\\d{4})/:month(\\d)/:day(\\d{1,2})',
    '/tw/bazi/:path*',
    '/en/bazi/:path*',
    '/bazi/:year(\\d{4})/:month(\\d{2})/:day(\\d)',
  ],
}
