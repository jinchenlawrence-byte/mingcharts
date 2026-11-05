'use client'

// 三语语言切换器唯一实现（2026-11-04 统一第一批）
//
// 此前有两份：HansLangSwitch（簡→繁/英）与 HantLangSwitch（繁→简/英），
// 英文树则把「繁體 / 简体」写死在 layout 里。现在统一成本组件：传 locale，
// 内部只渲染“另外两种语言”，目标路径按当前 pathname 推导（不写死）。
// 点击写 mc_lang cookie，此后根路径的 IP 导向以用户选择为准。

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LANG_COOKIE, type SiteLang } from '@/lib/lang'
import { langSwitchHref } from '@/lib/lang-switch'

type Target = Exclude<SiteLang, 'en'> | 'en'

const SWITCH_LABELS: Record<SiteLang, { lang: Target; label: string; short: string }[]> = {
  'zh-Hans': [
    { lang: 'zh-Hant', label: '繁體', short: '繁' },
    { lang: 'en', label: 'English', short: 'EN' },
  ],
  'zh-Hant': [
    { lang: 'zh-Hans', label: '简体', short: '简' },
    { lang: 'en', label: 'English', short: 'EN' },
  ],
  en: [
    { lang: 'zh-Hans', label: '简体中文', short: '简' },
    { lang: 'zh-Hant', label: '繁體中文', short: '繁' },
  ],
}

function remember(lang: Target) {
  document.cookie = `${LANG_COOKIE}=${lang}; path=/; max-age=${60 * 60 * 24 * 365}; samesite=lax`
}

function hrefFor(pathname: string, target: Target): string {
  return langSwitchHref(pathname, target)
}

export default function LangSwitcher({
  locale,
  className,
}: {
  locale: SiteLang
  className?: string
}) {
  const pathname = usePathname() || '/'
  const targets = SWITCH_LABELS[locale]
  return (
    <span className={className ?? 'shrink-0 whitespace-nowrap text-ink-light/40'}>
      {targets.map((t, i) => (
        <span key={t.lang}>
          {i > 0 && <span className="mx-1 opacity-40">/</span>}
          <Link href={hrefFor(pathname, t.lang)} onClick={() => remember(t.lang)} className="hover:text-ink">
            {/* 375px 下英文树两枚全称标签会把导航顶出视口（2026-11-05）：窄屏用单字，≥sm 保留全称 */}
            <span className="sm:hidden">{t.short}</span>
            <span className="hidden sm:inline">{t.label}</span>
          </Link>
        </span>
      ))}
    </span>
  )
}
