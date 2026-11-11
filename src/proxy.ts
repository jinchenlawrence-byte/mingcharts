import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { decideRootLang, homeForLang, LANG_COOKIE, LANG_ASKED_COOKIE } from '@/lib/lang'
import { verifyShareTokenEdge, shareGoneHtml } from '@/lib/hemunShareEdge'

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

// 繁英树没有 /bazi 内容页，深链一律 410（2026-11-11）；入口页仍 301 回本语言首页。
function GONE_OTHER_TREE_HTML(lang: string): string {
  const home = `/${lang}`
  const title = lang === 'tw' ? '此頁面已不存在' : 'This page no longer exists'
  const body =
    lang === 'tw'
      ? `繁體站沒有對應的八字排盤內容，此連結已永久移除（410 Gone）。<p><a href="${home}">回到首頁</a></p>`
      : `The English site has no matching Bazi reading page, so this link has been permanently removed (410 Gone).<p><a href="${home}">Back to home</a></p>`
  return `<!doctype html><html lang="${lang === 'tw' ? 'zh-Hant' : 'en'}"><head><meta charset="utf-8"><title>${title}</title><meta name="robots" content="noindex"></head><body><h1>${title}</h1><p>${body}</p></body></html>`
}

export async function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl

  // ★ 2026-11-11：合婚分享卡用签名令牌承载，无效/过期必须是 410 而不是 200。
  //   200 会被搜索引擎当成正常页面，攒成软 404，拉低站点质量信号；
  //   410 仍返回完整 HTML，用户看到的是同一套提示，体验不变。
  const sharePage = pathname.match(/^\/(?:(tw)\/)?hemun\/r\/?$/)
  if (sharePage) {
    const lang: 'zh' | 'tw' = sharePage[1] ? 'tw' : 'zh'
    const d = request.nextUrl.searchParams.get('d') ?? ''
    const e = Number(request.nextUrl.searchParams.get('e'))
    const s = request.nextUrl.searchParams.get('s') ?? ''
    const check = await verifyShareTokenEdge(d, e, s)
    if (!check.ok) {
      return new NextResponse(shareGoneHtml(lang, check.reason ?? 'invalid'), {
        status: 410,
        headers: {
          'content-type': 'text/html; charset=utf-8',
          'x-robots-tag': 'noindex',
          'cache-control': 'no-store',
        },
      })
    }
    return NextResponse.next()
  }

  // ★ 2026-11-10（GSC 404 清理）：繁体与英文树没有 /bazi 路由，
  //   但 Google 仍在抓 /tw/bazi/1978/08、/en/bazi/1978/08/20 等深链（各返回 404）。
  //   这些 URL 多来自历史内链/hreflang 残留：对搜索引擎是错误信号，对用户是死路。
  // ★ 2026-11-11（深链改 410）：原 301 到语言首页与 URL 主题无关（1978 年 8 月出生），
  //   Google 按 soft 404 处理——既不传权重，又持续消耗抓取。外链核查（2026-11-11）：
  //   GSC 效果导出 0 条命中、站内 21 天 events 0 次访问、仓库无外链记录，
  //   当前也不再向 /tw/bazi 输出 hreflang、sitemap 不含该路径 → 未见实质外链。
  //   故深链改 410（与越界日页口径一致）；仅入口页 /tw/bazi 保留 301 回本语言首页。
  const otherTreeBaziEntry = pathname.match(/^\/(tw|en)\/bazi\/?$/)
  if (otherTreeBaziEntry) {
    const url = request.nextUrl.clone()
    url.pathname = `/${otherTreeBaziEntry[1]}`
    url.search = ''
    return NextResponse.redirect(url, 301)
  }

  const otherTreeBaziDeep = pathname.match(/^\/(tw|en)\/bazi\/.+$/)
  if (otherTreeBaziDeep) {
    const lang = otherTreeBaziDeep[1]
    return new NextResponse(GONE_OTHER_TREE_HTML(lang), {
      status: 410,
      headers: {
        'content-type': 'text/html; charset=utf-8',
        // 410 已是删除信号；再叠一层 noindex，防止抓到就不放的爬虫行为
        'x-robots-tag': 'noindex',
        'cache-control': 'public, s-maxage=86400, stale-while-revalidate=604800',
      },
    })
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
    // ★ 2026-11-11：分享卡无效/过期需在边缘层返回 410（页面组件无法自行返回 410）
    '/hemun/r',
    '/tw/hemun/r',
  ],
}
