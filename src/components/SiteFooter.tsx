'use client'

// 全站页脚：按路径决定简 / 繁 / 英
//
// ★ 不写第二份正文：简中为源，/tw 用 toHant 派生，/en 用英文文案。
// ★ 链接指向对应语言版本（简 / 繁 / 英三套条款、隐私与法律入口均已就位）。

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { toHant } from '@/lib/hant'
import HansLangSwitch from '@/components/HansLangSwitch'

export default function SiteFooter() {
  const pathname = usePathname() ?? ''
  const en = pathname.startsWith('/en')
  const hant = pathname.startsWith('/tw')
  const L = (s: string) => (hant ? toHant(s) : s)

  if (en) {
    return (
      <footer className="mt-auto border-t border-gold/20 py-4 text-center text-[11px] text-ink/40">
        <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1">
          <Link href="/en" className="underline hover:text-ink/60">Home</Link>
          <span aria-hidden="true">·</span>
          <Link href="/en/pricing" className="underline hover:text-ink/60">Pricing</Link>
          <span aria-hidden="true">·</span>
          <Link href="/en/terms" className="underline hover:text-ink/60">Terms of Service</Link>
          <span aria-hidden="true">·</span>
          <Link href="/en/privacy" className="underline hover:text-ink/60">Privacy Policy</Link>
          <span aria-hidden="true">·</span>
          <a href="mailto:hello@mingcharts.com" className="underline hover:text-ink/60">hello@mingcharts.com</a>
          <span aria-hidden="true">·</span>
          <Link href="/" className="underline hover:text-ink/60">简体中文</Link>
          <span aria-hidden="true">·</span>
          <Link href="/tw" className="underline hover:text-ink/60">繁體中文</Link>
          <span aria-hidden="true">·</span>
          <span>
            City data ©{' '}
            <a href="https://www.geonames.org/" target="_blank" rel="noopener noreferrer" className="underline hover:text-ink/60">
              GeoNames
            </a>{' '}
            (CC BY 4.0)
          </span>
        </div>
        <p className="mt-2">
          Content is traditional Chinese metaphysics, offered for reference and entertainment only.
        </p>
      </footer>
    )
  }

  return (
    <footer className="mt-auto border-t border-gold/20 py-4 text-center text-[11px] text-ink/40">
      <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1">
        <Link href={hant ? '/tw/terms' : '/terms'} className="underline hover:text-ink/60">Terms of Service</Link>
        <span aria-hidden="true">·</span>
        <Link href={hant ? '/tw/privacy' : '/privacy'} className="underline hover:text-ink/60">Privacy Policy</Link>
        <span aria-hidden="true">·</span>
        <a href="mailto:hello@mingcharts.com" className="underline hover:text-ink/60">hello@mingcharts.com</a>
        <span aria-hidden="true">·</span>
        <Link href={hant ? '/tw/partners' : '/partners'} className="underline hover:text-ink/60">{L('命理师合作')}</Link>
        <span aria-hidden="true">·</span>
        {/* 页脚也给一个语言入口：报告页/分享页没有 Nav */}
        {hant ? null : <HansLangSwitch className="underline hover:text-ink/60" />}
        <span aria-hidden="true">·</span>
        <span>
          {L('城市数据')} ©{' '}
          <a href="https://www.geonames.org/" target="_blank" rel="noopener noreferrer" className="underline hover:text-ink/60">
            GeoNames
          </a>{' '}
          {L('（CC BY 4.0）')}
        </span>
      </div>
      {hant && (
        <p className="mt-2">以上內容為傳統命理民俗文化，僅供參考娛樂，不構成任何決策依據。</p>
      )}
    </footer>
  )
}
