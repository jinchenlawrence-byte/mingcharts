import { Geist, Geist_Mono, Noto_Serif_SC } from 'next/font/google'

// 三个 root layout（简体 / 繁体 / 英文）共用同一组字体实例，
// 避免同一字体在多个 root layout 里重复注册。

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
})

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
})

const notoSerifSC = Noto_Serif_SC({
  variable: '--font-serif-sc',
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
})

export const rootFontClassName = `${geistSans.variable} ${geistMono.variable} ${notoSerifSC.variable} h-full antialiased`
