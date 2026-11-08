'use client'

// 首页共享区块（2026-11-04 统一第二批）
//
// 简体首页此前把这些区块直接写在 HomeClient 里；繁体/英文缺失。
// 现在抽成一套组件，由三棵树传 locale：
//   · ExampleChart   —— hero 右侧交互示例盘（点柱看释义）
//   · TrustBar       —— 四条平台承诺
//   · FatebookSample —— 命书样例节选
//   · MoreQueries    —— 更多命理查询入口（按语言只放真实存在的页面）
//
// 原则：以简体为基准，信息只能多不能少；英文文案按母语习惯重写，不做逐字翻译。

import { useState } from 'react'
import Link from 'next/link'
import { pathForLang, type SiteLang } from '@/lib/lang'

type Copy = Record<SiteLang, string>

// ---------- 示例命盘 ----------

const PILLARS: {
  key: string
  t: Copy
  g: string
  b: string
  e: ('wood' | 'fire' | 'earth' | 'metal' | 'water')[]
  d: Copy
  day?: boolean
}[] = [
  {
    key: 'year',
    t: { 'zh-Hans': '年柱', 'zh-Hant': '年柱', en: 'Year' },
    g: '甲',
    b: '辰',
    e: ['wood', 'earth'],
    d: {
      'zh-Hans': '代表祖辈和早年的家庭环境，是你命盘的起点。',
      'zh-Hant': '代表祖輩和早年的家庭環境，是你命盤的起點。',
      en: 'Ancestry and early childhood — the starting point of your chart.',
    },
  },
  {
    key: 'month',
    t: { 'zh-Hans': '月柱', 'zh-Hant': '月柱', en: 'Month' },
    g: '丙',
    b: '寅',
    e: ['fire', 'wood'],
    d: {
      'zh-Hans': '代表父母和青年阶段，也是判断格局最重要的一柱。',
      'zh-Hant': '代表父母和青年階段，也是判斷格局最重要的一柱。',
      en: 'Parents and your twenties — the pillar that decides the structure of the whole chart.',
    },
  },
  {
    key: 'day',
    t: { 'zh-Hans': '日柱', 'zh-Hant': '日柱', en: 'Day' },
    g: '壬',
    b: '子',
    e: ['water', 'water'],
    d: {
      'zh-Hans': '日柱的天干叫「日主」，就是你自己；地支代表你的伴侣。',
      'zh-Hant': '日柱的天干叫「日主」，就是你自己；地支代表你的伴侶。',
      en: 'The Day Stem is your Day Master — you. Its Earthly Branch is your partner.',
    },
    day: true,
  },
  {
    key: 'hour',
    t: { 'zh-Hans': '时柱', 'zh-Hant': '時柱', en: 'Hour' },
    g: '辛',
    b: '亥',
    e: ['metal', 'water'],
    d: {
      'zh-Hans': '代表子女和晚年，也藏着你不常示人的一面。',
      'zh-Hant': '代表子女和晚年，也藏著你不常示人的一面。',
      en: 'Children and later life — and the side of you that you rarely show.',
    },
  },
]

const ELEMENT_LABEL: Record<SiteLang, { cls: string; label: string }[]> = {
  'zh-Hans': [
    { cls: 'wood', label: '木' },
    { cls: 'fire', label: '火' },
    { cls: 'earth', label: '土' },
    { cls: 'metal', label: '金' },
    { cls: 'water', label: '水' },
  ],
  'zh-Hant': [
    { cls: 'wood', label: '木' },
    { cls: 'fire', label: '火' },
    { cls: 'earth', label: '土' },
    { cls: 'metal', label: '金' },
    { cls: 'water', label: '水' },
  ],
  en: [
    { cls: 'wood', label: 'Wood' },
    { cls: 'fire', label: 'Fire' },
    { cls: 'earth', label: 'Earth' },
    { cls: 'metal', label: 'Metal' },
    { cls: 'water', label: 'Water' },
  ],
}

export function ExampleChart({ locale }: { locale: SiteLang }) {
  const [active, setActive] = useState(2)
  const caption =
    locale === 'en'
      ? 'Sample chart — tap a pillar to see what it governs'
      : locale === 'zh-Hant'
        ? '示例命盤 · 點一點，看每一柱管什麼'
        : '示例命盘 · 点一点，看每一柱管什么'
  return (
    <div className="hw-stage">
      <p className="hw-capT">{caption}</p>
      <div className="hw-pillars">
        {PILLARS.map((p, i) => (
          <button
            key={p.key}
            type="button"
            className={`hw-pillar${p.day ? ' hw-day' : ''}`}
            style={{ '--i': i } as React.CSSProperties}
            aria-pressed={active === i}
            onClick={() => setActive(i)}
          >
            <span className="hw-t">{p.t[locale]}</span>
            <span className={`hw-g hw-${p.e[0]}`}>{p.g}</span>
            <span className={`hw-g hw-${p.e[1]}`}>{p.b}</span>
          </button>
        ))}
      </div>
      <div className="hw-panel" aria-live="polite">
        <b>{PILLARS[active].t[locale]}</b>
        <p>{PILLARS[active].d[locale]}</p>
      </div>
      <div className="hw-legend" aria-label={locale === 'en' ? 'Five elements colour legend' : '五行配色'}>
        {ELEMENT_LABEL[locale].map((el) => (
          <span key={el.cls}>
            <i style={{ background: `var(--hw-${el.cls})` }} />
            {el.label}
          </span>
        ))}
      </div>
    </div>
  )
}

// ---------- 信任条 ----------

const TRUST: Record<SiteLang, { color: string; text: string }[]> = {
  'zh-Hans': [
    { color: 'wood', text: '排盘永久免费' },
    { color: 'water', text: '真太阳时校正' },
    { color: 'earth', text: '生辰加密传输·不对外公开' },
    { color: 'fire', text: '传统文化视角·仅供参考娱乐' },
  ],
  'zh-Hant': [
    { color: 'wood', text: '排盤永久免費' },
    { color: 'water', text: '真太陽時校正' },
    { color: 'earth', text: '生辰加密傳輸·不對外公開' },
    { color: 'fire', text: '傳統文化視角·僅供參考娛樂' },
  ],
  en: [
    { color: 'wood', text: 'Free charting, forever' },
    { color: 'water', text: 'True Solar Time corrected' },
    { color: 'earth', text: 'Birth data encrypted — never shared' },
    { color: 'fire', text: 'Traditional reading — reference and entertainment only' },
  ],
}

export function TrustBar({ locale }: { locale: SiteLang }) {
  const aria = locale === 'en' ? 'Our commitments' : locale === 'zh-Hant' ? '平台承諾' : '平台承诺'
  return (
    <div className="hw-trust" aria-label={aria} data-section="trust">
      {TRUST[locale].map((t) => (
        <span key={t.text}>
          <i style={{ background: `var(--hw-${t.color})` }} />
          {t.text}
        </span>
      ))}
    </div>
  )
}

// ---------- 命书样例 ----------

const SAMPLE_TITLE: Copy = {
  'zh-Hans': '万字命书，长什么样？',
  'zh-Hant': '萬字命書，長什麼樣？',
  en: 'What does the Fate Book look like?',
}
const SAMPLE_NOTE: Copy = {
  'zh-Hans': '以下为示例节选 · 实际报告因人而异',
  'zh-Hant': '以下為示例節選 · 實際報告因人而異',
  en: 'Sample excerpts — actual reports vary with the chart',
}
const SAMPLE_QUOTES: { text: Copy; src: Copy }[] = [
  {
    text: {
      'zh-Hans': '「日主壬水，生于孟春寅月，木旺泄气，喜金发源。」——庚金为尊，丙火为佐，二者得宜，格局自清。',
      'zh-Hant': '「日主壬水，生於孟春寅月，木旺洩氣，喜金發源。」——庚金為尊，丙火為佐，二者得宜，格局自清。',
      en: '"The Day Master is Ren Water, born in the first month of spring (Yin), where wood is strong and drains it; metal is welcome to feed its source." Geng metal leads, Bing fire supports — balanced, the chart reads clearly.',
    },
    src: {
      'zh-Hans': '—— 节选自「格局总论」章节 · 参《穷通宝鉴》论正月壬水',
      'zh-Hant': '—— 節選自「格局總論」章節 · 參《窮通寶鑑》論正月壬水',
      en: '— From the "Structure" chapter · cf. Qiong Tong Bao Jian on Ren Water in the first lunar month',
    },
  },
  {
    text: {
      'zh-Hans': '「身旺能任财，求财可顺势而为，宜向东方、南方发展；忌孤注一掷，忌高杠杆。」',
      'zh-Hant': '「身旺能任財，求財可順勢而為，宜向東方、南方發展；忌孤注一擲，忌高槓桿。」',
      en: '"A strong Day Master can carry wealth. Work with the current, and favour the east and the south; avoid all-in bets and leverage."',
    },
    src: {
      'zh-Hans': '—— 节选自「求财方向」章节 · 与方位城市五行地气同一口径',
      'zh-Hant': '—— 節選自「求財方向」章節 · 與方位城市五行地氣同一口徑',
      en: '— From the "Wealth and direction" chapter · same method as Cities & Direction',
    },
  },
  {
    text: {
      'zh-Hans': '「现行大运天干透出合神，十年之内事业重心由转岗转向立业，稳扎稳打为上。」',
      'zh-Hant': '「現行大運天干透出合神，十年之內事業重心由轉崗轉向立業，穩紮穩打為上。」',
      en: '"In the current Luck Pillar the stem reveals a combining god. Within ten years the focus shifts from changing jobs to building something of your own — steady beats fast."',
    },
    src: {
      'zh-Hans': '—— 节选自「大运流年」章节',
      'zh-Hant': '—— 節選自「大運流年」章節',
      en: '— From the "Luck Pillars and annual pillars" chapter',
    },
  },
]

export function FatebookSample({ locale }: { locale: SiteLang }) {
  return (
    <section className="hw-section" data-section="fatebook">
      <div className="hw-sample">
        <div className="hw-hd">
          <b>{SAMPLE_TITLE[locale]}</b>
          <span>{SAMPLE_NOTE[locale]}</span>
        </div>
        {SAMPLE_QUOTES.map((q) => (
          <div className="hw-quote" key={q.text['zh-Hans']}>
            <p>{q.text[locale]}</p>
            <small>{q.src[locale]}</small>
          </div>
        ))}
        <div className="hw-cta">
          <Link className="hw-btnInk" href={pathForLang('/pricing', locale)}>
            {locale === 'en' ? 'See the full report' : locale === 'zh-Hant' ? '查看完整報告' : '查看完整报告'}
          </Link>
          <em>
            {locale === 'en'
              ? 'Chart for free first, then decide how deep to go'
              : locale === 'zh-Hant'
                ? '先免費排盤，再決定要不要深讀'
                : '先免费排盘，再决定要不要深读'}
          </em>
        </div>
      </div>
    </section>
  )
}

// ---------- 更多查询 ----------

const MORE: Record<SiteLang, { path: string; t: string; s: string }[]> = {
  'zh-Hans': [
    { path: '/bazi', t: '按出生日期算命', s: '1950–2010 每日八字' },
    { path: '/shengxiao', t: '十二生肖运势', s: '属相配对 · 流年运势' },
    { path: '/jieqi', t: '二十四节气', s: '月令更替 · 节气养生' },
    { path: '/article', t: '命理知识大全', s: '入门 · 十神 · 格局' },
  ],
  'zh-Hant': [
    { path: '/shengxiao', t: '十二生肖運勢', s: '屬相配對 · 流年運勢' },
    { path: '/article', t: '命理知識大全', s: '入門 · 十神 · 格局' },
    { path: '/jieqi', t: '二十四節氣', s: '月令更替 · 節氣養生' },
    { path: '/daily', t: '每日日籤', s: '每天一張 · 今日運勢' },
    { path: '/mingshu', t: '命書詳批', s: '十卷 · 引經據典' },
  ],
  en: [
    { path: '/mingshu', t: 'Fate Book', s: 'Ten volumes · sourced from the classics' },
    { path: '/liunian', t: 'Annual report', s: 'Three years · monthly rhythm' },
    { path: '/geo', t: 'Cities & direction', s: 'Where your elements work best' },
    { path: '/hemun', t: 'Synastry', s: 'Two charts, read side by side' },
  ],
}

export function MoreQueries({ locale }: { locale: SiteLang }) {
  const title = locale === 'en' ? 'More readings' : locale === 'zh-Hant' ? '更多命理查詢' : '更多命理查询'
  return (
    <section className="hw-section" data-section="more">
      <h2 className="hw-h2">{title}</h2>
      <div className="hw-more">
        {MORE[locale].map((m) => (
          <Link key={m.path} href={pathForLang(m.path, locale)}>
            <b>{m.t}</b>
            <span>{m.s}</span>
          </Link>
        ))}
      </div>
    </section>
  )
}

// ---------- 功能 Bento（2026-11-09 三语对齐） ----------
// 简体首页此前用 .hw-bento 大色块展示六个功能；繁体退化成灰框小列表、
// 英文只留 4 张文字卡 —— 内容在、形态不在，纯文本对等断言因此一直没抓到。
// 现在三棵树共用本组件，并挂 data-section="features" 供断言比对。
// 英文树 2026-11-09 补了 /en/daily，六张卡与简繁一致（.hw-bento--five 仅作兜底）。
type BentoTone = 'wood' | 'fire' | 'earth' | 'metal' | 'water'

interface BentoItem {
  key: string
  slot: 'hw-b1' | 'hw-b2' | 'hw-b3' | 'hw-b4' | 'hw-b5' | 'hw-b6'
  glyph: string
  tone: BentoTone
  title: string
  desc: string
  path: string
}

const BENTO: Record<SiteLang, { title: string; items: BentoItem[] }> = {
  'zh-Hans': {
    title: '排完盘，接着玩',
    items: [
      {
        key: 'fatebook', slot: 'hw-b1', glyph: '命', tone: 'water', title: '命书详批',
        desc: '格局、调候、用神、大运，再到事业、婚姻、子女、健康，万字命书逐条引用经典原文。',
        path: '/pricing',
      },
      {
        key: 'hemun', slot: 'hw-b2', glyph: '合', tone: 'fire', title: '合婚配对',
        desc: '双方命局怎么互动，缘分有多深。',
        path: '/hemun',
      },
      {
        key: 'ziwei', slot: 'hw-b3', glyph: '紫', tone: 'earth', title: '紫微斗数',
        desc: '十四主星四化，十二宫深度分析。',
        path: '/ziwei',
      },
      {
        key: 'daily', slot: 'hw-b4', glyph: '签', tone: 'wood', title: '每日日签',
        desc: '每天抽一张，看看今天的运势。',
        path: '/daily',
      },
      {
        key: 'liunian', slot: 'hw-b6', glyph: '运', tone: 'metal', title: '年运报告',
        desc: '流年干支与原局冲合，事业、财运、感情、健康分维度解读。',
        path: '/liunian',
      },
      {
        key: 'geo', slot: 'hw-b5', glyph: '方', tone: 'metal', title: '方位城市',
        desc: '财富之城、事业之城，按五行地气看你适合去哪。',
        path: '/geo',
      },
    ],
  },
  'zh-Hant': {
    title: '排完盤，接著玩',
    items: [
      {
        key: 'fatebook', slot: 'hw-b1', glyph: '命', tone: 'water', title: '命書詳批',
        desc: '格局、調候、用神、大運，再到事業、婚姻、子女、健康，萬字命書逐條引用經典原文。',
        path: '/pricing',
      },
      {
        key: 'hemun', slot: 'hw-b2', glyph: '合', tone: 'fire', title: '合婚配對',
        desc: '雙方命局怎麼互動，緣分有多深。',
        path: '/hemun',
      },
      {
        key: 'ziwei', slot: 'hw-b3', glyph: '紫', tone: 'earth', title: '紫微斗數',
        desc: '十四主星四化，十二宮深度分析。',
        path: '/ziwei',
      },
      {
        key: 'daily', slot: 'hw-b4', glyph: '籤', tone: 'wood', title: '每日日籤',
        desc: '每天抽一張，看看今天的運勢。',
        path: '/daily',
      },
      {
        key: 'liunian', slot: 'hw-b6', glyph: '運', tone: 'metal', title: '年運報告',
        desc: '流年干支與原局沖合，事業、財運、感情、健康分維度解讀。',
        path: '/liunian',
      },
      {
        key: 'geo', slot: 'hw-b5', glyph: '方', tone: 'metal', title: '方位城市',
        desc: '財富之城、事業之城，按五行地氣看你適合去哪。',
        path: '/geo',
      },
    ],
  },
  en: {
    title: 'What to read next',
    items: [
      {
        key: 'fatebook', slot: 'hw-b1', glyph: '命', tone: 'water', title: 'The Fate Book',
        desc: 'Structure, climate and Useful God, then luck pillars, career, marriage, children and health — long-form, with classical citations.',
        path: '/mingshu',
      },
      {
        key: 'hemun', slot: 'hw-b2', glyph: '合', tone: 'fire', title: 'Synastry',
        desc: 'How two charts interact, and how deep the bond runs.',
        path: '/hemun',
      },
      {
        key: 'ziwei', slot: 'hw-b3', glyph: '紫', tone: 'earth', title: 'Zi Wei Dou Shu',
        desc: 'Fourteen major stars, the Four Transformations, twelve palaces.',
        path: '/ziwei',
      },
      {
        key: 'daily', slot: 'hw-b4', glyph: '日', tone: 'wood', title: 'Daily reading',
        desc: "One sign a day: today's element, the stem-branch and a line to sit with.",
        path: '/daily',
      },
      {
        key: 'liunian', slot: 'hw-b6', glyph: '运', tone: 'metal', title: 'Annual report',
        desc: 'Annual pillars against your natal chart — career, money, relationships, health.',
        path: '/liunian',
      },
      {
        key: 'geo', slot: 'hw-b5', glyph: '方', tone: 'metal', title: 'Cities & direction',
        desc: 'Wealth cities, career cities, read through the Five Elements of direction.',
        path: '/geo',
      },
    ],
  },
}

export function FeatureBento({ locale }: { locale: SiteLang }) {
  const copy = BENTO[locale]
  const five = copy.items.length === 5
  return (
    <section className="hw-section" data-section="features">
      <h2 className="hw-h2">{copy.title}</h2>
      <div className={five ? 'hw-bento hw-bento--five' : 'hw-bento'}>
        {copy.items.map((it) => (
          <a key={it.key} className={`hw-card ${it.slot} hw-${it.tone}`} href={pathForLang(it.path, locale)}>
            <span className="hw-z">{it.glyph}</span>
            <div>
              <h3>{it.title}</h3>
              <p>{it.desc}</p>
            </div>
          </a>
        ))}
      </div>
    </section>
  )
}
