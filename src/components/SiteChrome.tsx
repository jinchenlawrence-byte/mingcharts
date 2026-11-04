import PwaRegister from '@/components/PwaRegister'
import SiteFooter from '@/components/SiteFooter'
import TrackPageView from '@/components/TrackPageView'
import type { SiteLang } from '@/lib/lang'

// 三个 root layout 共用的站点级挂件：
// 组织/站点结构化数据、流量埋点、PWA 注册、页脚。
// 放在 body 末尾，保证 /、/tw、/en 三棵树都有且各只有一份。

const ORG_DESCRIPTION: Record<SiteLang, string> = {
  'zh-Hans': '免费八字排盘与 AI 命理报告：命书十卷、合婚、紫微斗数、流年运势、方位城市。',
  'zh-Hant': '免費八字排盤與 AI 命理報告：命書十卷、合婚、紫微斗數、流年運勢、方位城市。',
  en: 'Free Bazi (Four Pillars of Destiny) charting and AI-assisted Chinese astrology reports: Ten Gods, Luck Pillars, Zi Wei Dou Shu, synastry, annual readings and city directions.',
}

const SITE_NAME: Record<SiteLang, string> = {
  'zh-Hans': '明理 · 免费八字排盘',
  'zh-Hant': '明理 · 免費八字排盤',
  en: 'MingCharts · Free Bazi Chart',
}

const ORG_NAME: Record<SiteLang, string> = {
  'zh-Hans': '明理 MingCharts',
  'zh-Hant': '明理 MingCharts',
  en: 'MingCharts',
}

export default function SiteChrome({ lang = 'zh-Hans' }: { lang?: SiteLang }) {
  return (
    <>
      {/* 结构化数据：让搜索引擎识别品牌实体与站点（提升品牌词识别与富摘要） */}
      <script
        type="application/ld+json"
        // 静态常量，不含用户输入，无 XSS 风险
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@graph': [
              {
                '@type': 'Organization',
                '@id': 'https://www.mingcharts.com/#org',
                name: ORG_NAME[lang],
                url: 'https://www.mingcharts.com',
                description: ORG_DESCRIPTION[lang],
              },
              {
                '@type': 'WebSite',
                '@id': 'https://www.mingcharts.com/#site',
                url: 'https://www.mingcharts.com',
                name: SITE_NAME[lang],
                // ★ 不写 inLanguage：这段脚本在每个页面都会输出，
                //   写死一种语言会与 hreflang 打架；页面语言由各语言树服务端的 <html lang> 表达。
                publisher: { '@id': 'https://www.mingcharts.com/#org' },
              },
            ],
          }),
        }}
      />
      {/* 流量漏斗：每次路由变化上报一条 page_view（不采集命理内容与个人信息） */}
      <TrackPageView />
      {/* PWA：注册 Service Worker（仅 https/localhost 生效，静默失败） */}
      <PwaRegister />
      {/* 页脚：按 root layout 传入的 locale 出简 / 繁 / 英 */}
      <SiteFooter locale={lang} />
    </>
  )
}
