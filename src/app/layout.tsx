import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono, Noto_Serif_SC } from "next/font/google";
import "./globals.css";
import PwaRegister from "@/components/PwaRegister";
import TrackPageView from "@/components/TrackPageView";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const notoSerifSC = Noto_Serif_SC({
  variable: "--font-serif-sc",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || "https://www.mingcharts.com"),
  title: {
    default: "明理 - 免费八字排盘与命书详批",
    template: "%s | 明理",
  },
  description:
    "专业八字命理平台：免费四柱排盘、十神格局分析，命书报告万字详批（八字总览、性格、用神、格局、调候、大运、事业、婚姻、子女、健康），生肖运势与命理知识大全。",
  manifest: "/manifest.webmanifest",
  openGraph: {
    title: "明理 · 免费八字排盘，一眼就看懂",
    description:
      "免费生成四柱命盘，十神、藏干、起运一次看全。想再深一步，万字命书引经据典，也说人话。",
    siteName: "明理 mingcharts.com",
    type: "website",
    images: [{ url: "/og.png", width: 1200, height: 630, alt: "明理 · 免费八字排盘" }],
  },
  twitter: {
    card: "summary_large_image",
    images: ["/og.png"],
  },
};

// ★ Next 16：themeColor 属 viewport（放 metadata 会告警）
export const viewport: Viewport = {
  themeColor: "#A62B1F",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="zh-CN"
      className={`${geistSans.variable} ${geistMono.variable} ${notoSerifSC.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-paper text-ink">
        {/* 结构化数据：让搜索引擎识别品牌实体与站点（提升品牌词识别与富摘要） */}
        <script
          type="application/ld+json"
          // 静态常量，不含用户输入，无 XSS 风险
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@graph": [
                {
                  "@type": "Organization",
                  "@id": "https://www.mingcharts.com/#org",
                  name: "明理 MingCharts",
                  url: "https://www.mingcharts.com",
                  description: "免费八字排盘与 AI 命理报告：命书十卷、合婚、紫微斗数、流年运势、方位城市。",
                },
                {
                  "@type": "WebSite",
                  "@id": "https://www.mingcharts.com/#site",
                  url: "https://www.mingcharts.com",
                  name: "明理 · 免费八字排盘",
                  inLanguage: "zh-CN",
                  publisher: { "@id": "https://www.mingcharts.com/#org" },
                },
              ],
            }),
          }}
        />
        {children}
        {/* 流量漏斗：每次路由变化上报一条 page_view（不采集命理内容与个人信息） */}
        <TrackPageView />
        {/* PWA：注册 Service Worker（仅 https/localhost 生效，静默失败） */}
        <PwaRegister />
        {/* GeoNames 署名（CC BY 4.0 要求）：全球城市数据来自 geonames.org */}
        <footer className="mt-auto border-t border-gold/20 py-4 text-center text-[11px] text-ink/40">
          <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1">
            <a href="/terms" className="underline hover:text-ink/60">Terms of Service</a>
            <span aria-hidden="true">·</span>
            <a href="/privacy" className="underline hover:text-ink/60">Privacy Policy</a>
            <span aria-hidden="true">·</span>
            <a href="mailto:hello@mingcharts.com" className="underline hover:text-ink/60">hello@mingcharts.com</a>
            <span aria-hidden="true">·</span>
            <span>
              城市数据 ©{' '}
              <a
                href="https://www.geonames.org/"
                target="_blank"
                rel="noopener noreferrer"
                className="underline hover:text-ink/60"
              >
                GeoNames
              </a>{' '}
              （CC BY 4.0）
            </span>
          </div>
        </footer>
      </body>
    </html>
  );
}
