// 2028 年度总览守护（2026-10-27 第 36 轮）
//
// 断的是什么：
//   ① 简繁两个 2028 落地页存在，且 YEAR 常量真的是 2028（不是 2027 复制后忘改）
//   ② 四类犯太岁的分组全部由 getLiunian(sx, 2028) 现算 —— 页面源码里不许出现生肖字
//      （硬编码名单 = 绕过数据层；判据是「算出来的值 vs 页面有没有自己写死」，不是拿手写期望自证）
//   ③ 简繁各 12 条 2028 生肖链接
//   ④ hreflang 互指 + canonical + sitemap 两条
//   ⑤ 两个日期边界：春节与立春，且日期/时刻必须与 lunar-javascript 实算一致
//   ⑥ 禁词 / 具体金额 / 宫庙专名 0 命中
//   ⑦ 无 2027 复制残留（允许：安太岁三篇文章 + 一行互链）
//
// ★ 全程离线：只读源码与数据，不起 HTTP。

import { readFileSync, existsSync } from 'node:fs'
import { join } from 'node:path'
import { Solar, Lunar } from 'lunar-javascript'
import { SHENGXIAO, getLiunian, getYearGanZhi } from '../src/lib/shengxiaoData.ts'
import { toHant } from '../src/lib/hant.ts'
const { default: sitemap } = await import('../src/app/sitemap.ts')

let allPass = true
const fail = (m) => { allPass = false; console.log('  ✗ ' + m) }
const ok = (m) => console.log('  · ' + m)
const root = new URL('..', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1')
const read = (p) => readFileSync(join(root, p), 'utf8')
const has = (p) => existsSync(join(root, p))

const YEAR = 2028
const HANS = 'src/app/liunian/2028/page.tsx'
const HANT = 'src/app/tw/liunian/2028/page.tsx'
const REL_ORDER = ['值', '冲', '害', '刑']

const stripComments = (src) => src
  .replace(/\/\*[\s\S]*?\*\//g, '')
  .replace(/^\s*\/\/.*$/gm, '')
/** 去掉文章清单（2027 标题属正常，见任务书 §三⑤）与互链行（任务书 §四③ 允许一行） */
const stripAllowed2027 = (src) => stripComments(src)
  .replace(/const ARTICLES[\s\S]*?\n\]/, '')
  .split('\n')
  .filter((l) => !/href="\/(tw\/)?liunian\/2027"/.test(l))
  .join('\n')

// ---------- ① 文件与年份 ----------
console.log('—— ① 两个 2028 页 + YEAR=2028 ——')
{
  const miss = [HANS, HANT].filter((f) => !has(f))
  if (miss.length) fail(`缺文件：${miss.join(', ')}`)
  else ok('简繁两个 2028 落地页均存在')

  for (const f of [HANS, HANT]) {
    if (!has(f)) continue
    const m = read(f).match(/const YEAR = (\d+)/)
    if (!m) fail(`${f} 缺 const YEAR`)
    else if (Number(m[1]) !== YEAR) fail(`${f} YEAR=${m[1]}（应为 ${YEAR}）`)
    else ok(`${f} YEAR=${YEAR}`)
  }
}

// ---------- ② 分组由数据层现算 ----------
console.log('—— ② 四类犯太岁 = getLiunian(sx, 2028) 现算 ——')
{
  const rows = SHENGXIAO.map((sx) => ({ sx, ln: getLiunian(sx, YEAR) }))
  const groups = REL_ORDER.map((rel) => ({ rel, names: rows.filter((r) => r.ln.relation === rel).map((r) => r.sx.name) }))
  const he = rows.filter((r) => r.ln.relation === '合').map((r) => r.sx.name)
  const ping = rows.filter((r) => r.ln.relation === '平').map((r) => r.sx.name)
  console.log(`  · 数据层：干支 ${getYearGanZhi(YEAR)}｜` +
    groups.map((g) => `${g.rel}=${g.names.join('、') || '无'}`).join('｜') +
    `｜合=${he.join('、')}｜平=${ping.join('、')}`)

  const fanCount = groups.reduce((n, g) => n + g.names.length, 0)
  if (fanCount !== 4) fail(`犯太岁应 4 个属相，数据层给出 ${fanCount}`)
  else ok('数据层给出 4 个犯太岁属相')

  const ANIMALS = SHENGXIAO.map((s) => s.name)
  for (const f of [HANS, HANT]) {
    if (!has(f)) continue
    const src = read(f)
    // 分组必须来自数据层
    if (!src.includes('getLiunian(sx, YEAR)')) fail(`${f} 未用 getLiunian(sx, YEAR) 算关系`)
    else ok(`${f} 关系来自 getLiunian`)
    if (!src.includes('FAN.filter((r) => r.ln.relation === rel)')) fail(`${f} 分组未按关系现算（可能写死了名单）`)
    else ok(`${f} 四类分组按 relation 现算`)
    if (!REL_ORDER.every((r) => src.includes(`'${r}'`))) fail(`${f} 缺关系枚举 ${REL_ORDER.join('/')}`)
    else ok(`${f} 关系枚举齐全`)
    // 源码里出现生肖字 = 硬编码名单（ARTICLES 与互链行已剔除）
    const leak = ANIMALS.filter((a) => stripAllowed2027(src).includes(a))
    if (leak.length) fail(`${f} 出现硬编码生肖字：${leak.join('、')}（分组必须由数据生成）`)
    else ok(`${f} 无硬编码生肖名单`)
    // “8 个属相”这类计数不许写死
    if (!src.includes('HE.length + PING.length')) fail(`${f} 合/无犯数量被写死，未按数据计算`)
    else ok(`${f} 合/无犯数量按数据计算`)
  }
}

// ---------- ③ 12 条生肖链接 ----------
console.log('—— ③ 简繁各 12 条 2028 生肖链接 ——')
{
  if (SHENGXIAO.length !== 12) fail(`SHENGXIAO=${SHENGXIAO.length}，应 12`)
  const checks = [
    [HANS, '/shengxiao/${r.sx.slug}/${YEAR}', '简体'],
    [HANT, '/tw/shengxiao/${r.sx.slug}/${YEAR}', '繁体'],
  ]
  for (const [f, needle, label] of checks) {
    if (!has(f)) continue
    if (!read(f).includes(needle)) fail(`${f} 未链到 ${label} 12 属相页模板 ${needle}`)
    else ok(`${f} 12 属相链接模板正确（${label}）`)
  }
}

// ---------- ④ hreflang / canonical / sitemap ----------
console.log('—— ④ hreflang / canonical / sitemap ——')
{
  for (const [f, canonical] of [[HANS, `/liunian/\${YEAR}`], [HANT, `/tw/liunian/\${YEAR}`]]) {
    if (!has(f)) continue
    const src = read(f)
    if (!src.includes('hantAlternates(`/liunian/${YEAR}`)')) fail(`${f} hreflang 未指向同一组`)
    else ok(`${f} hreflang 就位`)
    if (!src.includes(`canonical: \`${canonical}\``)) fail(`${f} canonical 不是 ${canonical}`)
    else ok(`${f} canonical 指向自身`)
  }
  const paths = sitemap().map((e) => e.url)
  for (const p of [`/liunian/${YEAR}`, `/tw/liunian/${YEAR}`]) {
    const e = sitemap().find((x) => x.url.endsWith(p))
    if (!e) fail(`sitemap 缺 ${p}`)
    else if (e.priority !== 0.9) fail(`sitemap ${p} priority=${e.priority}（应与 2027 同级 0.9）`)
    else ok(`sitemap 收录 ${p}（priority 0.9）`)
  }
  if (paths.length < 2) fail('sitemap 异常')
}

// ---------- ⑤ 两个日期边界（实算比对） ----------
console.log('—— ⑤ 春节 / 立春 双边界（lunar-javascript 实算） ——')
{
  const cny = Lunar.fromYmd(YEAR, 1, 1).getSolar()
  const jqTable = Solar.fromYmd(YEAR, 2, 4).getLunar().getJieQiTable()
  const key = Object.keys(jqTable).find((k) => k.includes('立春'))
  const lichun = key ? jqTable[key] : null
  if (!lichun) {
    fail('实算取不到立春')
  } else {
    const cnyYmd = cny.toYmd() // YYYY-MM-DD
    const lcYmd = lichun.toYmd()
    const lcHm = lichun.toYmdHms().slice(11, 16)
    console.log(`  · 实算：春节 ${cnyYmd}｜立春 ${lichun.toYmdHms()}`)
    for (const f of [HANS, HANT]) {
      if (!has(f)) continue
      const src = read(f)
      const cnyCn = `${Number(cnyYmd.slice(5, 7))} 月 ${Number(cnyYmd.slice(8, 10))} 日`
      const lcCn = `${Number(lcYmd.slice(5, 7))} 月 ${Number(lcYmd.slice(8, 10))} 日`
      if (!src.includes(cnyYmd)) fail(`${f} 缺春节 ISO 日期 ${cnyYmd}`)
      if (!src.includes(lcYmd)) fail(`${f} 缺立春 ISO 日期 ${lcYmd}`)
      if (!src.includes(cnyCn)) fail(`${f} 缺春节写法「${cnyCn}」`)
      if (!src.includes(lcCn)) fail(`${f} 缺立春写法「${lcCn}」`)
      if (!src.includes(lcHm)) fail(`${f} 缺立春时刻 ${lcHm}（立春是时刻不是整日）`)
      if (src.includes(cnyYmd) && src.includes(lcYmd) && src.includes(cnyCn) && src.includes(lcCn) && src.includes(lcHm)) {
        ok(`${f} 两个边界与实算一致（${cnyCn} / ${lcCn} ${lcHm}）`)
      }
    }
    // 边界行为：立春当天时刻之前仍是丁未年
    const before = Solar.fromYmdHms(YEAR, 2, 4, 12, 0, 0).getLunar().getYearInGanZhiExact()
    const after = Solar.fromYmdHms(YEAR, 2, 4, 21, 0, 0).getLunar().getYearInGanZhiExact()
    if (before === after) fail(`立春边界实算异常：12:00 与 21:00 年柱都是 ${before}`)
    else ok(`立春边界成立：12:00=${before} / 21:00=${after}`)
  }
}

// ---------- ⑥ 红线扫描 ----------
console.log('—— ⑥ 禁词 / 金额 / 宫庙 ——')
{
  const BANNED = ['一定', '必然', '注定', '必得']
  const MONEY = /\d+\s*(元|塊|块|NT\$|台幣|台币)/
  const GENERIC = /(庙宇|廟宇|宮廟|宫庙|寺庙|寺廟|庙方|廟方|庙会|廟會|各庙|各廟|原庙|原廟|庙门|廟門|庙请示|廟請示|庙里|廟裡)/g
  for (const f of [HANS, HANT]) {
    if (!has(f)) continue
    const text = stripComments(read(f))
    const banned = BANNED.filter((w) => text.includes(w))
    const money = text.match(MONEY)
    const rest = text.replace(GENERIC, '　')
    const temple = /[宮宫庙廟寺]/.test(rest) ? rest.match(/[\u4e00-\u9fa5]{0,4}[宮宫庙廟寺][\u4e00-\u9fa5]{0,4}/) : null
    if (banned.length) fail(`${f} 命中禁词：${banned.join('、')}`)
    if (money) fail(`${f} 出现具体金额：${money[0]}`)
    if (temple) fail(`${f} 出现宫庙专名：${temple[0]}`)
    if (!banned.length && !money && !temple) ok(`${f} 红线 0 命中`)
    // 免责句：简繁各用本体字（繁体页写「僅供參考」）
    const disclaimer = f === HANT ? '僅供參考' : '仅供参考'
    if (!read(f).includes(disclaimer)) fail(`${f} 缺免责句「${disclaimer}」`)
  }
}

// ---------- ⑦ 无 2027 复制残留 ----------
console.log('—— ⑦ 2027 残留（允许：安太岁三篇 + 一行互链） ——')
{
  for (const f of [HANS, HANT]) {
    if (!has(f)) continue
    const src = read(f)
    const rest = stripAllowed2027(src)
    const hits = rest.split('\n').filter((l) => l.includes('2027'))
    if (hits.length) fail(`${f} 仍有 2027 残留：${hits.map((l) => l.trim()).join(' | ')}`)
    else ok(`${f} 除文章清单与互链行外无 2027`)
    if (!/href="\/(tw\/)?liunian\/2027"/.test(src)) fail(`${f} 缺指向 2027 的互链（§四③ 要求年份成对）`)
  }
  // 反向：2027 页要有指向 2028 的一行
  for (const [f, needle] of [
    ['src/app/liunian/2027/page.tsx', 'href="/liunian/2028"'],
    ['src/app/tw/liunian/2027/page.tsx', 'href="/tw/liunian/2028"'],
  ]) {
    if (!read(f).includes(needle)) fail(`${f} 缺指向 2028 的互链`)
    else ok(`${f} 有指向 2028 的互链`)
  }
}

// ---------- ⑧ 入口收口（tw 首页 / tw/liunian） ----------
console.log('—— ⑧ 繁体入口收口 ——')
{
  const twHome = read('src/app/tw/page.tsx')
  if (!twHome.includes('href="/tw/liunian/2027"') || !twHome.includes('href="/tw/liunian/2028"')) {
    fail('tw 首页未同时挂 2027 / 2028 双入口')
  } else ok('tw 首页 2027 + 2028 双入口')
  const twHub = read('src/app/tw/liunian/page.tsx')
  if (!twHub.includes('href="/tw/liunian/2028"')) fail('tw/liunian 入口区缺 2028')
  else ok('tw/liunian 入口区含 2028')
  if (!twHub.includes('href="/tw/liunian/taisui-biao"')) fail('tw/liunian 入口区丢了太岁对照表')
  else ok('太岁对照表入口仍在')
}

// ---------- ⑨ 简繁共用一套关系文案 ----------
console.log('—— ⑨ 单一来源（繁体由 toHant 派生） ——')
{
  const hant = read(HANT)
  if (!hant.includes("import { toHant } from '@/lib/hant'")) fail('繁体页未引入 toHant')
  else ok('繁体页用 toHant 派生生肖名')
  if (toHant('冲太岁') !== '沖太歲') fail(`toHant('冲太岁')=${toHant('冲太岁')}`)
  else ok('关系词 toHant 正确（冲→沖）')
  // ★ 单独转「冲」会得到「衝」（衝動的衝），成词是「沖太歲」；标题由数据生成，最容易踩这个坑
  if (stripComments(hant).includes('衝')) fail('繁体页出现「衝」——关系词必须成词转（沖太歲）')
  else ok('繁体页无「衝」误字（虎沖而非虎衝）')
  const hantSrc = stripComments(hant)
  const SIMPLIFIED_ONLY = ['运势', '关系', '农历', '总览', '怎么看']
  const hit = SIMPLIFIED_ONLY.filter((w) => hantSrc.includes(w))
  // 「简体版：2028 戊申年运势总览」是切回简体页的链接文案，属有意保留
  const realHit = hit.filter((w) => {
    const lines = hantSrc.split('\n').filter((l) => l.includes(w))
    return lines.some((l) => !l.includes('简体版'))
  })
  if (realHit.length) fail(`繁体页出现简体用词：${realHit.join('、')}`)
  else ok('繁体页用词均为繁体（切简体链接除外）')
}

console.log(allPass ? '\nLIUNIAN_YEAR_HUB_PASS' : '\nLIUNIAN_YEAR_HUB_FAIL')
if (!allPass) process.exitCode = 1
