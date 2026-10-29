'use client'

// 全站页脚（第 36 轮）：按路径决定简繁
//
// 为什么是客户端组件：页脚在根布局里，根布局拿不到当前路径，
// 而它服务全部 208 个繁体页 —— 之前繁体页的页脚一直是简体
// （「命理师合作」「城市数据」「以上内容为传统命理民俗文化」全是简体），
// 这是繁体树上最刺眼的一处不一致。
//
// ★ 不写第二份文案：以简体为源，/tw 路径下用 lib/hant 的 toHant 派生。
// ★ 链接保持指向简体页（/terms、/privacy、/partners）—— 那几页没有繁体版，
//   若改成 /tw/terms 会 404。文案繁体、目标页简体，是当前最诚实的处理。

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { toHant } from '@/lib/hant'

export default function SiteFooter() {
  const pathname = usePathname() ?? ''
  const hant = pathname.startsWith('/tw')
  const L = (s: string) => (hant ? toHant(s) : s)

  return (
    <footer className="mt-auto border-t border-gold/20 py-4 text-center text-[11px] text-ink/40">
      <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1">
        <Link href="/terms" className="underline hover:text-ink/60">Terms of Service</Link>
        <span aria-hidden="true">·</span>
        <Link href="/privacy" className="underline hover:text-ink/60">Privacy Policy</Link>
        <span aria-hidden="true">·</span>
        <a href="mailto:hello@mingcharts.com" className="underline hover:text-ink/60">hello@mingcharts.com</a>
        <span aria-hidden="true">·</span>
        <Link href="/partners" className="underline hover:text-ink/60">{L('命理师合作')}</Link>
        <span aria-hidden="true">·</span>
        <span>
          {L('城市数据')} ©{' '}
          <a
            href="https://www.geonames.org/"
            target="_blank"
            rel="noopener noreferrer"
            className="underline hover:text-ink/60"
          >
            GeoNames
          </a>{' '}
          {L('（CC BY 4.0）')}
        </span>
      </div>
    </footer>
  )
}
