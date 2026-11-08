import Link from 'next/link'
import type { ReactNode } from 'react'
import { SHENGXIAO } from '@/lib/shengxiaoData'
import { SHENGXIAO_EN, elementClass } from '@/lib/shengxiaoEn'
import { BRANCH_ELEMENT, branchEn, zodiacEn } from '@/lib/enTerms'
import { pathForLang, type SiteLang } from '@/lib/lang'
import { toHant } from '@/lib/hant'

// 十二生肖索引页（简/繁/英共用，2026-11-09 收敛）
// 此前繁体是早期独立实现（两列卡片 + 灰色流年小标签），与简/英的圆徽卡片墙完全不同。
// 现在三棵树都渲染本组件，只按 locale 切换文案；视觉全部走 hw- 令牌。

const ZHI_WX: Record<string, 'wood' | 'fire' | 'earth' | 'metal' | 'water'> = {
  子: 'water', 亥: 'water',
  寅: 'wood', 卯: 'wood',
  巳: 'fire', 午: 'fire',
  申: 'metal', 酉: 'metal',
  辰: 'earth', 戌: 'earth', 丑: 'earth', 未: 'earth',
}

interface IndexCopy {
  home: string
  crumb: string
  h1: string
  lede: string
  cardTitle: (name: string) => string
  cardMeta: (sx: (typeof SHENGXIAO)[number], name: string) => string
  yearTitle: string
  yearBody: ReactNode
  chip: (name: string) => string
  originTitle: string
  originBody: string
  relationTitle: string
  relationBody: string
  ctaLabel: string
}

function copyFor(locale: SiteLang): IndexCopy {
  if (locale === 'en') {
    const name = (sx: (typeof SHENGXIAO)[number]) =>
      SHENGXIAO_EN.find((s) => s.slug === sx.slug)?.name ?? zodiacEn(sx.name)
    return {
      home: 'Home',
      crumb: 'Chinese zodiac',
      h1: 'The twelve Chinese zodiac signs',
      lede: 'Pick your sign to read its personality, career, money, marriage and compatibility, plus its guardian buddha, lucky items and the annual pillar notes from 2024 to 2031.',
      cardTitle: (n) => n,
      cardMeta: (sx) => `${branchEn(sx.zhi)} · ${BRANCH_ELEMENT[sx.zhi]}`,
      yearTitle: '2027, the year of Ding Wei',
      yearBody: (
        <>
          2027 begins as a Ding Wei year at Li Chun. The Goat is in its benming year (Zhi Tai Sui); the
          Ox clashes and is also punished; the Dog is punished; the Rat is harmed. The Horse is in Six
          Harmony with the year, and the Pig and the Rabbit are in Three Harmony with it. Each sign page
          carries the same notes for every year from 2024 to 2031.
        </>
      ),
      chip: (n) => `${n} · 2027`,
      originTitle: 'Where do the twelve signs come from?',
      originBody:
        'The zodiac is a way of counting years with the twelve Earthly Branches: Zi for the Rat, Chou for the Ox, Yin for the Tiger, Mao for the Rabbit, Chen for the Dragon, Si for the Snake, Wu for the Horse, Wei for the Goat, Shen for the Monkey, You for the Rooster, Xu for the Dog and Hai for the Pig. A sign is fixed by the annual branch, and the year changes at Li Chun, the start of spring, not on 1 January. In practice the branch also carries a fixed relation to the other branches — Six Harmony, Three Harmony, clash, harm and punishment — which is what traditional matchmaking and annual readings are built on.',
      relationTitle: 'Zodiac and the full Bazi chart',
      relationBody:
        'Your sign is only the year branch — one of the eight characters in a Bazi chart. Personality and fortune are read from all four pillars together, so two people born under the same sign can lead very different lives. A sign reading is a useful broad reference; for a decision that matters, read the whole chart.',
      ctaLabel: 'Enter your birth time for a full chart →',
    }
  }

  const H = locale === 'zh-Hant' ? toHant : (s: string) => s
  if (locale === 'zh-Hant') {
    return {
      home: '首頁',
      crumb: '十二生肖',
      h1: '十二生肖性格與流年運勢',
      lede: '生肖即年支，是八字四柱裡的一支。以下為十二屬相的性格、事業財運、婚姻配對與流年太歲關係。',
      cardTitle: (n) => `屬${n}`,
      cardMeta: (sx) => `${sx.zhi} · ${H(sx.wuxing)} · 本命佛${H(sx.benmingfo.replace('菩萨', ''))}`,
      yearTitle: '2027 丁未年運勢 · 十二屬相',
      yearBody: (
        <>
          2027 年立春後為丁未年。屬羊值太歲（本命年）、屬牛沖太歲兼刑、屬狗刑太歲、屬鼠害太歲；屬馬六合，屬豬與屬兔三合。
          下面是各屬相 2027 年的分項運勢，另有
          <Link href="/tw/article/2027-dingwei-nian-yunshi" className="hw-c-link">「丁未年運勢怎麼看」</Link>與
          <Link href="/tw/article/2027-fantaishui" className="hw-c-link">「犯太歲怎麼化解」</Link>兩篇說明。
        </>
      ),
      chip: (n) => `屬${n} · 2027`,
      originTitle: '生肖是怎麼來的？',
      originBody:
        '十二生肖又稱屬相，是中國傳統以十二地支配十二種動物的紀年方式：子鼠、丑牛、寅虎、卯兔、辰龍、巳蛇、午馬、未羊、申猴、酉雞、戌狗、亥豬。生肖以每年立春為界（非公曆 1 月 1 日）。命理中通過生肖地支之間的六合、三合、相沖、相害、相刑關係，可推斷婚配好壞與流年運勢。',
      relationTitle: '生肖與八字的關係',
      relationBody:
        '生肖只是八字中「年支」一個字，看性格運勢以完整八字（年月日時四柱）更為準確。生肖運勢適合通俗參考，重大決策建議結合完整八字命盤綜合分析。',
      ctaLabel: '輸入時辰看完整八字 →',
    }
  }

  return {
    home: '首页',
    crumb: '十二生肖',
    h1: '十二生肖运势大全',
    lede: '点击您的属相，查看性格、事业、财运、婚姻、配对、本命佛、幸运颜色与数字，以及逐年流年运势。',
    cardTitle: (n) => `属${n}`,
    cardMeta: (sx) => `${sx.zhi} · ${sx.wuxing} · 本命佛${sx.benmingfo.replace('菩萨', '')}`,
    yearTitle: '2027 丁未年运势 · 十二属相',
    yearBody: (
      <>
        2027 年立春后为丁未年。属羊值太岁（本命年）、属牛冲太岁兼刑、属狗刑太岁、属鼠害太岁；属马六合，属猪与属兔三合。
        下面是各属相 2027 年的分项运势，另有
        <Link href="/article/2027-dingwei-nian-yunshi" className="hw-c-link">「丁未年运势怎么看」</Link>与
        <Link href="/article/2027-fantaishui" className="hw-c-link">「犯太岁怎么化解」</Link>两篇说明。
      </>
    ),
    chip: (n) => `属${n} · 2027`,
    originTitle: '生肖是怎么来的？',
    originBody:
      '十二生肖又称属相，是中国传统以十二地支配十二种动物的纪年方式：子鼠、丑牛、寅虎、卯兔、辰龙、巳蛇、午马、未羊、申猴、酉鸡、戌狗、亥猪。生肖以每年立春为界（非公历 1 月 1 日），决定一个人的属相。命理中通过生肖地支之间的六合、三合、相冲、相害、相刑关系，可推断婚配好坏与流年运势。',
    relationTitle: '生肖与八字的关系',
    relationBody:
      '生肖只是八字中"年支"一个字，看性格运势以完整八字（年月日时四柱）更为准确。生肖运势适合作为通俗参考，而重大决策建议结合完整八字命盘综合分析。',
    ctaLabel: '输入时辰看完整八字 →',
  }
}

export function ShengXiaoIndex({ locale }: { locale: SiteLang }) {
  const c = copyFor(locale)
  const H = locale === 'zh-Hant' ? toHant : (s: string) => s
  const nameOf = (sx: (typeof SHENGXIAO)[number]) =>
    locale === 'en'
      ? SHENGXIAO_EN.find((s) => s.slug === sx.slug)?.name ?? zodiacEn(sx.name)
      : H(sx.name)

  return (
    <div className="hw-wrap hw-c-pg" data-section="zodiac-index">
      <nav className="hw-c-back">
        <Link href={pathForLang('/', locale)}>{c.home}</Link>
        <span className="mx-2">›</span>
        <span>{c.crumb}</span>
      </nav>

      <header>
        <h1 className="hw-c-h1">{c.h1}</h1>
        <p className="hw-lede">{c.lede}</p>
      </header>

      <div className="hw-zod mb-10" data-section="zodiac-grid">
        {SHENGXIAO.map((sx) => {
          const name = nameOf(sx)
          return (
            <Link key={sx.slug} href={pathForLang(`/shengxiao/${sx.slug}`, locale)}>
              <span className={`hw-zx hw-${ZHI_WX[sx.zhi] ?? (locale === 'en' ? elementClass(sx.zhi) : 'earth')}`}>
                {locale === 'en' ? branchEn(sx.zhi) : name}
              </span>
              <span>
                <b>{c.cardTitle(name)}</b>
                <i>{c.cardMeta(sx, name)}</i>
              </span>
            </Link>
          )
        })}
      </div>

      <div className="hw-c-box mb-10" data-section="zodiac-year">
        <h2 className="hw-c-secTitle">{c.yearTitle}</h2>
        <p className="hw-c-body mb-4">{c.yearBody}</p>
        <div className="flex flex-wrap gap-x-4 gap-y-2">
          {SHENGXIAO.map((sx) => (
            <Link
              key={sx.slug}
              href={pathForLang(locale === 'en' ? `/shengxiao/${sx.slug}` : `/shengxiao/${sx.slug}/2027`, locale)}
              className="hw-c-link text-sm"
            >
              {c.chip(nameOf(sx))}
            </Link>
          ))}
        </div>
      </div>

      <div className="hw-c-two" data-section="zodiac-explain">
        <div className="hw-c-box">
          <h2 className="hw-c-secTitle">{c.originTitle}</h2>
          <p className="hw-c-body">{c.originBody}</p>
        </div>
        <div className="hw-c-box">
          <h2 className="hw-c-secTitle">{c.relationTitle}</h2>
          <p className="hw-c-body mb-4">{c.relationBody}</p>
          <Link href={pathForLang('/', locale)} className="hw-c-btnBig">
            {c.ctaLabel}
          </Link>
        </div>
      </div>
    </div>
  )
}
