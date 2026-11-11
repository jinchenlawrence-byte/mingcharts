import Link from 'next/link'
import PaipanCta from '@/components/PaipanCta'
import BirthQuickForm from '@/components/BirthQuickForm'
import { LIUNIAN_YEARS, getLiunian, LIUNIAN_2027_DETAIL } from '@/lib/shengxiaoData'
import type { ShengXiao } from '@/lib/shengxiaoData'
import { getShengXiaoEn } from '@/lib/shengxiaoEn'
import { getLiunianEn, LIUNIAN_2027_DETAIL_EN } from '@/lib/shengxiaoYearEn'
import { pathForLang, type SiteLang } from '@/lib/lang'
import { toHant, hantTaiSui } from '@/lib/hant'
import { pickBySlug, LIUNIAN_ARTICLE_SLUGS } from '@/lib/relatedArticles'
import { SKUS, formatPriceUSD } from '@/lib/pricing'

// 生肖流年页（简/繁/英共用，2026-11-09 收敛）
//
// 简体/繁体沿用 shengxiaoData.getLiunian 的中文文案（繁体一律经 toHant 派生，不另写词表）；
// 英文走 shengxiaoYearEn 的六类关系文案，绝不渲染 getLiunian 的中文字段。
// 页面外壳（<main> + Nav）由各树 page 负责：简体页自带 Nav，繁/英由各自 layout 提供。

const TONE_BADGE_ZH: Record<string, string> = {
  '吉': 'bg-green-100 text-green-700',
  '凶': 'bg-red-100 text-red-700',
  '动': 'bg-orange-100 text-orange-700',
  '平': 'bg-paper-dark/40 text-ink-light',
}
const TONE_WORD_ZH: Record<string, string> = { '吉': '吉运年', '凶': '谨慎年', '动': '变动年', '平': '平稳年' }
const TONE_WORD_TW: Record<string, string> = { '吉': '吉運年', '凶': '謹慎年', '动': '變動年', '平': '平穩年' }
const TONE_BADGE_EN: Record<string, string> = {
  favourable: 'bg-green-100 text-green-700',
  caution: 'bg-red-100 text-red-700',
  changing: 'bg-orange-100 text-orange-700',
  steady: 'bg-paper-dark/40 text-ink-light',
}

interface RelatedItem {
  href: string
  label: string
}

interface YearCopy {
  home: string
  index: string
  animal: string
  yearCrumb: string
  h1: string
  badge: string
  badgeClass: string
  relationText: string
  fanWarning: string | null
  sections: [string, string][]
  detail: { title: string; focus: string; action: string } | null
  luckTitle: string
  advice: string
  luckyColorLabel: string
  luckyColor: string
  luckyNumberLabel: string
  luckyNumber: string
  buddhaLabel: string
  buddha: string
  buddhaClass: string
  buddhaValueClass: string
  faqTitle: string
  faq: { q: string; a: string }[]
  prev: { href: string; label: string } | null
  next: { href: string; label: string } | null
  relatedTitle: string
  related: RelatedItem[]
  ctaTitle: string
  ctaBody: string
  ctaLabel: string
  ctaHref: string
  annualPrefix: string
  annualLabel: string
  annualHref: string
  disclaimer: string
  disclaimerClass: string
}

export function ShengXiaoYearView({ locale, sx, year }: { locale: SiteLang; sx: ShengXiao; year: number }) {
  const copy = buildCopy(locale, sx, year)
  const prevYear = LIUNIAN_YEARS[LIUNIAN_YEARS.indexOf(year) - 1]
  const nextYear = LIUNIAN_YEARS[LIUNIAN_YEARS.indexOf(year) + 1]

  return (
    <div className="hw-wrap hw-c-pg">
      <div className="hw-narrow">
        <nav className="hw-c-back">
          <Link href={pathForLang('/', locale)}>{copy.home}</Link>
          <span className="mx-2">›</span>
          <Link href={pathForLang('/shengxiao', locale)}>{copy.index}</Link>
          <span className="mx-2">›</span>
          <Link href={pathForLang(`/shengxiao/${sx.slug}`, locale)}>{copy.animal}</Link>
          <span className="mx-2">›</span>
          <span>{copy.yearCrumb}</span>
        </nav>

        <div className="hw-c-box mb-6">
          <div className="flex items-center justify-between flex-wrap gap-3 mb-3">
            <h1 className="text-2xl md:text-3xl font-bold text-ink">{copy.h1}</h1>
            <span className={`text-sm px-3 py-1 rounded-full font-semibold ${copy.badgeClass}`}>{copy.badge}</span>
          </div>
          <p className="text-ink-light leading-relaxed">{copy.relationText}</p>
          {copy.fanWarning && (
            <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded text-sm text-red-700">{copy.fanWarning}</div>
          )}
        </div>

        {/* 首屏排盘入口：生肖只是 1/12，先让用户拿到自己的盘（2026-11-11） */}
        <BirthQuickForm locale={locale} chartPath={pathForLang('/chart', locale)} />

        {copy.sections.map(([title, body]) => (
          <FortuneSection key={title} title={title} body={body} />
        ))}

        {copy.detail && (
          <div className="hw-c-box mb-4">
            <h2 className="hw-c-secTitle">{copy.detail.title}</h2>
            <p className="hw-c-body mb-3">{copy.detail.focus}</p>
            <p className="hw-c-body">{copy.detail.action}</p>
          </div>
        )}

        <div className="hw-c-box mb-6">
          <h2 className="hw-c-secTitle">{copy.luckTitle}</h2>
          <p className="hw-c-body">{copy.advice}</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mt-4 text-sm">
            <div className="bg-gold/5 rounded p-3 text-center">
              <div className="text-xs text-ink-light">{copy.luckyColorLabel}</div>
              <div className="font-semibold text-ink mt-1">{copy.luckyColor}</div>
            </div>
            <div className="bg-gold/5 rounded p-3 text-center">
              <div className="text-xs text-ink-light">{copy.luckyNumberLabel}</div>
              <div className="font-semibold text-ink mt-1">{copy.luckyNumber}</div>
            </div>
            <div className={copy.buddhaClass}>
              <div className="text-xs text-ink-light">{copy.buddhaLabel}</div>
              <div className={copy.buddhaValueClass}>{copy.buddha}</div>
            </div>
          </div>
        </div>

        <div className="hw-c-box mb-6">
          <h2 className="hw-c-secTitle">{copy.faqTitle}</h2>
          <div className="space-y-4 text-sm">
            {copy.faq.map((item) => (
              <div key={item.q}>
                <h3 className="font-semibold text-gray-800 mb-1">{item.q}</h3>
                <p className="text-ink-light leading-relaxed">{item.a}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="flex justify-between mb-6">
          {prevYear ? (
            <Link href={pathForLang(`/shengxiao/${sx.slug}/${prevYear}`, locale)} className="hw-c-back">
              {copy.prev?.label}
            </Link>
          ) : <span />}
          {nextYear ? (
            <Link href={pathForLang(`/shengxiao/${sx.slug}/${nextYear}`, locale)} className="hw-c-back">
              {copy.next?.label}
            </Link>
          ) : <span />}
        </div>

        <div className="hw-c-box mb-6">
          <h2 className="hw-c-secTitle">{copy.relatedTitle}</h2>
          <ul className="space-y-2 text-sm">
            {copy.related.map((item) => (
              <li key={item.href}>
                <Link href={item.href} className="hw-c-link">• {item.label}</Link>
              </li>
            ))}
          </ul>
        </div>

        <div className="hw-c-cta">
          <h2 className="hw-c-secTitle">{copy.ctaTitle}</h2>
          <p className="hw-c-dx">{copy.ctaBody}</p>
          <PaipanCta href={copy.ctaHref} slot="shengxiao_year_bottom" className="hw-c-btnBig">{copy.ctaLabel}</PaipanCta>
          <p className="mt-4 text-sm text-ink-light">
            {copy.annualPrefix}
            <Link href={copy.annualHref} className="hw-c-link">{copy.annualLabel}</Link>
          </p>
        </div>

        <p className={copy.disclaimerClass}>{copy.disclaimer}</p>
      </div>
    </div>
  )
}

function FortuneSection({ title, body }: { title: string; body: string }) {
  return (
    <div className="hw-c-box mb-4">
      <h2 className="hw-c-secTitle">{title}</h2>
      <p className="hw-c-body">{body}</p>
    </div>
  )
}

function buildCopy(locale: SiteLang, sx: ShengXiao, year: number): YearCopy {
  return locale === 'en' ? enCopy(sx, year) : zhCopy(locale, sx, year)
}

function zhCopy(locale: 'zh-Hans' | 'zh-Hant', sx: ShengXiao, year: number): YearCopy {
  const hant = locale === 'zh-Hant'
  const H = hant ? toHant : (s: string) => s
  const ln = getLiunian(sx, year)
  const name = H(sx.name)
  const isFanTaiSui = ['值', '冲', '害', '刑'].includes(ln.relation)
  const taiSui = hant ? hantTaiSui(ln.relation) : ln.relation
  const detail = year === 2027 ? LIUNIAN_2027_DETAIL[sx.slug] : undefined
  const prefix = hant ? '/tw' : ''

  const prevYear = LIUNIAN_YEARS[LIUNIAN_YEARS.indexOf(year) - 1]
  const nextYear = LIUNIAN_YEARS[LIUNIAN_YEARS.indexOf(year) + 1]

  const sections: [string, string][] = hant
    ? [
        ['全年總運', H(ln.overview)],
        ['事業運勢', H(ln.career)],
        ['財運運勢', H(ln.wealth)],
        ['感情婚姻', H(ln.relationship)],
        ['健康運勢', H(ln.health)],
      ]
    : [
        ['全年总运', ln.overview],
        ['事业运势', ln.career],
        ['财运运势', ln.wealth],
        ['感情婚姻', ln.relationship],
        ['健康运势', ln.health],
      ]

  const faq = hant
    ? [
        {
          q: `${year}年屬${name}犯太歲嗎？`,
          a: isFanTaiSui
            ? `${year}${ln.ganZhi}年，屬${name}為${taiSui}太歲，屬於犯太歲的一種。犯太歲主變動、波動，建議年初拜太歲、全年謹慎行事，多行善積德，平穩度過。`
            : `${year}${ln.ganZhi}年，屬${name}與太歲無刑沖${ln.relation === '合' ? '，且為合太歲，是得貴人相助的年份' : '害關係，整體運勢平穩'}，不屬於犯太歲。`,
        },
        { q: `${year}年屬${name}財運怎麼樣？`, a: H(ln.wealth) },
        {
          q: `屬${name}${year}年適合結婚／轉職／創業嗎？`,
          a: ln.tone === '吉'
            ? '合太歲之年整體順利、貴人相助，是適合推進婚戀、合作與事業布局的年份，可順勢而為、把握機遇。'
            : ln.tone === '动'
              ? '沖太歲之年變動本身多，重大決定（結婚、轉職、創業）需充分準備、深思熟慮，主動規劃的「變」優於被動的「變」。'
              : `這一年整體${ln.tone === '凶' ? '宜守不宜攻' : '平穩'}，重大決定建議結合個人完整八字與實際情況理性判斷，不宜僅因生肖運勢衝動決策。`,
        },
      ]
    : [
        {
          q: `${year}年属${name}犯太岁吗？`,
          a: isFanTaiSui
            ? `${year}${ln.ganZhi}年，属${name}为${ln.relation}太岁，属于犯太岁的一种。犯太岁主变动、波动，建议年初拜太岁、全年谨慎行事，多行善积德，平稳度过。`
            : `${year}${ln.ganZhi}年，属${name}与太岁无刑冲${ln.relation === '合' ? '，且为合太岁，是得贵人相助的年份' : '害关系，整体运势平稳'}，不属于犯太岁。`,
        },
        { q: `${year}年属${name}财运怎么样？`, a: ln.wealth },
        {
          q: `属${name}${year}年适合结婚/跳槽/创业吗？`,
          a: ln.tone === '吉'
            ? '合太岁之年整体顺利、贵人相助，是适合推进婚恋、合作与事业布局的年份，可顺势而为、把握机遇。'
            : ln.tone === '动'
              ? '冲太岁之年变动本身多，重大决定（结婚、跳槽、创业）需充分准备、深思熟虑，主动规划的"变"优于被动的"变"。'
              : `这一年整体${ln.tone === '凶' ? '宜守不宜攻' : '平稳'}，重大决定建议结合个人完整八字与实际情况理性判断，不宜仅因生肖运势冲动决策。`,
        },
      ]

  const related: RelatedItem[] = hant
    ? [
        { href: `/tw/shengxiao/${sx.slug}`, label: `屬${name}的性格、事業、財運、婚姻與配對表` },
        { href: '/tw/shengxiao', label: '十二生肖流年運勢總覽（2024–2031）' },
        ...(year === 2027 ? [{ href: '/tw/liunian/2027', label: '2027 丁未年總覽：12 個屬相與太歲的關係一頁看完' }] : []),
        ...pickBySlug([...LIUNIAN_ARTICLE_SLUGS]).map((a) => ({
          href: `/tw/article/${a.slug}`,
          label: toHant(a.title),
        })),
      ]
    : [
        { href: '/article/liunian-zenme-kan', label: '流年运势怎么看？从流年干支、十神到原局冲合的完整顺序' },
        ...(year === 2027
          ? [
              { href: '/liunian/2027', label: '2027 丁未年总览：12 个属相与太岁的关系一页看完' },
              { href: '/article/2027-dingwei-nian-yunshi', label: '2027丁未年运势详解：犯太岁生肖与五行气质' },
              { href: '/article/2027-fantaishui', label: '2027年犯太岁怎么化解：值、冲、刑、害四种区别' },
            ]
          : []),
      ]

  return {
    home: hant ? '首頁' : '首页',
    index: '十二生肖',
    animal: hant ? `屬${name}` : `属${name}`,
    yearCrumb: hant ? `${year}年運勢` : `${year}年运势`,
    h1: hant ? `${year}年屬${name}運勢詳解` : `${year}年属${name}运势详解`,
    badge: hant ? `${TONE_WORD_TW[ln.tone]} · ${taiSui}太歲` : `${TONE_WORD_ZH[ln.tone]} · ${ln.relation}太岁`,
    badgeClass: TONE_BADGE_ZH[ln.tone],
    relationText: H(ln.relationText),
    fanWarning: isFanTaiSui
      ? hant
        ? `${year}年屬${name}${ln.relation === '值' ? '正值本命年（值太歲）' : `${taiSui}太歲`}，民俗認為犯太歲之年宜安太歲、拜太歲、多行善事，重大決策宜審慎。犯太歲不等於必有災禍，心存敬畏、積極應對即可。`
        : `${year}年属${name}${ln.relation === '值' ? '正值本命年（值太岁）' : `${ln.relation}太岁`}，民俗认为犯太岁之年宜安太岁、拜太岁、多行善事，重大决策宜审慎。犯太岁不等于必遭灾祸，心存敬畏、积极应对即可。`
      : null,
    sections,
    detail: detail
      ? {
          title: hant ? `2027 丁未年 · 屬${name}的具體落點` : `2027 丁未年 · 属${name}的具体落点`,
          focus: H(detail.focus),
          action: H(detail.action),
        }
      : null,
    luckTitle: hant ? `${year}年開運建議` : `${year}年开运建议`,
    advice: H(ln.advice),
    luckyColorLabel: hant ? '幸運顏色' : '幸运颜色',
    luckyColor: H(sx.luckyColor.split('、')[0]),
    luckyNumberLabel: hant ? '幸運數字' : '幸运数字',
    luckyNumber: sx.luckyNumber,
    buddhaLabel: hant ? '本命佛' : '本命佛',
    buddha: H(sx.benmingfo),
    buddhaClass: hant ? 'bg-gold/5 rounded p-3 text-center' : 'bg-gold/5 rounded p-3 text-center col-span-2 sm:col-span-1',
    buddhaValueClass: hant ? 'font-semibold text-ink mt-1' : 'font-semibold text-ink mt-1 text-xs',
    faqTitle: hant ? `${year}年屬${name}常見問題` : `${year}年属${name}常见问题`,
    faq,
    prev: prevYear
      ? { href: `${prefix}/shengxiao/${sx.slug}/${prevYear}`, label: hant ? `← ${prevYear}年屬${name}運勢` : `← ${prevYear}年属${name}运势` }
      : null,
    next: nextYear
      ? { href: `${prefix}/shengxiao/${sx.slug}/${nextYear}`, label: hant ? `${nextYear}年屬${name}運勢 →` : `${nextYear}年属${name}运势 →` }
      : null,
    relatedTitle: hant ? '延伸閱讀' : '延伸阅读',
    related,
    ctaTitle: hant ? `想看更準確的${year}年個人運勢？` : `想看更准确的${year}年个人运势？`,
    ctaBody: hant
      ? '生肖運勢是十二分之一的共性參考；結合完整八字（四柱、大運、流年）分析的個人運勢才精準。'
      : '生肖运势是12分之一的共性参考，结合您完整八字（四柱、大运、流年）分析的个人运势才精准。',
    ctaLabel: hant ? '補充出生時辰，看完整命盤 →' : '补充出生时辰，看完整命盘 →',
    ctaHref: pathForLang('/', locale),
    annualPrefix: hant ? '或' : '',
    annualLabel: hant
      ? `直接生成 ${year} 年年運報告（${formatPriceUSD(SKUS.annual_report.priceUSD)}，一次覆蓋今年／明年／後年三年，各含流月節奏）→`
      : `或直接生成 ${year} 年年运报告（${formatPriceUSD(SKUS.annual_report.priceUSD)}，一次覆盖今年/明年/后年三年，各含流月节奏）→`,
    annualHref: pathForLang('/liunian', locale),
    disclaimer: hant
      ? '本文為傳統命理民俗內容，僅供參考娛樂，不構成任何決策建議。'
      : '本文为传统命理民俗内容，仅供参考娱乐，不构成任何决策建议。',
    disclaimerClass: hant ? 'text-center text-xs text-ink-light mt-6' : 'hw-alert hw-alert--note text-center mt-6',
  }
}

function enCopy(sx: ShengXiao, year: number): YearCopy {
  const en = getLiunianEn(sx, year)
  const detail = getShengXiaoEn(sx.slug)
  const name = detail?.name ?? ''
  const y2027 = year === 2027 ? LIUNIAN_2027_DETAIL_EN[sx.slug] : undefined
  const prevYear = LIUNIAN_YEARS[LIUNIAN_YEARS.indexOf(year) - 1]
  const nextYear = LIUNIAN_YEARS[LIUNIAN_YEARS.indexOf(year) + 1]

  return {
    home: 'Home',
    index: 'Chinese zodiac',
    animal: name,
    yearCrumb: `${year} annual reading`,
    h1: `${year} ${name}: annual fortune and Tai Sui reading`,
    badge: `${en.toneText} · ${en.relationText}`,
    badgeClass: TONE_BADGE_EN[en.tone],
    relationText: `${name} in ${year} (${en.ganZhi}). ${en.summary}`,
    fanWarning: en.isFanTaiSui
      ? `${year} is a ${en.relationText} year for the ${name}. In traditional practice this is a year for a simple Tai Sui ritual, extra care with big decisions and a little more giving. Being out of step with the year branch does not mean disaster; it means the year’s energy is louder, so keep the pace steady.`
      : null,
    sections: [
      ['The year at a glance', en.overview],
      ['Career', en.career],
      ['Wealth', en.wealth],
      ['Relationships and marriage', en.relationship],
      ['Health', en.health],
    ],
    detail: y2027
      ? {
          title: `2027 Ding-Wei: what it means for the ${name}`,
          focus: y2027.focus,
          action: y2027.action,
        }
      : null,
    luckTitle: `Luck guidance for ${year}`,
    advice: en.advice,
    luckyColorLabel: 'Lucky colour',
    luckyColor: (detail?.luckyColor ?? '').split(',')[0],
    luckyNumberLabel: 'Lucky number',
    luckyNumber: detail?.luckyNumber ?? '',
    buddhaLabel: 'Guardian buddha',
    buddha: detail?.buddha ?? '',
    buddhaClass: 'bg-gold/5 rounded p-3 text-center col-span-2 sm:col-span-1',
    buddhaValueClass: 'font-semibold text-ink mt-1 text-xs',
    faqTitle: `Frequently asked questions about ${year}`,
    faq: [
      {
        q: `Is ${year} a Tai Sui year for the ${name}?`,
        a: en.taisui,
      },
      {
        q: `How is money for the ${name} in ${year}?`,
        a: en.wealth,
      },
      {
        q: `Is ${year} a good year to marry, change jobs or start a business?`,
        a: en.decision,
      },
    ],
    prev: prevYear
      ? { href: `/en/shengxiao/${sx.slug}/${prevYear}`, label: `← ${prevYear} ${name}` }
      : null,
    next: nextYear
      ? { href: `/en/shengxiao/${sx.slug}/${nextYear}`, label: `${nextYear} ${name} →` }
      : null,
    relatedTitle: 'Read next',
    related: [
      { href: `/en/shengxiao/${sx.slug}`, label: `${name}: personality, career, wealth and compatibility` },
      { href: '/en/shengxiao', label: 'All twelve Chinese zodiac signs' },
      { href: '/en/liunian', label: `Generate a personal annual report for ${year}` },
    ],
    ctaTitle: `Want a sharper read on ${year}?`,
    ctaBody:
      'A sign reading is one twelfth of the picture. A full Bazi chart — year, month, day and hour pillars, plus the luck cycles — turns the general year note into something personal.',
    ctaLabel: 'Add your birth hour for the full chart →',
    ctaHref: '/en',
    annualPrefix: 'Or ',
    annualLabel: `generate the ${year} annual report (${formatPriceUSD(SKUS.annual_report.priceUSD)}, covering this year, next year and the year after, with monthly rhythm) →`,
    annualHref: '/en/liunian',
    disclaimer: 'This material follows traditional Chinese folk practice and is offered for reference and entertainment only. It is not a basis for financial, medical or legal decisions.',
    disclaimerClass: 'hw-alert hw-alert--note text-center mt-6',
  }
}
