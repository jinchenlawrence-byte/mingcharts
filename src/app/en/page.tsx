import type { Metadata } from 'next'
import Link from 'next/link'
import { triAlternates } from '@/lib/lang'
import { SHENGXIAO } from '@/lib/shengxiaoData'
import Shengxiao2027Links from '@/components/shengxiao/Shengxiao2027Links'
import { branchEn, elementEn } from '@/lib/enTerms'
import { ExampleChart, TrustBar, FatebookSample, MoreQueries, FeatureBento } from '@/components/home/HomeSections'
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
    <div className="hw-wrap hw-c-pg hw-home-pg">
      {/* Open Hero: form on the left, interactive sample chart on the right (same rhythm as `/`). */}
      <div className="hw-hero" id="chart" data-section="hero">
        <div>
          <h1 className="hw-h1">Bazi, the Four Pillars of Destiny — read clearly</h1>
          <p className="hw-lede">
            Enter your birth details below. The engine computes the Four Pillars deterministically;
            True Solar Time correction is applied when a birth place is given.
          </p>

          <EnHomeForm />

          <p className="hw-lede">
            Bazi reads a birth moment as four pillars: year, month, day and hour. Each pillar has one
            Heavenly Stem and one Earthly Branch. The Day Stem is your Day Master. From these eight
            characters a reading derives the Ten Gods, Hidden Stems, Five Elements balance, Luck
            Pillars (ten-year cycles) and Annual Pillars.
          </p>

          <div className="flex flex-wrap gap-3 mt-5">
            <Link href="/en/pricing" className="hw-c-btnBig">See pricing →</Link>
            <Link href="/en/mingshu" className="hw-c-btnBig">About the Fate Book →</Link>
          </div>
        </div>

        {/* Batch 2 parity: the interactive sample chart was only on the Chinese home page. */}
        <ExampleChart locale="en" />
      </div>

      {/* Batch 2 parity: trust bar (free charting / True Solar Time / encrypted / reference only) */}
      <TrustBar locale="en" />

      <section className="hw-section">
        <h2 className="hw-h2">What a Bazi chart contains</h2>
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

      <FeatureBento locale="en" />

      <section className="hw-section">
        <h2 className="hw-h2">Twelve zodiac signs</h2>
        <p className="text-sm text-ink-light mb-3">
          The zodiac animal is the Earthly Branch of the year pillar — one branch out of eight
          characters. Two people with the same sign can have very different charts.
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {SHENGXIAO.map((sx) => (
            <div key={sx.slug} className="border border-gold/20 rounded p-2 text-center text-sm">
              <div className="font-semibold text-ink">{ZODIAC_EN[sx.slug] ?? sx.slug}</div>
              <div className="text-xs text-ink-light">
                {branchEn(sx.zhi) || sx.zhi} · {elementEn(sx.wuxing) || sx.wuxing}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 2027 zodiac pages: direct links for the year-end "next year" search window. */}
      <Shengxiao2027Links locale="en" />

      {/* Batch 2 parity: Fate Book excerpts (missing on the English home page). */}
      <FatebookSample locale="en" />

      {/* Batch 2 parity: more readings — only links whose English pages exist. */}
      <MoreQueries locale="en" />

      <section className="hw-section" data-section="faq">
        <h2 className="hw-h2">FAQ</h2>
        <div className="space-y-3">
          {FAQS.map((f) => (
            <details key={f.q} className="border-b border-gold/10 pb-2">
              <summary className="font-semibold text-ink cursor-pointer">{f.q}</summary>
              <p className="mt-2 text-sm text-ink-light leading-relaxed">{f.a}</p>
            </details>
          ))}
        </div>
      </section>

      <section className="hw-section">
        <h2 className="hw-h2">Languages</h2>
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
        <p className="text-xs text-ink-light mt-3">
          All content is traditional Chinese metaphysics, for reference and entertainment only.
        </p>
      </section>
    </div>
  )
}
