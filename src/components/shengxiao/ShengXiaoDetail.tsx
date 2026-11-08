import Link from 'next/link'
import { SHENGXIAO, LIUNIAN_YEARS, getPeiDui, getLiunian } from '@/lib/shengxiaoData'
import type { ShengXiao } from '@/lib/shengxiaoData'
import {
  SHENGXIAO_EN,
  PAIR_EN,
  pairKindOf,
  yearNotesEn,
} from '@/lib/shengxiaoEn'
import { branchEn, zodiacEn } from '@/lib/enTerms'
import { pathForLang, type SiteLang } from '@/lib/lang'
import { toHant, hantTaiSui } from '@/lib/hant'
import { pickBySlug, SHENGXIAO_ARTICLE_SLUGS } from '@/lib/relatedArticles'

// 生肖详情页（简/繁/英共用，2026-11-09 收敛）
// 繁体此前是早期独立实现：头部/关系/五段/幸运物都在，但缺流年格、CTA 文案与简英不同、
// 另加了一块简英没有的延伸阅读。现在三棵树共用本组件，差异只保留在文案层。
// 繁中一律经 toHant（hant.ts 术语保护），不再手写第二套繁体映射。

const ZHI_WX: Record<string, string> = {
  子: 'water', 亥: 'water',
  寅: 'wood', 卯: 'wood',
  巳: 'fire', 午: 'fire',
  申: 'metal', 酉: 'metal',
  辰: 'earth', 戌: 'earth', 丑: 'earth', 未: 'earth',
}

const TONE_BOX: Record<string, string> = {
  吉: 'bg-green-50 border-green-200',
  凶: 'bg-red-50 border-red-200',
  动: 'bg-orange-50 border-orange-200',
  平: 'bg-paper-dark/30 border-gold/15',
}
const TONE_TX: Record<string, string> = {
  吉: 'text-green-700',
  凶: 'text-red-700',
  动: 'text-orange-700',
  平: 'text-ink-light',
}
const TONE_EN_BOX: Record<string, string> = {
  favourable: 'bg-green-50 border-green-200',
  caution: 'bg-red-50 border-red-200',
  changing: 'bg-orange-50 border-orange-200',
  steady: 'bg-paper-dark/30 border-gold/15',
}
const TONE_EN_TX: Record<string, string> = {
  favourable: 'text-green-700',
  caution: 'text-red-700',
  changing: 'text-orange-700',
  steady: 'text-ink-light',
}

export function ShengXiaoDetail({ locale, sx }: { locale: SiteLang; sx: ShengXiao }) {
  if (locale === 'en') return <EnDetail sx={sx} />
  return <ZhDetail locale={locale} sx={sx} />
}

function ZhDetail({ locale, sx }: { locale: SiteLang; sx: ShengXiao }) {
  const H = locale === 'zh-Hant' ? toHant : (s: string) => s
  const t = (s: string) => H(s)
  const name = H(sx.name)
  const related = pickBySlug([...SHENGXIAO_ARTICLE_SLUGS])

  const sections: [string, string][] = [
    [t('性格特点'), sx.personality],
    [t('事业运'), sx.career],
    [t('财运'), sx.wealth],
    [t('婚姻感情'), sx.marriage],
    [t('健康养生'), sx.health],
  ]

  return (
    <div className="hw-wrap hw-c-pg" data-section="zodiac-detail">
      <nav className="hw-c-back">
        <Link href={pathForLang('/', locale)}>{t('首页')}</Link>
        <span className="mx-2">›</span>
        <Link href={pathForLang('/shengxiao', locale)}>{t('十二生肖')}</Link>
        <span className="mx-2">›</span>
        <span>{t('属')}{name}</span>
      </nav>

      <div className="hw-c-box mb-6" data-section="zodiac-header">
        <div className="flex items-center gap-5 mb-4">
          <div className={`hw-zx w-20! h-20! text-4xl! hw-${ZHI_WX[sx.zhi] ?? 'earth'}`}>{name}</div>
          <div>
            <h1 className="hw-c-h1">{t('属')}{name}{t('人命运详解')}</h1>
            <p className="hw-c-meta">
              {t('地支')}{sx.zhi} · {t('五行属')}{H(sx.wuxing)} · {t('本命佛')}{H(sx.benmingfo)}
            </p>
            <p className="text-ink-light text-xs mt-1">
              {t('出生年份（以立春为界）：')}{sx.years.join(t('、'))}{t('年')}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-5 gap-2 text-sm">
          <Relation label={t('六合贵人')} value={`${t('属')}${H(sx.liuHe)}`} tone="good" />
          <Relation label={t('三合')} value={`${t('属')}${H(sx.sanHe[0])}、${t('属')}${H(sx.sanHe[1])}`} tone="good" />
          <Relation label={t('六冲')} value={`${t('属')}${H(sx.liuChong)}`} tone="bad" />
          <Relation label={t('六害')} value={`${t('属')}${H(sx.liuHai)}`} tone="bad" />
          <Relation label={t('相刑')} value={sx.sanXing.map((x) => t('属') + H(x)).join('、')} tone="warn" />
        </div>
      </div>

      {sections.map(([title, body]) => (
        <Section key={title} title={title} body={t(body)} />
      ))}

      <div className="hw-c-box mb-6" data-section="zodiac-lucky">
        <h2 className="hw-c-secTitle">{t('属')}{name}{t('幸运物与开运指南')}</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
          <LuckyItem label={t('幸运数字')} value={sx.luckyNumber} />
          <LuckyItem label={t('幸运颜色')} value={H(sx.luckyColor)} />
          <LuckyItem label={t('有利方位')} value={H(sx.luckyDirection)} />
          <LuckyItem label={t('本命佛')} value={H(sx.benmingfo)} />
          <LuckyItem label={t('吉祥花卉')} value={H(sx.luckyFlower)} />
          <LuckyItem label={t('幸运宝石')} value={H(sx.luckyStone)} />
        </div>
        <p className="text-xs text-ink-light mt-4">
          {t('提示：幸运物为传统民俗参考，最上等的改运之道是修心积德、勤奋努力。')}
        </p>
      </div>

      <div className="hw-c-box mb-6" data-section="zodiac-pairs">
        <h2 className="hw-c-secTitle">{t('属')}{name}{t('生肖配对表')}</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {SHENGXIAO.map((other) => {
            const pd = getPeiDui(sx, other.name)
            const good = pd.level.includes('上等')
            const neutral = pd.level.includes('中等')
            return (
              <div
                key={other.slug}
                className={`border rounded p-3 text-sm ${good ? 'border-green-200 bg-green-50' : neutral ? 'border-gold/15' : 'border-red-100 bg-red-50/40'}`}
              >
                <div className="flex justify-between items-center mb-1">
                  <Link href={pathForLang(`/shengxiao/${other.slug}`, locale)} className="font-bold hw-c-link">
                    {name} + {H(other.name)}
                  </Link>
                  <span
                    className={`text-xs px-2 py-0.5 rounded ${good ? 'bg-green-100 text-green-700' : neutral ? 'bg-paper-dark/40 text-ink-light' : 'bg-red-100 text-red-600'}`}
                  >
                    {H(pd.level)}
                  </span>
                </div>
                <p className="text-xs text-ink-light leading-relaxed">{H(pd.desc)}</p>
              </div>
            )
          })}
        </div>
      </div>

      <div className="hw-c-box mb-6" data-section="zodiac-liunian">
        <h2 className="hw-c-secTitle">{t('属')}{name}{t('流年运势（2024-2031）')}</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {LIUNIAN_YEARS.map((y) => {
            const ln = getLiunian(sx, y)
            return (
              <Link
                key={y}
                href={pathForLang(`/shengxiao/${sx.slug}/${y}`, locale)}
                className={`block border rounded-lg p-3 text-center transition ${TONE_BOX[ln.tone]}`}
              >
                <div className="font-bold text-lg">{y}</div>
                <div className={`text-xs mt-0.5 ${TONE_TX[ln.tone]}`}>
                  {ln.ganZhi}{t('年')} · {locale === 'zh-Hant' ? hantTaiSui(ln.relation) : ln.relation}{t('太岁')}
                </div>
              </Link>
            )
          })}
        </div>
        <p className="text-xs text-ink-light mt-3">
          {t('绿色为合太岁吉年，红色为害/刑太岁需谨慎，橙色为冲太岁主动荡，灰色为平稳之年。')}
        </p>
      </div>

      <div className="hw-c-cta" data-section="zodiac-cta">
        <h2 className="hw-c-secTitle">{t('生肖只是年支，八字更精准')}</h2>
        <p className="hw-c-dx">
          {t('相同生肖的人命运千差万别，因为完整八字包含年月日时四柱。输入您的精确出生时辰，查看专属命盘。')}
        </p>
        <Link href={pathForLang('/', locale)} className="hw-c-btnBig">
          {t('立即排八字 →')}
        </Link>
      </div>

      {/* 延伸阅读：繁体保留原有内链（简体/英文没有文章库页面，不渲染） */}
      {locale === 'zh-Hant' && (
        <div className="hw-c-box mb-6 mt-6">
          <h2 className="hw-c-secTitle">延伸閱讀</h2>
          <ul className="space-y-2 text-sm">
            <li>
              <Link href={pathForLang(`/shengxiao/${sx.slug}`, locale)} className="hw-c-link">
                • 屬{name}的性格、事業、財運、婚姻與配對表
              </Link>
            </li>
            <li>
              <Link href={pathForLang('/shengxiao', locale)} className="hw-c-link">
                • 十二生肖流年運勢總覽（2024–2031）
              </Link>
            </li>
            {related.map((a) => (
              <li key={a.slug}>
                <Link href={pathForLang(`/article/${a.slug}`, locale)} className="hw-c-link">
                  • {toHant(a.title)}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}

      <p className="hw-alert hw-alert--note text-center mt-6">
        {t('以上内容为传统命理民俗文化，仅供参考娱乐，不构成决策依据。')}
      </p>
    </div>
  )
}

function EnDetail({ sx }: { sx: ShengXiao }) {
  const copy = SHENGXIAO_EN.find((s) => s.slug === sx.slug)
  const branch = branchEn(sx.zhi)
  const notes = yearNotesEn(sx, [...LIUNIAN_YEARS])

  return (
    <div className="hw-wrap hw-c-pg" data-section="zodiac-detail">
      <nav className="hw-c-back">
        <Link href="/en">Home</Link>
        <span className="mx-2">›</span>
        <Link href="/en/shengxiao">Chinese zodiac</Link>
        <span className="mx-2">›</span>
        <span>{copy?.name ?? zodiacEn(sx.name)}</span>
      </nav>

      <div className="hw-c-box mb-6" data-section="zodiac-header">
        <div className="flex items-center gap-5 mb-4">
          <div className={`hw-zx w-20! h-20! text-2xl! hw-${ZHI_WX[sx.zhi] ?? 'earth'}`}>{branch}</div>
          <div>
            <h1 className="hw-c-h1">
              {copy?.name ?? zodiacEn(sx.name)} ({branch}): personality, career, wealth and compatibility
            </h1>
            <p className="hw-c-meta">
              Branch {branch} · Element {elementWord(sx.zhi)} · Guardian buddha {copy?.buddha ?? ''}
            </p>
            <p className="text-ink-light text-xs mt-1">
              Birth years (the year changes at Li Chun): {sx.years.join(', ')}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-5 gap-2 text-sm">
          <Relation label="Six Harmony (Liu He)" value={zodiacEn(sx.liuHe)} tone="good" />
          <Relation label="Three Harmony (San He)" value={sx.sanHe.map(zodiacEn).join(', ')} tone="good" />
          <Relation label="Six Clash (Liu Chong)" value={zodiacEn(sx.liuChong)} tone="bad" />
          <Relation label="Six Harm (Liu Hai)" value={zodiacEn(sx.liuHai)} tone="bad" />
          <Relation label="Punishment (Xing)" value={sx.sanXing.map(zodiacEn).join(', ')} tone="warn" />
        </div>
      </div>

      <Section title="Personality" body={copy?.personality ?? ''} />
      <Section title="Career" body={copy?.career ?? ''} />
      <Section title="Wealth" body={copy?.wealth ?? ''} />
      <Section title="Marriage and relationships" body={copy?.marriage ?? ''} />
      <Section title="Health" body={copy?.health ?? ''} />

      <div className="hw-c-box mb-6" data-section="zodiac-lucky">
        <h2 className="hw-c-secTitle">{copy?.name} lucky items and luck guidance</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
          <LuckyItem label="Lucky numbers" value={copy?.luckyNumber ?? ''} />
          <LuckyItem label="Lucky colours" value={copy?.luckyColor ?? ''} />
          <LuckyItem label="Favourable directions" value={copy?.luckyDirection ?? ''} />
          <LuckyItem label="Guardian buddha" value={copy?.buddha ?? ''} />
          <LuckyItem label="Auspicious flowers" value={copy?.luckyFlower ?? ''} />
          <LuckyItem label="Lucky gemstones" value={copy?.luckyStone ?? ''} />
        </div>
        <p className="text-xs text-ink-light mt-4">
          Note: lucky items are a traditional folk reference. The most reliable way to change your luck
          is to keep your conduct clean, learn steadily and work honestly.
        </p>
      </div>

      <div className="hw-c-box mb-6" data-section="zodiac-pairs">
        <h2 className="hw-c-secTitle">{copy?.name} compatibility</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {SHENGXIAO.map((other) => {
            const kind = pairKindOf(sx, other.name)
            const pair = PAIR_EN[kind]
            const good = kind === 'liuHe' || kind === 'sanHe'
            const neutral = kind === 'neutral'
            const otherCopy = SHENGXIAO_EN.find((s) => s.slug === other.slug)
            return (
              <div
                key={other.slug}
                className={`border rounded p-3 text-sm ${good ? 'border-green-200 bg-green-50' : neutral ? 'border-gold/15' : 'border-red-100 bg-red-50/40'}`}
              >
                <div className="flex justify-between items-center mb-1">
                  <Link href={`/en/shengxiao/${other.slug}`} className="font-bold hw-c-link">
                    {copy?.name} + {otherCopy?.name ?? zodiacEn(other.name)}
                  </Link>
                  <span
                    className={`text-xs px-2 py-0.5 rounded ${good ? 'bg-green-100 text-green-700' : neutral ? 'bg-paper-dark/40 text-ink-light' : 'bg-red-100 text-red-600'}`}
                  >
                    {pair.level}
                  </span>
                </div>
                <p className="text-xs text-ink-light leading-relaxed">{pair.desc}</p>
              </div>
            )
          })}
        </div>
      </div>

      <div className="hw-c-box mb-6" data-section="zodiac-liunian">
        <h2 className="hw-c-secTitle">{copy?.name} annual pillars (2024–2031)</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {notes.map((n) => (
            <div key={n.year} className={`border rounded-lg p-3 text-center ${TONE_EN_BOX[n.tone]}`}>
              <div className="font-bold text-lg">{n.year}</div>
              <div className={`text-xs mt-0.5 ${TONE_EN_TX[n.tone]}`}>
                {n.ganZhi} · {n.relationText}
              </div>
            </div>
          ))}
        </div>
        <p className="text-xs text-ink-light mt-3">
          Green marks a harmonious year, red a harm or punishment year, orange a clash year and grey a
          steady year. Year-by-year English pages are not published yet; this table is the summary for
          each year.
        </p>
      </div>

      <div className="hw-c-cta" data-section="zodiac-cta">
        <h2 className="hw-c-secTitle">A sign is only the year branch — the full chart is sharper</h2>
        <p className="hw-c-dx">
          People born under the same sign can lead completely different lives, because a Bazi chart
          includes the year, month, day and hour pillars. Enter your exact birth time to read your own
          chart.
        </p>
        <Link href="/en" className="hw-c-btnBig">
          Cast my Bazi chart →
        </Link>
      </div>

      <p className="hw-alert hw-alert--note text-center mt-6">
        This material follows traditional Chinese folk practice and is offered for reference and
        entertainment only. It is not a basis for financial, medical or legal decisions.
      </p>
    </div>
  )
}

function Section({ title, body }: { title: string; body: string }) {
  return (
    <div className="hw-c-box mb-4" data-section="zodiac-section">
      <h2 className="hw-c-secTitle">{title}</h2>
      <p className="hw-c-body">{body}</p>
    </div>
  )
}

function LuckyItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center gap-3 bg-gold/5 rounded p-3">
      <span className="text-ink-light shrink-0">{label}</span>
      <span className="font-semibold text-ink">{value}</span>
    </div>
  )
}

function Relation({ label, value, tone }: { label: string; value: string; tone: 'good' | 'bad' | 'warn' }) {
  const box = tone === 'good' ? 'bg-green-50 border-green-200' : tone === 'bad' ? 'bg-red-50 border-red-200' : 'bg-orange-50 border-orange-200'
  const tx = tone === 'good' ? 'text-green-700' : tone === 'bad' ? 'text-red-700' : 'text-orange-700'
  return (
    <div className={`${box} border rounded p-2 text-center`}>
      <div className="text-xs text-ink-light">{label}</div>
      <div className={`font-bold ${tx}`}>{value}</div>
    </div>
  )
}

function elementWord(zhi: string): string {
  const words: Record<string, string> = {
    water: 'Water',
    wood: 'Wood',
    fire: 'Fire',
    metal: 'Metal',
    earth: 'Earth',
  }
  return words[ZHI_WX[zhi] ?? 'earth'] ?? 'Earth'
}
