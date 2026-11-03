import type { Metadata } from 'next'
import Link from 'next/link'
import { triAlternates } from '@/lib/lang'
import { SHENGXIAO } from '@/lib/shengxiaoData'
import EnHomeForm from './EnHomeForm'

// 英文首頁（第一批）：完整英文說明 + 真實排盤表單（→ /en/chart）。
// ★ 英文工具目前只有 Bazi 排盤與命書；合婚/紫微/方位/年運以中文版入口承接（第二批）。
export const metadata: Metadata = {
  title: 'Free Bazi Chart · Four Pillars of Destiny · Ten Gods & Luck Pillars',
  description:
    'Bazi (Four Pillars of Destiny) explained in English: Day Master, Ten Gods, Hidden Stems, Luck Pillars and Annual Pillars, plus Zi Wei Dou Shu and Bazi synastry. Free chart and full-length Fate Book.',
  alternates: { canonical: '/en', languages: triAlternates('/') },
}

const ZODIAC_EN: Record<string, string> = {
  shu: 'Rat', niu: 'Ox', hu: 'Tiger', tu: 'Rabbit', long: 'Dragon', she: 'Snake',
  ma: 'Horse', yang: 'Goat', hou: 'Monkey', ji: 'Rooster', gou: 'Dog', zhu: 'Pig',
}

const FAQS = [
  {
    q: 'What is Bazi?',
    a: 'Bazi (八字), also called the Four Pillars of Destiny, is a traditional Chinese method that reads a birth moment as four pillars — year, month, day and hour — each made of one Heavenly Stem and one Earthly Branch. Together they form eight characters. The Day Stem is the Day Master, which represents the person.',
  },
  {
    q: 'What are the Ten Gods?',
    a: 'The Ten Gods (十神) describe how every other stem relates to your Day Master: Direct/Indirect Resource, Direct/Indirect Wealth, Direct/Indirect Officer, Seven Killing, Direct/Indirect Seal and Companion. They are the vocabulary for reading personality and circumstance.',
  },
  {
    q: 'What is a Luck Pillar?',
    a: 'Luck Pillars (大运) are ten-year periods derived from the month pillar and the direction of the solar year. Annual Pillars (流年) are the stem-branch of each year. A reading compares both against the natal chart to describe timing.',
  },
  {
    q: 'Is this deterministic?',
    a: 'No. The chart is computed by fixed calendrical rules, but interpretation is a structured reading of tendencies. It does not guarantee events and is not a substitute for medical, legal or financial advice.',
  },
]

export default function EnHome() {
  return (
    <div className="hw-wrap hw-c-pg">
      <section className="hw-c-box mb-6">
        <h1 className="hw-c-h1">Bazi, the Four Pillars of Destiny — read clearly</h1>
        <p className="hw-c-lede">
          Bazi reads a birth moment as four pillars: year, month, day and hour. Each pillar has one
          Heavenly Stem and one Earthly Branch. The Day Stem is your Day Master. From these eight
          characters a reading derives the Ten Gods, Hidden Stems, Five Elements balance, Luck
          Pillars (ten-year cycles) and Annual Pillars.
        </p>
        <p className="hw-c-body mt-3">
          Enter your birth details below. The engine computes the Four Pillars deterministically;
          True Solar Time correction is applied when a birth place is given.
        </p>

        <EnHomeForm />

        <div className="flex flex-wrap gap-3 mt-5">
          <Link href="/en/pricing" className="hw-c-btnBig">See pricing →</Link>
          <Link href="/en/mingshu" className="hw-c-btnBig">About the Fate Book →</Link>
        </div>
      </section>

      <section className="hw-c-box mb-6">
        <h2 className="hw-c-secTitle">What a Bazi chart contains</h2>
        <ul className="text-sm text-ink-light space-y-2">
          <li>• <strong className="text-ink">Four Pillars</strong> — year, month, day and hour, each a Heavenly Stem over an Earthly Branch.</li>
          <li>• <strong className="text-ink">Day Master</strong> — the Day Stem, the reference point for the whole chart.</li>
          <li>• <strong className="text-ink">Ten Gods</strong> — how every other stem relates to the Day Master.</li>
          <li>• <strong className="text-ink">Hidden Stems</strong> — the stems concealed inside each Earthly Branch.</li>
          <li>• <strong className="text-ink">Five Elements</strong> — Wood, Fire, Earth, Metal and Water, and their balance.</li>
          <li>• <strong className="text-ink">Luck Pillars</strong> — ten-year cycles with start age and start year.</li>
          <li>• <strong className="text-ink">Annual Pillars</strong> — the stem-branch of each year, read against the natal chart.</li>
          <li>• <strong className="text-ink">True Solar Time</strong> — longitude correction for the birth place, with DST handling.</li>
        </ul>
      </section>

      <section className="hw-c-box mb-6">
        <h2 className="hw-c-secTitle">Other readings</h2>
        <div className="grid sm:grid-cols-2 gap-3 text-sm">
          <div className="border border-gold/20 rounded-lg p-3">
            <div className="font-bold text-ink">Zi Wei Dou Shu / Purple Star Astrology</div>
            <p className="text-ink-light mt-1">
              A twelve-palace chart with fourteen major stars and the Four Transformations, read by
              decade and by year.
            </p>
            <Link href="/tw/ziwei" className="hw-c-link inline-block mt-2">Open Zi Wei (Chinese edition) →</Link>
          </div>
          <div className="border border-gold/20 rounded-lg p-3">
            <div className="font-bold text-ink">Bazi Synastry</div>
            <p className="text-ink-light mt-1">
              Two charts compared: Day Pillar spouse palace, zodiac year pillars, spouse stars,
              Five Elements complementarity and Ten Gods interaction.
            </p>
            <Link href="/tw/hemun" className="hw-c-link inline-block mt-2">Open synastry (Chinese edition) →</Link>
          </div>
          <div className="border border-gold/20 rounded-lg p-3">
            <div className="font-bold text-ink">Cities &amp; direction</div>
            <p className="text-ink-light mt-1">
              Wealth, career, benefactor, settling and talent cities, chosen by the Five Elements of
              direction relative to your birthplace.
            </p>
            <Link href="/tw/geo" className="hw-c-link inline-block mt-2">Open geomancy (Chinese edition) →</Link>
          </div>
          <div className="border border-gold/20 rounded-lg p-3">
            <div className="font-bold text-ink">Annual report</div>
            <p className="text-ink-light mt-1">
              Three years of Annual Pillars with monthly rhythm, read against your natal chart and
              current Luck Pillar.
            </p>
            <Link href="/tw/liunian" className="hw-c-link inline-block mt-2">Open annual report (Chinese edition) →</Link>
          </div>
        </div>
      </section>

      <section className="hw-c-box mb-6">
        <h2 className="hw-c-secTitle">Twelve zodiac signs</h2>
        <p className="text-sm text-ink-light mb-3">
          The zodiac animal is the Earthly Branch of the year pillar — one branch out of eight
          characters. Two people with the same sign can have very different charts.
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {SHENGXIAO.map((sx) => (
            <Link key={sx.slug} href={`/tw/shengxiao/${sx.slug}`} className="border border-gold/20 rounded p-2 text-center text-sm hover:bg-gold/5 transition">
              <div className="font-semibold text-ink">{ZODIAC_EN[sx.slug] ?? sx.slug}</div>
              <div className="text-xs text-ink-light/60">{sx.zhi} · {sx.wuxing}</div>
            </Link>
          ))}
        </div>
      </section>

      <section className="hw-c-box mb-6">
        <h2 className="hw-c-secTitle">FAQ</h2>
        <div className="space-y-3">
          {FAQS.map((f) => (
            <details key={f.q} className="border-b border-gold/10 pb-2">
              <summary className="font-semibold text-ink cursor-pointer">{f.q}</summary>
              <p className="mt-2 text-sm text-ink-light leading-relaxed">{f.a}</p>
            </details>
          ))}
        </div>
      </section>

      <section className="hw-c-box">
        <h2 className="hw-c-secTitle">Languages</h2>
        <p className="text-sm text-ink-light">
          This site also publishes a Simplified Chinese edition and a Traditional Chinese edition
          (Taiwan / Hong Kong wording). Every edition declares canonical URLs and reciprocal
          hreflang.
        </p>
        <p className="text-sm mt-3">
          <Link href="/" className="hw-c-link">简体中文</Link>
          <span className="mx-2">·</span>
          <Link href="/tw" className="hw-c-link">繁體中文</Link>
          <span className="mx-2">·</span>
          <Link href="/en" className="hw-c-link">English</Link>
        </p>
        <p className="text-xs text-ink-light/40 mt-3">
          All content is traditional Chinese metaphysics, for reference and entertainment only.
        </p>
      </section>
    </div>
  )
}
