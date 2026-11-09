import Link from 'next/link'
import type { SiteLang } from '@/lib/lang'
import { toHant } from '@/lib/hant'

// 紫微斗数页的服务端说明正文（2026-11-09）。
// 目的：/ziwei 首行是 'use client'，服务端 HTML 只有约 245 汉字。
// 这里把排盘口径、十二宫、主星与四化、大限流年、结果读法写成服务端可索引正文，
// 沿用页面既有口径（农历排盘 / 规则版与 AI 解读分层 / 仅供参照），不新增产品承诺。

const ZH = {
  title: '紫微斗数排盘怎么看：十二宫、主星与四化',
  sections: [
    {
      h: '一、排盘口径',
      p: [
        '紫微斗数以农历出生年、月、日、时排盘，先定命宫与身宫，再把十二宫依次排定，最后安十四主星、辅星与四化。页面要求填写公历生日与出生时辰，系统内部换算成农历后再排盘；遇到闰月会按闰月口径处理。出生时辰是关键输入，时辰错一个，命宫位置就可能整体偏移，所以填表前请先确认是「几点几分出生」而不是「大概几点」。',
        '排盘结果是一张静态的盘：命宫所在、十二宫的主星与辅星、每颗星的庙旺利陷、四化落在哪一宫。这些都由规则引擎确定性生成，同一份出生信息重复排盘，结果完全一致。'
      ]
    },
    {
      h: '二、十二宫各看什么',
      p: [
        '十二宫从命宫起，逆序为命宫、兄弟、夫妻、子女、财帛、疾厄、迁移、交友、官禄、田宅、福德、父母。命宫看整体性格与人生基调；兄弟看同辈与手足关系；夫妻看亲密关系与伴侣特质；子女看子女缘与创造力；财帛看收入方式与金钱观；疾厄看体质与压力反应；迁移看外出、异地与环境变化；交友看合作与人际网络；官禄看事业方向与工作方式；田宅看居住与家庭资产；福德看精神状态与享受方式；父母看长辈缘与上级关系。',
        '单看一宫容易失真，实际解读会同时看对宫与三方四正，也就是把相关宫位放在一起看。这也是为什么同一颗星落在不同宫位，含义差别很大。'
      ]
    },
    {
      h: '三、主星、庙旺与四化',
      p: [
        '十四主星各有基本性质，落在不同宫位会带上该宫的议题。亮度（庙、旺、利、平、陷）描述这颗星在这个位置发挥得顺不顺，而不是好坏评语；同一颗星庙旺时特质外显、执行力强，落陷时更容易表现为反复或内耗。',
        '四化是盘上变化最直接的一层：化禄偏向机会与资源，化权偏向掌控与推动，化科偏向名声与学习，化忌偏向执着与阻力。看四化要先看它从哪一宫飞出、落到哪一宫，再看这两宫之间的关系，才能判断这股力量作用在什么事情上。'
      ]
    },
    {
      h: '四、大限与流年',
      p: [
        '大限以十年为一运，从命宫起按阴阳男女顺逆排布，标出这十年主要落在哪些宫位；流年则按当年干支定位流年命宫，再用流年四化看当年的变化点。报告里的「大限」与「流年」是两层不同的时间尺度：大限回答这十年的主题，流年回答今年具体被什么触发。两者叠加时，以宫位重合、四化互涉的地方为观察重点。',
        '需要提醒的是，大限与流年只描述议题被放大的位置，不直接等于事件。具体到某一年会发生什么，仍取决于现实选择与外部条件。'
      ]
    },
    {
      h: '五、规则版与 AI 解读',
      p: [
        '报告分两层：规则版按宫位、主星、亮度、四化与大限流年逐项给出结构化结论；AI 深度解读在这些结构化事实之上做串联与表述，不会改动盘面，也不会凭空补一颗不存在的星。若 AI 部分生成失败，页面会退回规则版，仍然可以看到完整的宫位与星曜信息，并明确标出哪些板块是规则版。',
        '所有结论都属传统命理参照，不构成医疗、法律、投资或职业决策依据。身体状况请以医学检查为准，重大决定请结合现实条件判断。'
      ]
    }
  ],
  links: [
    { href: '/bazi', label: '对照八字排盘看原局 →' },
    { href: '/liunian', label: '看某一年的流年走势 →' }
  ]
}

const EN = {
  title: 'How to read a Zi Wei Dou Shu chart: twelve palaces, main stars and the four transformations',
  sections: [
    {
      h: '1. How the chart is cast',
      p: [
        'Zi Wei Dou Shu is cast from the lunar year, month, day and hour of birth. The Life Palace and Body Palace are fixed first, the twelve palaces are laid out in order, and then the fourteen main stars, the auxiliary stars and the four transformations are placed. The form asks for a Gregorian date and a birth hour; the chart is converted to the lunar calendar internally, with leap months handled explicitly. The birth hour is the most fragile input: shift it by one two-hour slot and the Life Palace can move, which changes the whole reading.',
        'The result is a static chart: where the Life Palace sits, which main and auxiliary stars occupy each palace, how bright each star is in that position, and which palace each transformation falls into. All of it is produced by deterministic rules, so the same birth details always reproduce exactly the same chart.'
      ]
    },
    {
      h: '2. What the twelve palaces cover',
      p: [
        'Starting from the Life Palace and moving in reverse order, the twelve palaces are Life, Siblings, Spouse, Children, Wealth, Health, Travel, Friends, Career, Property, Wellbeing and Parents. Life covers temperament and the overall tone of the chart; Siblings covers peers and siblings; Spouse covers intimate relationships and the partner\'s traits; Children covers children and creative output; Wealth covers income style and attitudes to money; Health covers constitution and stress response; Travel covers going out, living elsewhere and environmental change; Friends covers collaboration and networks; Career covers direction and working style; Property covers housing and family assets; Wellbeing covers state of mind and enjoyment; Parents covers elders and superiors.',
        'A single palace is rarely read alone. A proper reading also looks at the opposite palace and the trine, which is why the same star can mean very different things depending on where it lands.'
      ]
    },
    {
      h: '3. Main stars, brightness and the four transformations',
      p: [
        'Each of the fourteen main stars has a basic nature, and that nature picks up the theme of the palace it occupies. Brightness — temple, prosperous, favourable, neutral or fallen — describes how comfortably the star operates in that position; it is not a verdict of good or bad. A bright star expresses its traits openly and executes well, while a fallen star tends to show up as repetition or inner friction.',
        'The four transformations are the most direct layer of change on the chart: Lu points to opportunity and resources, Quan to control and drive, Ke to reputation and learning, and Ji to fixation and obstruction. Read them by asking which palace the transformation flies out of and which palace it lands in, then judge the relationship between those two palaces.'
      ]
    },
    {
      h: '4. Decade cycles and annual cycles',
      p: [
        'A decade cycle covers ten years and is laid out from the Life Palace according to yin-yang and gender, marking which palaces the decade mainly activates. The annual cycle locates the year\'s Life Palace from the year\'s stem and branch and uses the annual transformations to find the year\'s pressure points. The two are different time scales: the decade describes the theme of ten years, the year describes what triggers it now. Where the palaces overlap or the transformations intersect is where the reading focuses.',
        'Neither layer is an event prediction. They show where a theme is amplified; what actually happens still depends on real choices and external conditions.'
      ]
    },
    {
      h: '5. Rule layer and AI commentary',
      p: [
        'The report has two layers. The rule layer states conclusions palace by palace, star by star, including brightness, transformations and the decade and annual cycles. The AI commentary connects those structured facts and explains them in prose without altering the chart or inventing a star that is not there. If the AI layer fails, the page falls back to the rule layer: the full palace and star data remain visible, and every degraded section is labelled as rule-based.',
        'Everything here is a traditional reference, not a basis for medical, legal, investment or career decisions. For health, rely on medical examination; for major decisions, weigh the real circumstances.'
      ]
    }
  ],
  links: [
    { href: '/en/bazi', label: 'Compare with the Four Pillars chart →' },
    { href: '/en/liunian', label: 'Read a single year in the annual report →' }
  ]
}

export default function ZiweiIntro({ locale }: { locale: SiteLang }) {
  const isEn = locale === 'en'
  const t = isEn ? EN : {
    title: locale === 'zh-Hant' ? toHant(ZH.title) : ZH.title,
    sections: ZH.sections.map(s => ({
      h: locale === 'zh-Hant' ? toHant(s.h) : s.h,
      p: s.p.map(x => (locale === 'zh-Hant' ? toHant(x) : x))
    })),
    links: ZH.links.map(l => ({ ...l, label: locale === 'zh-Hant' ? toHant(l.label) : l.label }))
  }

  return (
    <section className="mt-12" data-section="tool-intro">
      <div className="hw-c-box mb-4">
        <h2 className="hw-c-secTitle">{t.title}</h2>
        <p className="hw-c-body">
          {isEn
            ? 'The notes below explain how the chart is cast, how the palaces and stars are read, and where the limits are.'
            : locale === 'zh-Hant'
              ? toHant('以下说明排盘口径、十二宫与星曜怎么读，以及这套结论的适用边界。')
              : '以下说明排盘口径、十二宫与星曜怎么读，以及这套结论的适用边界。'}
        </p>
      </div>
      {t.sections.map(s => (
        <div key={s.h} className="hw-c-box mb-4">
          <h3 className="font-semibold text-ink mb-2">{s.h}</h3>
          {s.p.map((x, i) => (
            <p key={i} className="hw-c-body">
              {x}
            </p>
          ))}
        </div>
      ))}
      <div className="hw-c-box mb-4">
        <p className="text-sm text-ink/70">
          {isEn ? 'Continue reading: ' : locale === 'zh-Hant' ? '延伸閱讀：' : '延伸阅读：'}
          {t.links.map((l, i) => (
            <span key={l.href}>
              {i > 0 && <span className="mx-2 text-ink-light">·</span>}
              <Link href={l.href} className="hw-c-link">
                {l.label}
              </Link>
            </span>
          ))}
        </p>
      </div>
    </section>
  )
}
