'use client'

// 「不知道出生时辰怎么办」引导页内容（2026-11-11）
// 只收有实据的方法；依据薄弱的明确标注，不写江湖说法。
import Link from 'next/link'
import { localize } from '@/lib/hant'
import type { SiteLang } from '@/lib/lang'
import { pathForLang } from '@/lib/lang'

function Section({ title, children, locale }: { title: string; children: React.ReactNode; locale: SiteLang }) {
  const L = (s: string) => localize(s, locale)
  return (
    <section className="hw-c-box hw-c-boxLg">
      <h2 className="hw-c-h3 mb-2">{L(title)}</h2>
      <div className="text-[15px] text-ink leading-relaxed space-y-2">{children}</div>
    </section>
  )
}

export default function HemunHourGuide({ locale }: { locale: SiteLang }) {
  const L = (s: string) => localize(s, locale)
  return (
    <div className="space-y-4">
      <p className="text-[15px] text-ink leading-relaxed">
        {L('很多人只记得自己哪天出生，不记得几点。这很正常，也不影响你先看合婚里最要紧的那部分。下面按可靠程度排，能查到哪一步算哪一步。')}
      </p>

      <Section title="一、先分清：你要找的是「几点」还是「哪个时辰」" locale={locale}>
        <p>{L('八字用的是时辰（每两小时一个），不是精确到分钟。能把时间缩小到某个时辰区间就够了，不必追到分钟。')}</p>
        <p className="text-sm text-ink-light">
          {L('子时 23–1 点、丑时 1–3 点、寅时 3–5 点，依次类推。唯一要特别注意的是：晚上 23 点以后，日柱会换到下一天。')}
        </p>
      </Section>

      <Section title="二、最可靠：出生医学证明与医院记录" locale={locale}>
        <p>{L('这是第一优先级，因为它有书面记录，不靠回忆。')}</p>
        <ul className="list-disc list-inside text-sm space-y-1 text-ink/85">
          <li>{L('《出生医学证明》：部分版本会记录出生时间，翻出来看正面与副页。')}</li>
          <li>{L('分娩医院的住院病历/分娩记录：可向当时分娩的医院申请复印病历资料，通常需要本人身份证与关系证明。')}</li>
          <li>{L('预防接种证、母子健康手册、户籍登记材料：有的会写出生时刻。')}</li>
        </ul>
        <p className="text-sm text-ink-light">
          {L('注意：户籍登记上的时间不一定是出生时间，很多人是几天后去登记的。看到「某日某时」要先确认那是出生时刻还是登记时刻。')}
        </p>
      </Section>

      <Section title="三、次可靠：问长辈，但要问对问题" locale={locale}>
        <p>{L('直接问「你记得我几点生的吗」，多半得到「好像是下午」。换成问具体场景，回忆会准得多：')}</p>
        <ul className="list-disc list-inside text-sm space-y-1 text-ink/85">
          <li>{L('「生我的时候是白天还是夜里？天亮了没有？」')}</li>
          <li>{L('「是吃完早饭、午饭，还是晚饭前后？」')}</li>
          <li>{L('「当时家里谁在？有没有赶着去上工、或者刚下班？」')}</li>
          <li>{L('「那天有没有下雨、停电、或者邻居来帮忙？」')}</li>
        </ul>
        <p className="text-sm text-ink-light">
          {L('分开问父母、祖辈、接生的人，各自独立回答后对一下。如果几个人说的是同一个区间，可信度就高；说法差得远，就按「不确定」处理，不要硬挑一个。')}
        </p>
      </Section>

      <Section title="四、依据薄弱：按排行、体型反推，不值得用来填" locale={locale}>
        <p>
          {L('民间有按兄弟姐妹排行、头旋、体型、睡姿反推时辰的说法。这类方法没有子平经典依据，准确率也无法验证。')}
        </p>
        <p>
          {L('更关键的是：猜出来的时间一旦填进去，系统会把它当成你提供的事实来算，结论看起来「有据」，出错时你无从发现——这比系统替你编一个时辰更危险。')}
        </p>
        <p>
          {L('所以这一条只用来说明为什么不猜，不是查时辰的方法。不确定就留空：留空时系统会明确列出哪几项没算，边界一眼看得见；猜一个时辰填进去，边界就消失了。')}
        </p>
      </Section>

      <Section title="五、填写前要知道的两个边界" locale={locale}>
        <ul className="list-disc list-inside text-sm space-y-1 text-ink/85">
          <li>{L('23 点换日：晚上 23 点之后出生，日柱按第二天算。这一条会直接改变夫妻宫，填之前先确认是不是跨了 23 点。')}</li>
          <li>{L('真太阳时：出生地经度与北京时间有差，页面会让你选出生地，我们会按经度校正。出生地不确定时，误差通常在十几分钟内，影响小于选错时辰。')}</li>
        </ul>
      </Section>

      <Section title="六、找不到也不影响这三件事" locale={locale}>
        <p>
          {L('合婚里，夫妻宫（日支）关系、双方日干五行、配偶星是否透干这三项只依赖年、月、日三柱，不需要时辰。')}
        </p>
        <p className="text-sm text-ink-light">
          {L('只有五行强弱、配偶星旺衰、婚姻宫与时支的关系、十神互见、大运同步、子女宫这六项必须有时辰。缺时辰时我们不会拿默认时间去凑，而是明确告诉你哪几项没算。')}
        </p>
        <p className="pt-1">
          <Link href={pathForLang('/hemun', locale)} className="text-sm underline underline-offset-4">
            {L('先用三柱看合婚 ›')}
          </Link>
        </p>
      </Section>

      <Section title="七、不建议做的事" locale={locale}>
        <p>
          {L('不建议用通灵、看相、摇卦来「定」出生时辰，再当成事实填进排盘。这类做法没有可验证的依据，一旦填错，后面的判断全错，而且你无从发现。')}
        </p>
        <p className="text-sm text-ink-light">
          {L('宁可留空，让系统明确告诉你缺了什么。')}
        </p>
      </Section>
    </div>
  )
}
