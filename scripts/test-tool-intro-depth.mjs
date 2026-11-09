// 工具页正文厚度 + 2027 内链验收（2026-11-09）
//
// 断的是什么：
//   ① /geo /ziwei /liunian 三棵语言树都渲染服务端说明正文，且渲染出来的实际文字达到下限
//      （简/繁 ≥ 800 汉字，英 ≥ 2000 字符且零 CJK）——直接 renderToStaticMarkup 计数，
//      不是只扫源码里有没有写；
//   ② 正文确实由服务端 page.tsx 传给客户端表单（page.tsx 自身不得是 'use client'）；
//   ③ 2027 生肖页在三个入口（首页 / 生肖 hub / 年运落地页）都有直链，三语齐备；
//   ④ 牙口：空组件渲染出来是 0 字，必须低于下限，证明阈值不是摆设。

import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import GeoIntroMod from '../src/components/tools/GeoIntro.tsx'
import ZiweiIntroMod from '../src/components/tools/ZiweiIntro.tsx'
import LiunianIntroMod from '../src/components/tools/LiunianIntro.tsx'
import Shengxiao2027LinksMod from '../src/components/shengxiao/Shengxiao2027Links.tsx'

// ESM/CJS 互操作：tsx 编译后 default 可能挂在模块命名空间上
const unwrap = (m) => (m && m.default ? m.default : m)
const GeoIntro = unwrap(GeoIntroMod)
const ZiweiIntro = unwrap(ZiweiIntroMod)
const LiunianIntro = unwrap(LiunianIntroMod)
const Shengxiao2027Links = unwrap(Shengxiao2027LinksMod)

const root = new URL('..', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1')
const read = (p) => readFileSync(join(root, p), 'utf8')

let allFail = 0
const ok = (m) => console.log('  ✓ ' + m)
const fail = (m) => { allFail++; console.log('  ✗ ' + m) }
const assert = (cond, m) => (cond ? ok(m) : fail(m))

const textOf = (html) =>
  html
    .replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>/g, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&[a-z#0-9]+;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

const cjkCount = (s) => (s.match(/[\u4e00-\u9fff]/g) || []).length

// ---------- ① 渲染正文厚度 ----------
console.log('—— ① 三语工具页服务端正文厚度（渲染后实测） ——')
const TOOLS = [
  { name: 'geo', C: GeoIntro },
  { name: 'ziwei', C: ZiweiIntro },
  { name: 'liunian', C: LiunianIntro },
]
const LOCALES = [
  { loc: 'zh-Hans', min: 800, unit: '汉字' },
  { loc: 'zh-Hant', min: 800, unit: '汉字' },
  { loc: 'en', min: 2000, unit: '字符' },
]

for (const tool of TOOLS) {
  for (const { loc, min, unit } of LOCALES) {
    const html = renderToStaticMarkup(React.createElement(tool.C, { locale: loc }))
    const t = textOf(html)
    const got = loc === 'en' ? t.length : cjkCount(t)
    assert(got >= min, `${tool.name} ${loc} 正文 ${got} ${unit}（下限 ${min}）`)
    if (loc === 'en') assert(cjkCount(t) === 0, `${tool.name} en 正文零 CJK（命中 ${cjkCount(t)}）`)
  }
}

// ---------- ④ 牙口：空渲染必须低于下限 ----------
console.log('—— ④ 牙口：空组件低于下限 ——')
const empty = textOf(renderToStaticMarkup(React.createElement(() => null)))
assert(cjkCount(empty) < 800 && empty.length < 2000, `空渲染 ${empty.length} 字符，低于任一语言下限`)

// ---------- ② 路由接线 ----------
console.log('—— ② 正文由服务端 page.tsx 传入客户端表单 ——')
const ROUTES = [
  ['src/app/(zh)/geo/page.tsx', 'GeoClient', 'GeoIntro', 'zh-Hans'],
  ['src/app/tw/geo/page.tsx', 'HantGeoClient', 'GeoIntro', 'zh-Hant'],
  ['src/app/en/geo/page.tsx', 'EnGeoClient', 'GeoIntro', 'en'],
  ['src/app/(zh)/ziwei/page.tsx', 'ZiweiClient', 'ZiweiIntro', 'zh-Hans'],
  ['src/app/tw/ziwei/page.tsx', 'HantZiweiClient', 'ZiweiIntro', 'zh-Hant'],
  ['src/app/en/ziwei/page.tsx', 'EnZiweiClient', 'ZiweiIntro', 'en'],
  ['src/app/(zh)/liunian/page.tsx', 'LiunianClient', 'LiunianIntro', 'zh-Hans'],
  ['src/app/tw/liunian/page.tsx', 'HantLiunianClient', 'LiunianIntro', 'zh-Hant'],
  ['src/app/en/liunian/page.tsx', 'EnLiunianClient', 'LiunianIntro', 'en'],
]
for (const [file, client, intro, loc] of ROUTES) {
  const src = read(file)
  assert(!src.trimStart().startsWith("'use client'"), `${file} 是服务端组件`)
  assert(src.includes(`<${client}`), `${file} 仍渲染客户端表单 ${client}`)
  assert(src.includes(`<${intro} locale="${loc}"`), `${file} 渲染 <${intro}> locale=${loc}`)
}

// ---------- ③ 2027 内链 ----------
console.log('—— ③ 2027 生肖页内链（首页 / hub / 年运落地页） ——')
for (const loc of ['zh-Hans', 'zh-Hant', 'en']) {
  const html = renderToStaticMarkup(React.createElement(Shengxiao2027Links, { locale: loc }))
  const prefix = loc === 'en' ? '/en' : loc === 'zh-Hant' ? '/tw' : ''
  const zodiacLinks = html.match(new RegExp(`href="${prefix}/shengxiao/[a-z]+/2027"`, 'g')) || []
  assert(new Set(zodiacLinks).size === 12, `${loc} 2027 内链块输出 12 个属相直链（实得 ${new Set(zodiacLinks).size}）`)
}

const ENTRY = [
  ['src/app/(zh)/HomeClient.tsx', 'zh-Hans', '简体首页'],
  ['src/app/tw/page.tsx', 'zh-Hant', '繁体首页'],
  ['src/app/en/page.tsx', 'en', '英文首页'],
]
for (const [file, loc, label] of ENTRY) {
  const src = read(file)
  assert(src.includes(`<Shengxiao2027Links locale="${loc}"`), `${label} 渲染 2027 内链块`)
}

const hub = read('src/components/shengxiao/ShengXiaoIndex.tsx')
assert(hub.includes('/shengxiao/${sx.slug}/2027'), '生肖 hub 简/繁 chip 直链 2027 年份页')
assert(hub.includes('<Shengxiao2027Links locale="en"'), '英文 hub 补 2027 内链块')

for (const [file, label] of [
  ['src/app/(zh)/liunian/2027/page.tsx', '简体 2027 落地页'],
  ['src/app/tw/liunian/2027/page.tsx', '繁体 2027 落地页'],
]) {
  const src = read(file)
  assert(src.includes('const YEAR = 2027') && src.includes('SHENGXIAO'), `${label} 用 2027 年份遍历十二生肖`)
  assert(src.includes('sx.slug') && src.includes('YEAR'), `${label} 生肖年份页链接由 slug + YEAR 拼出`)
}
assert(read('src/app/en/liunian/page.tsx').includes('<Shengxiao2027Links locale="en"'), '英文年运页渲染 2027 内链块（英文无 /en/liunian/2027 落地页）')

console.log(`\n${allFail === 0 ? '全部通过' : `${allFail} 项失败`}`)
process.exit(allFail === 0 ? 0 : 1)
