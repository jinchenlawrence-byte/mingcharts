// 三语导航唯一事实源（2026-11-04 统一第一批）
//
// 背景：简体 Nav.tsx、繁体 layout、英文 layout 各自手写了一遍链接清单，
// 结果三棵树的入口数量不同（英文缺生肖/知识/我的命盘，繁体缺我的命盘之外的账号入口等）。
// 现在只保留这一张表：三棵树传 locale，组件按表取文案与路径前缀。
//
// 纪律：
//   ① 以简体为基准，任何一棵树都不得删入口；表里有的项，对应语言确实没有页面时
//      用 available 显式声明（由 scripts/test-nav-parity.mjs 断言“声明缺失”与“死链”）。
//   ② 路径一律写简体口径（不含 /tw、/en 前缀），由 pathForLang 统一加前缀。
//   ③ 文案按语言显式给出，不用 toHant 派生导航：导航词是产品术语（如“帐号设定”），
//      机翻会给出“賬號設置”，与台湾/香港习惯不符。

import type { SiteLang } from './lang'
import { pathForLang } from './lang'

export interface NavEntry {
  /** 简体口径路径（不含语言前缀） */
  path: string
  label: Record<SiteLang, string>
  /** 该语言确实没有这个页面时显式声明；默认三语都有 */
  available?: SiteLang[]
  /**
   * 冷门入口：收进「更多」下拉，不占横滑条带。
   * 2026-10-30：导航 12 项在 1100px 下放不开（「定价」曾被挤出可视区），
   * 收掉两个冷门项回到 10 项，主栏不再依赖横滑。
   */
  more?: boolean
}

/** 工具 + 内容入口：顺序即桌面端从左到右的顺序 */
export const NAV_ITEMS: NavEntry[] = [
  { path: '/', label: { 'zh-Hans': '排盘', 'zh-Hant': '排盤', en: 'Bazi chart' } },
  { path: '/hemun', label: { 'zh-Hans': '合婚配对', 'zh-Hant': '合婚配對', en: 'Synastry' } },
  { path: '/ziwei', label: { 'zh-Hans': '紫微斗数', 'zh-Hant': '紫微斗數', en: 'Zi Wei Dou Shu' } },
  { path: '/geo', label: { 'zh-Hans': '方位城市', 'zh-Hant': '方位城市', en: 'Location & Direction' } },
  { path: '/liunian', label: { 'zh-Hans': '年运报告', 'zh-Hant': '年運報告', en: 'Annual report' } },
  {
    path: '/daily',
    more: true,
    label: { 'zh-Hans': '每日日签', 'zh-Hant': '每日日籤', en: 'Daily reading' },
    // 英文树暂无 /en/daily 页面；不放假链接，由断言显式列出“声明缺失”。
    available: ['zh-Hans', 'zh-Hant'],
  },
  {
    path: '/bazi',
    more: true,
    label: { 'zh-Hans': '出生日期', 'zh-Hant': '出生日期', en: 'Birth date' },
    // 繁体树刻意不设 /tw/bazi（test-tw-funnel ①：繁体 CTA 不得进无表单的 /bazi）。
    available: ['zh-Hans'],
  },
  {
    path: '/shengxiao',
    label: { 'zh-Hans': '生肖运势', 'zh-Hant': '生肖運勢', en: 'Chinese zodiac' },
  },
  {
    path: '/article',
    label: { 'zh-Hans': '命理知识', 'zh-Hant': '命理知識', en: 'Articles' },
    available: ['zh-Hans', 'zh-Hant'],
  },
  { path: '/mingshu', label: { 'zh-Hans': '命书', 'zh-Hant': '命書', en: 'Fate Book' } },
  { path: '/pricing', label: { 'zh-Hans': '定价', 'zh-Hant': '定價', en: 'Pricing' } },
]

/** 账号入口：登录态下拉菜单里的固定项（未登录时不渲染） */
export const ACCOUNT_ITEMS: NavEntry[] = [
  { path: '/member', label: { 'zh-Hans': '会员中心', 'zh-Hant': '會員中心', en: 'Member centre' } },
  {
    path: '/charts',
    label: { 'zh-Hans': '我的命盘', 'zh-Hant': '我的命盤', en: 'My charts' },
  },
  { path: '/reports', label: { 'zh-Hans': '我的报告', 'zh-Hant': '我的報告', en: 'My reports' } },
  { path: '/account', label: { 'zh-Hans': '账号设置', 'zh-Hant': '帳號設定', en: 'Account settings' } },
]

/** 所有语言都有的“核心入口”：断言要求三棵树一个不少 */
export const CORE_PATHS = ['/', '/hemun', '/ziwei', '/geo', '/liunian', '/mingshu', '/pricing']

/** 核心账号入口 */
export const CORE_ACCOUNT_PATHS = ['/member', '/reports', '/account']

export const BRAND: Record<SiteLang, string> = {
  'zh-Hans': '明理',
  'zh-Hant': '明理',
  en: 'MingCharts',
}

export const NAV_ARIA: Record<SiteLang, string> = {
  'zh-Hans': '主导航',
  'zh-Hant': '主導覽',
  en: 'Main navigation',
}

export const AUTH_LABEL: Record<SiteLang, string> = {
  'zh-Hans': '登录 / 注册',
  'zh-Hant': '登入 / 註冊',
  en: 'Sign in / Sign up',
}

export const ACCOUNT_BUTTON: Record<SiteLang, string> = {
  'zh-Hans': '账号',
  'zh-Hant': '帳號',
  en: 'Account',
}

export const SIGN_OUT_LABEL: Record<SiteLang, string> = {
  'zh-Hans': '退出登录',
  'zh-Hant': '登出',
  en: 'Sign out',
}

/** 按语言筛出该树实际可用的入口 */
export function itemsFor(locale: SiteLang, items: NavEntry[] = NAV_ITEMS): NavEntry[] {
  return items.filter((item) => !item.available || item.available.includes(locale))
}

  /** 主栏条目（不含 more） */
  export function primaryNav(locale: SiteLang, items: NavEntry[] = NAV_ITEMS): NavEntry[] {
    return itemsFor(locale, items).filter((i) => !i.more)
  }

  /** 「更多」下拉里的条目 */
  export function moreNav(locale: SiteLang, items: NavEntry[] = NAV_ITEMS): NavEntry[] {
    return itemsFor(locale, items).filter((i) => i.more)
  }

  export const MORE_LABEL: Record<SiteLang, string> = {
    'zh-Hans': '更多',
    'zh-Hant': '更多',
    en: 'More',
  }

  /** 入口 → 该语言的实际 URL */
export function hrefFor(item: NavEntry, locale: SiteLang): string {
  return pathForLang(item.path, locale)
}

/** 该语言导航的全部 URL（供断言与调试） */
export function navHrefs(locale: SiteLang, items: NavEntry[] = NAV_ITEMS): string[] {
  return itemsFor(locale, items).map((item) => hrefFor(item, locale))
}
