import Link from 'next/link'
import type { SiteLang } from '@/lib/lang'
import { toHant } from '@/lib/hant'

// 年运报告页的服务端说明正文（2026-11-09）。
// 目的：/liunian 首行是 'use client'，服务端 HTML 只有约 365 汉字。
// 这里把流年口径、五步读法、目标年份与流月、规则版与 AI 分层写成服务端可索引正文，
// 沿用页面既有口径（按 Asia/Shanghai 判定年份 / 规则引擎确定性 / 仅供参照），不新增产品承诺。

const ZH = {
  title: '年运报告怎么读：流年干支、十神与原局的关系',
  sections: [
    {
      h: '一、流年不是另一张命盘',
      p: [
        '流年指的是某一年的干支与原局四柱发生的关系，它本身不是一张新的命盘。判断一年走势，本质上是看这一年的天干地支，对你原本的日主、月令、格局与喜用产生了什么作用：是被生扶，还是被克制；是补上了原局缺的那一块，还是加重了本来就偏旺的一头。因此同一份原局，不同年份的结论差别很大，不能拿一套通用的「今年运势」套在所有人身上。',
        '报告里的年份判定以北京时间（Asia/Shanghai）为基准，跨年、跨月都按这一时区计算，避免东八区晚间跨日造成年份错位。'
      ]
    },
    {
      h: '二、五步读法',
      p: [
        '第一步看流年干支与日主的关系，定出这一年的十神主题，是比劫、食伤、财星、官杀还是印星当令；第二步看流年与原局四柱的冲、合、刑、害，找出被触动的宫位与十神；第三步看这一步大运给流年提供了什么底子，是顺势还是逆势；第四步分领域落点，把事业、财运、感情、健康各自对应到被引动的十神与宫位上；第五步才是表述，把前面的事实组织成可读的段落。',
        '顺序不能反过来。先有干支、十神、冲合、大运这些确定性事实，才有解读；如果先给结论再倒推依据，读者无法核对，报告也就失去了参考价值。'
      ]
    },
    {
      h: '三、目标年份与流月',
      p: [
        '报告按年生成，你可以指定要看的年份。已经过去的年份，报告给出的是规则版回顾，用当年的干支与原局对照，适合复盘；当年与未来年份包含更多展开内容，其中当年报告会进一步拆到流月，标出每个月被引动的十神与需要留意的节点。',
        '流月是在流年之下的第二层时间刻度：流年定主题，流月定节奏。某一年整体平顺，不代表每个月都平顺；反过来，某一年压力较大，也总有几个月份相对缓和。看流月时建议结合自己已知的日程安排，而不是把它们当成必须回避的日子。'
      ]
    },
    {
      h: '四、规则版与 AI 解读的分工',
      p: [
        '规则版负责事实：流年干支、十神、冲合关系、大运背景、分领域提示，全部由规则引擎确定性生成，同一份出生信息与同一年份重复生成，结论一致。AI 解读只负责把这些事实串成连贯的叙述，让它读起来像一份报告而不是一张表；它不会改变十神判定，也不会新增没有计算依据的结论。',
        '如果 AI 部分生成失败或只完成了一部分，页面会明确标出哪些板块是规则版、哪些是完整解读，不会用「已生成」掩盖缺失。付费报告在只出规则版时支持重新生成，免费报告不提供重新生成入口，这一规则在页面与接口层同时校验。'
      ]
    },
    {
      h: '五、适用边界',
      p: [
        '年运报告描述的是「这一年哪些议题会被放大」，不是「这一年一定会发生什么」。同一组十神在不同人的现实处境里，可能表现为换工作、搬家、考试、合作，也可能只是心态上的起伏。把它当成一份提前知道「哪里需要多留心」的清单，比当成预言更有用。',
        '所有结论仅供参照，不构成医疗、法律、投资或职业决策依据。涉及健康请以医学检查为准，涉及重大财务与职业选择请结合现实条件独立判断。'
      ]
    }
  ],
  links: [
    { href: '/bazi', label: '先看原局四柱排盘 →' },
    { href: '/ziwei', label: '用紫微斗数对照大限流年 →' }
  ]
}

const EN = {
  title: 'How to read an annual report: the year pillar, the Ten Gods and your natal chart',
  sections: [
    {
      h: '1. A year is not a second chart',
      p: [
        'The annual pillar is the relationship between one year\'s stem and branch and the four pillars of your natal chart. It is not a separate chart. Judging a year means asking what that stem and branch do to your Day Master, month command, structure and favourable elements: do they support you or restrain you, do they supply the element your chart lacks, or do they add weight to the side that is already strong? The same natal chart therefore produces very different readings in different years, and no generic yearly horoscope applies to everyone.',
        'Year boundaries in the report use Beijing time (Asia/Shanghai), so switching years and months is computed in that time zone rather than from a UTC date.'
      ]
    },
    {
      h: '2. Five steps of reading',
      p: [
        'First, relate the annual stem and branch to the Day Master to identify the year\'s Ten Gods theme: peers, output, wealth, officer or resource. Second, check clashes, combinations, punishments and harms between the year and the natal pillars to see which palaces and gods are activated. Third, look at the current decade cycle to see whether it supports or opposes the year. Fourth, map the theme onto life areas — career, money, relationships and health — using the activated gods and palaces. Fifth, write it up.',
        'The order cannot be reversed. Deterministic facts come first — stems, branches, Ten Gods, clashes, decade background — and interpretation follows. A conclusion written first and justified afterwards cannot be checked by the reader, which defeats the purpose of a report.'
      ]
    },
    {
      h: '3. Target years and monthly breakdown',
      p: [
        'Reports are generated year by year and you choose which year to read. For years already past, the report is a rule-based review that compares that year\'s pillar with your natal chart, which is useful for looking back. The current year and future years include more material, and the current-year report breaks down into months, marking which Ten Gods each month activates and which points deserve attention.',
        'Months are the second time scale beneath the year: the year sets the theme, the month sets the rhythm. A smooth year does not mean every month is smooth, and a pressured year still contains calmer months. Read the monthly notes against your own calendar rather than treating them as dates to avoid.'
      ]
    },
    {
      h: '4. Rule layer versus AI commentary',
      p: [
        'The rule layer owns the facts: annual stem and branch, Ten Gods, clashes and combinations, decade background and life-area notes, all produced deterministically so the same birth details and the same year always give the same result. The AI layer only turns those facts into connected prose, so the output reads like a report instead of a table. It does not change the Ten Gods judgement and does not add conclusions that were never computed.',
        'If the AI layer fails or only completes part of the work, the page labels which sections are rule-based and which are fully generated rather than presenting a partial result as complete. Paid reports that only produced the rule layer can be regenerated; free reports do not offer regeneration, and the rule is enforced in both the page and the API.'
      ]
    },
    {
      h: '5. Where the limits are',
      p: [
        'An annual report shows which themes are amplified in a given year, not what will certainly happen. The same set of Ten Gods can show up as a job change, a move, an exam, a partnership, or simply a shift in mood, depending on the person\'s real circumstances. It is more useful read as a list of where to pay attention than as a prophecy.',
        'Everything here is a traditional reference, not a basis for medical, legal, investment or career decisions. For health, rely on medical examination; for major financial and career choices, judge the real circumstances independently.'
      ]
    }
  ],
  links: [
    { href: '/en/bazi', label: 'Start with the Four Pillars chart →' },
    { href: '/en/ziwei', label: 'Cross-check with Zi Wei decade cycles →' }
  ]
}

export default function LiunianIntro({ locale }: { locale: SiteLang }) {
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
            ? 'The notes below explain how a year is judged, how the monthly breakdown works, and where the limits are.'
            : locale === 'zh-Hant'
              ? toHant('以下说明流年怎么判、流月怎么用，以及这份报告的适用边界。')
              : '以下说明流年怎么判、流月怎么用，以及这份报告的适用边界。'}
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
