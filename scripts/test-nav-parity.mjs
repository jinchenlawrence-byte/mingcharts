// 三树导航对齐断言（2026-11-04 统一第一批）
//
// 断的是什么：
//   ① 三棵树的导航都来自同一张表（lib/site-nav.ts），layout/页面里不再手写链接清单
//   ② 核心入口（工具 + 内容 + 账号）三语一个不少；某一语言确实没有页面时必须显式声明，
//      不允许“悄悄少一个入口”
//   ③ 每个入口在该语言下解析出的 URL 都真有 page.tsx（防死链）
//   ④ 三棵树都挂共享页头、都保留登录入口、都不做断点隐藏
//   ⑤ 牙口自检：故意从英文入口里删掉一项，断言必须翻红
//
// 与旧断言的关系：test-en-tools⑤ / test-lang-routing⑨ / test-account-auth③ 原先直接
// 在 layout 源码里找 href="/tw/hemun" 这类字面量。收口成共享组件后，这些字面量已不在
// layout 里，改为在本脚本里按“语言 × 入口 → 真实路由文件”验证（比找字面量更强）。

import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import {
  NAV_ITEMS,
  ACCOUNT_ITEMS,
  CORE_PATHS,
  CORE_ACCOUNT_PATHS,
  itemsFor,
  navHrefs,
} from '../src/lib/site-nav.ts'
import { pathForLang } from '../src/lib/lang.ts'

const root = new URL('..', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1')
const read = (p) => readFileSync(join(root, p), 'utf8')
const LOCALES = ['zh-Hans', 'zh-Hant', 'en']

let allPass = true
const ok = (m) => console.log('  · ' + m)
const fail = (m) => { allPass = false; console.log('  ✗ ' + m) }
const assert = (cond, m) => (cond ? ok(m) : fail(m))

/** 简体口径路径 → 该语言的 page.tsx 文件 */
function pageFile(locale, path) {
  const base = locale === 'zh-Hans' ? 'src/app/(zh)' : locale === 'zh-Hant' ? 'src/app/tw' : 'src/app/en'
  const seg = path === '/' ? '' : path
  return `${base}${seg}/page.tsx`
}

/** 纯函数：核心入口里，实际集合缺了哪些（供牙口自检直接调用） */
function missingCore(core, actual) {
  return core.filter((p) => !actual.includes(p))
}

// ---------- ① 共享来源 ----------
console.log('—— ① 导航单一事实源 ——')
{
  const twLayout = read('src/app/tw/layout.tsx')
  const enLayout = read('src/app/en/layout.tsx')
  const zhNav = read('src/components/Nav.tsx')
  const header = read('src/components/SiteHeader.tsx')

  assert(twLayout.includes('<SiteHeader locale="zh-Hant"'), 'tw/layout.tsx 传 locale=zh-Hant 给共享 SiteHeader')
  assert(enLayout.includes('<SiteHeader locale="en"'), 'en/layout.tsx 传 locale=en 给共享 SiteHeader')
  assert(zhNav.includes('<SiteHeader locale="zh-Hans"'), '简体 Nav.tsx 传 locale=zh-Hans 给共享 SiteHeader')

  const handWrittenTw = /href="\/tw(\/[^"]*)?"/.test(twLayout)
  const handWrittenEn = /href="\/en(\/[^"]*)?"/.test(enLayout)
  assert(!handWrittenTw, 'tw/layout.tsx 不再手写 /tw 导航链接')
  assert(!handWrittenEn, 'en/layout.tsx 不再手写 /en 导航链接')

  assert(header.includes('<SiteNav locale={locale}'), 'SiteHeader 渲染共享 SiteNav（未另写第二份链接清单）')
  assert(header.includes('<LangSwitcher locale={locale}'), 'SiteHeader 使用共享 LangSwitcher')
  assert(header.includes('getSupabase().auth.signOut()'), 'SiteHeader 保留 Supabase 登录态（退出登录真接线）')

  // 2026-11-05：英文树 375px 导航溢出 —— 窄屏语言切换用短标签 + 隐藏品牌圆点
  const langSwitch = read('src/components/LangSwitcher.tsx')
  assert(langSwitch.includes('sm:hidden') && langSwitch.includes('hidden sm:inline'),
    'LangSwitcher 窄屏短标签、≥sm 保留全称')
  assert(header.includes('hidden gap-[3px] sm:flex'), 'SiteHeader 品牌圆点在窄屏隐藏')
}

// ---------- ② 核心入口三语齐全 ----------
console.log('—— ② 核心入口三语齐全 ——')
{
  for (const locale of LOCALES) {
    const paths = itemsFor(locale).map((i) => i.path)
    const miss = missingCore(CORE_PATHS, paths)
    assert(miss.length === 0, `${locale} 导航核心入口齐全（${CORE_PATHS.join(' / ')}）${miss.length ? '，缺：' + miss.join(',') : ''}`)
    const acc = itemsFor(locale, ACCOUNT_ITEMS).map((i) => i.path)
    const accMiss = missingCore(CORE_ACCOUNT_PATHS, acc)
    assert(accMiss.length === 0, `${locale} 账号入口齐全（${CORE_ACCOUNT_PATHS.join(' / ')}）${accMiss.length ? '，缺：' + accMiss.join(',') : ''}`)
    const authHref = pathForLang('/auth', locale)
    assert(navHrefs(locale).length === itemsFor(locale).length,
      `${locale} 渲染入口数 = 表中可用项数（${itemsFor(locale).length} 项；登录入口另计 ${authHref}）`)
  }
}

// ---------- ③ 每个入口都有真实页面（防死链）----------
console.log('—— ③ 入口解析到真实路由 ——')
{
  for (const locale of LOCALES) {
    for (const item of [...itemsFor(locale), ...itemsFor(locale, ACCOUNT_ITEMS)]) {
      const file = pageFile(locale, item.path)
      assert(existsSync(join(root, file)), `${locale} ${item.path} → ${file}`)
    }
  }
}

// ---------- ④ 已声明的缺失必须真的缺失（防止“声明后悄悄补链接”）----------
console.log('—— ④ 声明缺失清单与实际一致 ——')
{
  const declared = NAV_ITEMS.filter((i) => i.available && i.available.length < LOCALES.length)
    .concat(ACCOUNT_ITEMS.filter((i) => i.available && i.available.length < LOCALES.length))
  for (const item of declared) {
    const missingLocales = LOCALES.filter((l) => !item.available?.includes(l))
    for (const l of missingLocales) {
      assert(!itemsFor(l).concat(itemsFor(l, ACCOUNT_ITEMS)).some((x) => x.path === item.path),
        `${l} 已声明缺失 ${item.path}（不渲染假链接）`)
      assert(!existsSync(join(root, pageFile(l, item.path))),
        `${l} ${item.path} 确无页面（声明与页面一致）`)
    }
  }
  // 把已声明缺失项汇总打印，作为“仍未解决项”的证据（不判红）
  const gaps = []
  for (const item of declared) {
    const missingLocales = LOCALES.filter((l) => !item.available?.includes(l))
    gaps.push(`${item.path} 仅 ${item.available?.join('/')}，缺 ${missingLocales.join('/')}`)
  }
  console.log('    已声明缺失：' + (gaps.length ? gaps.join('；') : '无'))
}

// ---------- ④b 英文生肖 / 我的命盘：入口已补齐，不得再声明缺失 ----------
console.log('—— ④b 英文生肖与我的命盘入口已打通 ——')
{
  for (const [path, items] of [['/shengxiao', NAV_ITEMS], ['/charts', ACCOUNT_ITEMS]]) {
    for (const l of LOCALES) {
      assert(itemsFor(l, items).some((i) => i.path === path), `${l} 渲染 ${path}（不再声明缺失）`)
      assert(existsSync(join(root, pageFile(l, path))), `${l} ${path} 有真实 page.tsx（无死链）`)
    }
    const declared = items.find((i) => i.path === path)?.available
    assert(!declared || declared.length === LOCALES.length, `${path} 不再声明 available 缺口`)
  }
  // 牙口：把 /shengxiao 改回“仅简繁可用”，英文入口必须立即消失
  const broken = NAV_ITEMS.map((i) =>
    i.path === '/shengxiao' ? { ...i, available: ['zh-Hans', 'zh-Hant'] } : i
  )
  assert(!itemsFor('en', broken).some((i) => i.path === '/shengxiao'),
    '把 /shengxiao 重新声明为两语 → 英文入口消失（牙口）')
}

// ---------- ⑤ 移动端不隐藏入口 ----------
console.log('—— ⑤ 移动端入口不隐藏 ——')
{
  const nav = read('src/components/SiteNav.tsx')
  assert(!/hidden\s+(sm|md|lg):/.test(nav), 'SiteNav 不用断点隐藏任何入口（移动端只横向滚动）')
  const header = read('src/components/SiteHeader.tsx')
  const navSection = header.slice(header.indexOf('<nav'), header.indexOf('</nav>'))
  assert(!/hidden\s+(sm|md|lg):/.test(navSection), '页头工具行不按断点隐藏（登录/语言切换固定右侧）')
  assert(header.includes('overflow-x-auto') || nav.includes('overflow-x-auto'),
    '工具行横向滚动容器存在（移动端可滑到所有入口）')
}

// ---------- ⑥ 牙口自检（守护断言本身）----------
console.log('—— ⑥ 牙口自检 ——')
{
  const realEn = itemsFor('en').map((i) => i.path)
  const brokenEn = realEn.filter((p) => p !== '/pricing')
  const detected = missingCore(CORE_PATHS, brokenEn)
  assert(detected.includes('/pricing'), `故意删掉英文树 /pricing → missingCore 检出（${detected.join(',')}）`)
  assert(missingCore(CORE_PATHS, realEn).length === 0, '真实英文入口未被误判为缺项')
}

// ---------- ⑦ 语言切换目标（纯函数行为）----------
console.log('—— ⑦ 语言切换目标 ——')
{
  const { langSwitchHref } = await import('../src/lib/lang-switch.ts')
  const cases = [
    ['/', 'zh-Hant', '/tw'],
    ['/', 'en', '/en'],
    ['/tw/chart', 'zh-Hans', '/chart'],
    ['/tw/chart', 'en', '/en/chart'],
    ['/en/chart', 'zh-Hans', '/chart'],
    ['/en/chart', 'zh-Hant', '/tw/chart'],
    ['/en', 'zh-Hant', '/tw'],
    ['/en', 'zh-Hans', '/'],
  ]
  for (const [from, to, want] of cases) {
    assert(langSwitchHref(from, to) === want, `${from} → ${to} = ${want}（实际 ${langSwitchHref(from, to)}）`)
  }
  // 牙口：英文页切繁体曾产出 /tw/en（twinPath 不剥 /en 前缀）
  const bad = langSwitchHref('/en/hemun', 'zh-Hant')
  assert(!bad.includes('/tw/en'), `英文页切繁体不产出 /tw/en（实际 ${bad}）`)
}

  // ★ 2026-10-30：导航溢出必须有「还有更多」的视觉暗示
  //   起因：12 项在 1100px 下把「定价」挤出可视区，而滚动条被隐藏 →
  //   线上 HTML 里链接还在，但用户体感等于被删掉。
  {
    const nav = readFileSync('src/components/SiteNav.tsx', 'utf8')
    // ★ 2026-10-30（五）遮罩已移除：入口收进「更多」后不再溢出，
    //   而常驻遮罩会把最后一个条目（定价）右缘吃掉，看图像是被切断。
    assert(!/mask-image:linear-gradient\(to_right/.test(nav),
      'SiteNav 不再用常驻遮罩（它会把最后一个条目吃掉）',
      'SiteNav 仍有常驻遮罩 —— 会把最后一个条目（定价）右缘裁掉')
    const siteNav = readFileSync('src/lib/site-nav.ts', 'utf8')
    assert(/path: '\/pricing'/.test(siteNav),
      '定价仍在导航表里（没被删，只是曾被挤出可视区）',
      '定价从导航表里消失了')
  }

  // ★ 2026-10-30：冷门项收进「更多」——主栏不该再依赖横滑
  {
    const { primaryNav, moreNav } = await import('../src/lib/site-nav.ts')
    for (const loc of ['zh-Hans', 'zh-Hant', 'en']) {
      const primary = primaryNav(loc).map((i) => i.path)
      const more = moreNav(loc).map((i) => i.path)
      assert(!primary.includes('/daily') && !primary.includes('/bazi'),
        `${loc}：日签/出生日期不在主栏（已收进更多）`,
        `${loc}：冷门项仍在主栏`)
      // ★ 核心：任何入口都不允许从导航里消失，只是换位置
      const all = [...primary, ...more].sort().join(',')
      const expect = ['/', '/hemun', '/ziwei', '/geo', '/liunian', '/mingshu', '/pricing']
        .filter((pth) => !pth.startsWith('/en'))
      for (const must of expect) {
        assert(all.includes(must), `${loc}：${must} 仍在导航里（主栏或更多）`, `${loc}：${must} 从导航里消失了`)
      }
    }
    // 牙口：把 more 标记去掉，主栏会重新变长 → 上面第一条断言必须红
    const nav = readFileSync('src/lib/site-nav.ts', 'utf8')
    assert((nav.match(/more: true/g) ?? []).length === 2,
      '两个冷门项都带 more 标记',
      `more 标记数应 2，实际 ${(nav.match(/more: true/g) ?? []).length}`)
  }

  // ★ 2026-10-30（三）「更多」下拉不能被横滑容器裁掉
  //   教训：面板曾放在 overflow-x-auto 里 → 点开其实打开了但看不见，
  //   用户体感是「点了没反应」。判据：role="menu" 必须出现在横滑容器闭合之后。
  {
    const src = readFileSync('src/components/SiteNav.tsx', 'utf8')
    const stripIdx = src.indexOf('overflow-x-auto')
    const menuIdx = src.indexOf('role="menu"')
    assert(stripIdx > 0 && menuIdx > 0, 'SiteNav 含横滑容器与下拉面板')
    // 横滑容器那段 <div ...> 内部不得出现 role="menu"
    const stripTagEnd = src.indexOf('>', stripIdx)
    const menuInsideStrip = menuIdx > stripIdx && menuIdx < stripTagEnd
    assert(!menuInsideStrip,
      '「更多」面板不在横滑容器内（不会被 overflow 裁掉）',
      '「更多」面板在横滑容器内 —— 会被竖直裁剪，表现为点了没反应')
    assert(/aria-expanded=\{open\}/.test(src),
      '「更多」是可切换按钮（aria-expanded）',
      '「更多」缺 aria-expanded（不可访问）')
  }

  // ★ 2026-10-30（四）导航与内容容器必须同宽
  //   曾经：内容 1120px、导航 1080px → 标题左缘与导航左缘差 40px，看着不对齐。
  //   以后改宽度只改一处就会红，逼着两个值一起改。
  {
    const css = readFileSync('src/app/globals.css', 'utf8')
    const nav = readFileSync('src/components/SiteHeader.tsx', 'utf8')
    const wrapW = css.match(/\.hw-wrap\s*\{[^}]*max-width:\s*(\d+)px/)?.[1]
    const navW = nav.match(/max-w-\[(\d+)px\]/)?.[1]
    assert(!!wrapW && !!navW, '能解析出内容容器与导航宽度')
    assert(wrapW === navW,
      `导航与内容同宽（${wrapW}px）`,
      `宽度不一致：内容 ${wrapW}px / 导航 ${navW}px —— 左边缘会对不齐`)
    // 加宽的边界：太宽会让中文正文行长失控，超过 1320 就要重新审视 measure
    assert(Number(wrapW) <= 1320,
      `内容宽度 ${wrapW}px 在安全区间（≤1320）`,
      `内容宽度 ${wrapW}px 过宽，需重新审视正文行长（measure）`)
  }

console.log('\n' + (allPass ? 'NAV_PARITY_PASS' : 'NAV_PARITY_FAIL'))
if (!allPass) process.exit(1)
