import type { Metadata } from 'next'
import { ShengXiaoIndex } from '@/components/shengxiao/ShengXiaoIndex'
import { triAlternates } from '@/lib/lang'

export const metadata: Metadata = {
  title: 'Chinese zodiac signs: traits, careers, wealth and compatibility',
  description:
    'The twelve Chinese zodiac signs explained: personality, career, money, marriage, Six Harmony and Three Harmony pairings, clashes, guardian buddha and lucky items. English edition.',
  alternates: { canonical: '/en/shengxiao', languages: triAlternates('/shengxiao') },
}

// English index: shares components/shengxiao/ShengXiaoIndex with zh/tw (unified 2026-11-09)
export default function EnShengXiaoIndex() {
  return <ShengXiaoIndex locale="en" />
}
