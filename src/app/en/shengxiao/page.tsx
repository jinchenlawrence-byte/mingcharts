import type { Metadata } from 'next'
import Link from 'next/link'
import { SHENGXIAO } from '@/lib/shengxiaoData'
import { SHENGXIAO_EN, elementClass } from '@/lib/shengxiaoEn'
import { BRANCH_ELEMENT, branchEn, zodiacEn } from '@/lib/enTerms'
import { triAlternates } from '@/lib/lang'

export const metadata: Metadata = {
  title: 'Chinese zodiac signs: traits, careers, wealth and compatibility',
  description:
    'The twelve Chinese zodiac signs explained: personality, career, money, marriage, Six Harmony and Three Harmony pairings, clashes, guardian buddha and lucky items. English edition.',
  alternates: { canonical: '/en/shengxiao', languages: triAlternates('/shengxiao') },
}

export default function EnShengXiaoIndex() {
  return (
    <div className="hw-wrap hw-c-pg">
      <nav className="hw-c-back">
        <Link href="/en">Home</Link>
        <span className="mx-2">›</span>
        <span>Chinese zodiac</span>
      </nav>

      <header>
        <h1 className="hw-c-h1">The twelve Chinese zodiac signs</h1>
        <p className="hw-lede">
          Pick your sign to read its personality, career, money, marriage and compatibility, plus its
          guardian buddha, lucky items and the annual pillar notes from 2024 to 2031.
        </p>
      </header>

      <div className="hw-zod mb-10">
        {SHENGXIAO.map((sx) => {
          const copy = SHENGXIAO_EN.find((s) => s.slug === sx.slug)
          return (
            <Link key={sx.slug} href={`/en/shengxiao/${sx.slug}`}>
              <span className={`hw-zx hw-${elementClass(sx.zhi)}`}>{branchEn(sx.zhi)}</span>
              <span>
                <b>{copy?.name ?? zodiacName(sx.name)}</b>
                <i>
                  {branchEn(sx.zhi)} · {BRANCH_ELEMENT[sx.zhi]}
                </i>
              </span>
            </Link>
          )
        })}
      </div>

      <div className="hw-c-box mb-10">
        <h2 className="hw-c-secTitle">2027, the year of Ding Wei</h2>
        <p className="hw-c-body mb-4">
          2027 begins as a Ding Wei year at Li Chun. The Goat is in its benming year (Zhi Tai Sui); the
          Ox clashes and is also punished; the Dog is punished; the Rat is harmed. The Horse is in Six
          Harmony with the year, and the Pig and the Rabbit are in Three Harmony with it. Each sign
          page carries the same notes for every year from 2024 to 2031.
        </p>
        <div className="flex flex-wrap gap-x-4 gap-y-2">
          {SHENGXIAO.map((sx) => {
            const copy = SHENGXIAO_EN.find((s) => s.slug === sx.slug)
            return (
              <Link key={sx.slug} href={`/en/shengxiao/${sx.slug}`} className="hw-c-link text-sm">
                {copy?.name ?? zodiacName(sx.name)} · 2027
              </Link>
            )
          })}
        </div>
      </div>

      <div className="hw-c-two">
        <div className="hw-c-box">
          <h2 className="hw-c-secTitle">Where do the twelve signs come from?</h2>
          <p className="hw-c-body">
            The zodiac is a way of counting years with the twelve Earthly Branches: Zi for the Rat, Chou
            for the Ox, Yin for the Tiger, Mao for the Rabbit, Chen for the Dragon, Si for the Snake, Wu
            for the Horse, Wei for the Goat, Shen for the Monkey, You for the Rooster, Xu for the Dog and
            Hai for the Pig. A sign is fixed by the annual branch, and the year changes at Li Chun, the
            start of spring, not on 1 January. In practice the branch also carries a fixed relation to
            the other branches — Six Harmony, Three Harmony, clash, harm and punishment — which is what
            traditional matchmaking and annual readings are built on.
          </p>
        </div>
        <div className="hw-c-box">
          <h2 className="hw-c-secTitle">Zodiac and the full Bazi chart</h2>
          <p className="hw-c-body mb-4">
            Your sign is only the year branch — one of the eight characters in a Bazi chart. Personality
            and fortune are read from all four pillars together, so two people born under the same sign
            can lead very different lives. A sign reading is a useful broad reference; for a decision
            that matters, read the whole chart.
          </p>
          <Link href="/en" className="hw-c-btnBig">
            Enter your birth time for a full chart →
          </Link>
        </div>
      </div>
    </div>
  )
}

/** Fallback animal name, only used if an English copy entry is ever missing. */
function zodiacName(zhName: string): string {
  return zodiacEn(zhName)
}
