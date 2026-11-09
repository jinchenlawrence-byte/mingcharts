import Link from 'next/link'
import type { SiteLang } from '@/lib/lang'
import { toHant } from '@/lib/hant'

// 方位地理页的服务端说明正文（2026-11-09）。
// 目的：/geo 首行是 'use client'，服务端 HTML 只有约 300 汉字，Google 视为薄页。
// 这里把方法、四类城市、出生地基准、结果读法与适用边界写成服务端可索引正文，
// 全部沿用页面顶部既有口径（方位五行门控 / 城市地气为工程化设定 / 仅供趋避参考），不新增产品承诺。
// 位置：由 page.tsx 作为 children 传给客户端组件，渲染在表单之后，不占首屏。

const ZH = {
  title: '方位地理怎么算：从喜用五行到城市方位',
  sections: [
    {
      h: '一、这套方法在算什么',
      p: [
        '方位地理不是给城市排一个固定的吉凶榜，而是先把你的八字换算成「需要什么五行」，再把这些五行映射到八个方位，最后按城市相对出生地的实际方位做筛选。流程分三步：先按出生年月日时排出四柱，判断日主强弱与喜用、忌神；再把木火土金水对应到东、南、西、北与东南、西南、东北、西北；最后以出生地为圆心，计算候选城市落在哪个方位，命中的方位越贴合喜用，排序越靠前。整套计算由规则引擎确定性完成，同一份出生信息重复生成，方位判定不会变化。',
        '页面顶部的说明已经写明门控口径：候选城市以「方位五行」为门控，方位按城市相对命主出生地实时计算，属传统方位之说；城市地气（物产取象）是本产品的工程化设定，不是古籍原文。理解这两句，才能正确理解下面的城市清单。'
      ]
    },
    {
      h: '二、四类城市分别在看什么',
      p: [
        '财富之城、事业之城、贵人之城、才华之城，区别不在「哪座城市更好」，而在筛选时优先看哪一组信号。财富之城偏向喜用五行与财星所喜的方位，适合把重心放在收入、资源与资产积累的人；事业之城偏向官杀、印星得用的方位，适合求职位、平台与长期发展的人；贵人之城偏向比劫、印星所代表的帮扶关系，适合需要合作、引荐与团队的人；才华之城偏向食伤发用的方位，适合创作、表达与技术输出的人。',
        '四类结果可以重叠，也可以互相矛盾，这正说明它们回答的是不同问题。看结果时不必追求「四类都指向同一座城市」，更实用的读法是先确定自己当前最在意的一件事，再只看对应的那一类。'
      ]
    },
    {
      h: '三、为什么一定要填出生地',
      p: [
        '以出生地为基准，是这套方法与「某个城市旺某种人」说法最大的区别。同一座城市，对出生在哈尔滨的人和出生在广州的人，方位属性完全不同。因此页面要求填写出生地：能在城市库里选到就按城市经纬度计算；找不到城市时可选「其它」，手动指定时区与经度。',
        '如果出生时间接近时辰交界（例如整点前后半小时），建议先做真太阳时校正。时柱一旦整体偏移一个时辰，日主强弱与喜用判断都可能随之改变，后面的方位结论也就不同了。'
      ]
    },
    {
      h: '四、现居城市是可选填项',
      p: [
        '填了现居城市之后，系统会单独评估你当前所在城市相对出生地的方位，再与推荐方位做对照：现居地正好落在喜用方位，说明环境本身对你有利，重点可以放在如何用好它；现居地落在忌神方位，系统只给出「如何减少消耗」的方向性提示，不会建议你立刻搬家。是否迁移涉及工作、家庭、成本等现实因素，命理只能提供一个参考维度。'
      ]
    },
    {
      h: '五、结果页怎么读',
      p: [
        '结果分两部分：规则版给出方位、城市清单与命中理由，全部由确定性规则生成；AI 解读只在这些事实之上做组织与表述，不改变方位判定，也不会新增没有计算依据的结论。若 AI 部分生成失败，页面会退回规则版，仍然可以看到完整的城市清单与理由。',
        '城市推荐只回答「哪个方向更贴合你的喜用」，不回答「去了就一定会发财」「搬过去就一定顺利」。同一方位下的城市，生活成本、气候、行业结构差异巨大，这些现实条件远比方位重要。全部结论仅供趋避参考，不构成迁移、投资或职业决策依据。'
      ]
    }
  ],
  links: [
    { href: '/liunian', label: '看某一年的流年走势 →' },
    { href: '/article/bazi', label: '先补八字基础概念 →' }
  ]
}

const EN = {
  title: 'How Location & Direction is calculated: from favourable elements to city bearings',
  sections: [
    {
      h: '1. What this page actually computes',
      p: [
        'This is not a fixed ranking of good and bad cities. It first reads your chart to decide which of the Five Elements you need, maps those elements to compass bearings, and then filters cities by their bearing relative to your birthplace. The sequence has three steps: cast the four pillars from the birth date and hour, judge the strength of the Day Master and identify favourable and unfavourable elements; map Wood, Fire, Earth, Metal and Water to east, south, centre, west and north plus the four diagonal bearings; then measure each candidate city from your birthplace and rank the matches. The whole calculation is deterministic, so the same birth details always produce the same bearings.',
        'Two limits are stated at the top of the page and apply to everything below: the candidate list is gated by directional Five Elements computed live from the birthplace, which is a traditional directional method; and city qi — the produce and character a place is associated with — is an engineered convention of this product, not a quotation from the classics.'
      ]
    },
    {
      h: '2. What the four city lists are looking for',
      p: [
        'Wealth, career, benefactor and talent cities do not say which city is better. They say which signal is prioritised. Wealth cities look at bearings tied to the element your wealth star favours, which suits people focused on income, resources and assets. Career cities look at bearings where the Officer and Resource stars are supported, which suits people seeking position, platform and long-term development. Benefactor cities look at bearings associated with support from peers and mentors, which suits people who rely on collaboration and referral. Talent cities look at bearings where the Output stars are expressed, which suits writing, performance and technical work.',
        'The four lists can overlap or contradict each other, because they answer different questions. A practical reading is to pick the one thing you care about most this year and read only that list, rather than insisting that all four point to the same place.'
      ]
    },
    {
      h: '3. Why the birthplace is required',
      p: [
        'Using the birthplace as the centre is the main difference between this method and the claim that a given city is lucky for a given type of person. The same city sits in a completely different bearing for someone born in Harbin and someone born in Guangzhou. That is why the form asks for a birthplace: pick a city and its longitude and latitude are used; if your city is not listed, choose the manual option and set the time zone and longitude yourself.',
        'If the birth time falls close to a two-hour boundary, correct it to True Solar Time first. Moving the hour pillar by one slot can change the strength of the Day Master and therefore the favourable elements, which in turn changes every bearing below.'
      ]
    },
    {
      h: '4. The current city is optional',
      p: [
        'If you enter the city you live in now, the page assesses its bearing from your birthplace separately and compares it with the recommended bearings. If your current city already sits in a favourable bearing, the environment supports you and the question becomes how to use it well. If it sits in an unfavourable bearing, the page only offers directional notes on reducing friction; it never tells you to move. Relocation involves work, family and cost, and a chart is only one input.'
      ]
    },
    {
      h: '5. How to read the result',
      p: [
        'The result has two layers. The rule layer lists bearings, cities and the reason each city matched, all produced by deterministic rules. The AI commentary organises and explains those facts; it does not change the bearings and does not add conclusions that were never computed. If the AI layer fails, the page falls back to the rule layer and the full city list remains visible.',
        'A city recommendation only answers which direction fits your favourable elements. It does not promise wealth or smooth sailing after a move. Cities in the same bearing differ enormously in cost of living, climate and industry, and those practical factors matter far more than the bearing. Everything here is for reference and avoidance, not a basis for relocation, investment or career decisions.'
      ]
    }
  ],
  links: [
    { href: '/en/liunian', label: 'Read a single year in the annual report →' },
    { href: '/en/shengxiao', label: 'Start from the zodiac signs →' }
  ]
}

export default function GeoIntro({ locale }: { locale: SiteLang }) {
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
            ? 'The notes below explain what the calculation does, what each city list means, and where its limits are.'
            : locale === 'zh-Hant'
              ? toHant('以下说明这套算法在算什么、四类城市分别代表什么，以及它的适用边界。')
              : '以下说明这套算法在算什么、四类城市分别代表什么，以及它的适用边界。'}
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
          {isEn ? 'Continue reading: ' : locale === 'zh-Hant' ? '延伸阅读：' : '延伸阅读：'}
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
