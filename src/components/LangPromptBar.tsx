'use client'

// 根路径语言提示条（2026-11-03）
//
// 只在简体首页渲染。未知地区/无国家头不再硬跳，改为三选一提示：
//   · 选择后写 mc_lang + mc_lang_asked + mc_locale，之后不再出现
//   · 已存在 mc_lang 或 mc_lang_asked 时，客户端首帧即隐藏
//   · 不 fixed、不覆盖内容：登录入口与排盘表单在提示条下方，移动端可关闭
//   · 无 JS 时三条链接仍是普通 <a>，页面可正常使用

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { LANG_ASKED_COOKIE, LANG_COOKIE, type SiteLang } from '@/lib/lang'
import { LOCALE_COOKIE } from '@/lib/locale'

const YEAR = 60 * 60 * 24 * 365

function hasLanguageChoice(): boolean {
  if (typeof document === 'undefined') return false
  return document.cookie
    .split(';')
    .map((c) => c.trim())
    .some((c) => c.startsWith(`${LANG_ASKED_COOKIE}=`) || c.startsWith(`${LANG_COOKIE}=`))
}

function remember(lang: SiteLang) {
  document.cookie = `${LANG_COOKIE}=${lang}; path=/; max-age=${YEAR}; samesite=lax`
  document.cookie = `${LANG_ASKED_COOKIE}=1; path=/; max-age=${YEAR}; samesite=lax`
  document.cookie = `${LOCALE_COOKIE}=${lang}; path=/; max-age=${YEAR}; samesite=lax`
}

export default function LangPromptBar() {
  const [hidden, setHidden] = useState(false)

  useEffect(() => {
    if (hasLanguageChoice()) setHidden(true)
  }, [])

  if (hidden) return null

  return (
    <div
      data-lang-prompt="1"
      className="border-b border-gold/15 bg-white/90 text-ink"
    >
      <div className="hw-wrap flex flex-wrap items-center justify-between gap-2 py-2 text-xs sm:text-sm">
        <p className="text-ink-light">
          选择语言 · Choose your language
        </p>
        <div className="flex items-center gap-2">
          <Link
            href="/"
            onClick={(e) => {
              e.preventDefault()
              remember('zh-Hans')
              setHidden(true)
            }}
            className="rounded-full border border-gold/30 px-3 py-1 hover:bg-gold/5"
          >
            简体中文
          </Link>
          <Link
            href="/tw"
            onClick={() => remember('zh-Hant')}
            className="rounded-full border border-gold/30 px-3 py-1 hover:bg-gold/5"
          >
            繁體中文
          </Link>
          <Link
            href="/en"
            onClick={() => remember('en')}
            className="rounded-full border border-gold/30 px-3 py-1 hover:bg-gold/5"
          >
            English
          </Link>
          <button
            type="button"
            aria-label="关闭语言提示"
            onClick={() => {
              remember('zh-Hans')
              setHidden(true)
            }}
            className="ml-1 px-1 text-ink-light/60 hover:text-ink"
          >
            ×
          </button>
        </div>
      </div>
    </div>
  )
}
