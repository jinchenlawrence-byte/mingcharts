import Link from 'next/link'
import { SHENGXIAO } from '@/lib/shengxiaoData'
import { ZODIAC_EN } from '@/lib/enTerms'
import { toHant } from '@/lib/hant'
import type { SiteLang } from '@/lib/lang'

// 2027 生肖页内链块（2026-11-09）
//
// 背景：GSC「已发现但尚未编入索引」里有 36 个生肖年份页，其中 10 个是 2027 丁未年。
// 年底是「来年运势」搜索窗口，这批页面需要有稳定、可抓取的入口。
// 本组件输出 12 个直链（/shengxiao/<属相>/2027），供首页、生肖 hub、年运落地页复用。
//
// 注意：英文树没有 /en/liunian/2027 落地页，因此英文分支不输出该链接，避免死链。

const COPY = {
  'zh-Hans': {
    title: '2027 丁未年 · 十二生肖运势',
    desc: '2027 丁未年各属相的流年干支、太岁关系与分维度提示，可先按自己的属相进入。',
    more: '2027 丁未年运势总览 →',
  },
  'zh-Hant': {
    title: '2027 丁未年 · 十二生肖運勢',
    desc: '2027 丁未年各屬相的流年干支、太歲關係與分維度提示，可先按自己的屬相進入。',
    more: '2027 丁未年運勢總覽 →',
  },
  en: {
    title: '2027 · Year of the Goat: zodiac outlook',
    desc: 'Annual pillar, Tai Sui relationship and life-area notes for each zodiac sign in 2027.',
    more: '',
  },
} as const

export default function Shengxiao2027Links({ locale, className = '' }: { locale: SiteLang; className?: string }) {
  const prefix = locale === 'en' ? '/en' : locale === 'zh-Hant' ? '/tw' : ''
  const t = COPY[locale]

  return (
    <section className={`hw-c-box mb-6 ${className}`.trim()} data-block="shengxiao-2027">
      <h2 className="hw-c-secTitle">{t.title}</h2>
      <p className="text-sm text-ink-light mb-3 leading-relaxed">{t.desc}</p>
      <div className="flex flex-wrap gap-2">
        {SHENGXIAO.map(sx => {
          const label = locale === 'en' ? (ZODIAC_EN[sx.name] || sx.name) : locale === 'zh-Hant' ? toHant(sx.name) : sx.name
          return (
            <Link
              key={sx.slug}
              href={`${prefix}/shengxiao/${sx.slug}/2027`}
              className="border border-gold/20 rounded-full px-3 py-1.5 text-sm text-ink hover:bg-gold/5 transition"
            >
              {locale === 'en' ? `2027 · ${label}` : `2027 · 屬${label}`}
            </Link>
          )
        })}
      </div>
      {t.more && (
        <p className="mt-3 text-sm">
          <Link href={`${prefix}/liunian/2027`} className="hw-c-link">
            {t.more}
          </Link>
        </p>
      )}
    </section>
  )
}
