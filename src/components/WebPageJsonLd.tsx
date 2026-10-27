// 页面级结构化数据（第 35 轮）：给繁体树补一个语言正确的 WebPage 实体。
//
// 为什么需要：
//   根 layout 的 JSON-LD 里，WebSite 声明了 "inLanguage": "zh-CN"，
//   而这段脚本在【每个页面】都会输出 —— 包括 208 个繁体页。
//   于是 Google 在繁体内容里读到「本站是简体」，与 hreflang 互相打架。
//
// 做法（两层）：
//   ① 根 layout 的 WebSite 实体【去掉 inLanguage】（站点实体不应用"某一种页面语言"标注）
//   ② 繁体树在 layout 层输出本组件的 WebPage，inLanguage = zh-Hant
//      → 页面级语言信号由"这一页实际用的语言"决定，而不是被根节点覆盖
//
// 已知局限（A 侧记录，不在此处解决）：
//   <html lang> 仍由根 layout 固定为 zh-CN —— App Router 里只有根布局能渲染 <html>，
//   要按路由改 lang 需要把全部路由搬进 route group（两个 root layout），
//   对 1300 个静态页的仓来说风险远大于收益。改用 <main lang="zh-Hant"> + 本组件的
//   inLanguage 表达页面语言；客户端再补一次 document.documentElement.lang（见 LocaleSync）。

const SITE_ID = 'https://www.mingcharts.com/#site'

interface Props {
  /** 页面名（通常取该页 H1 或页面标题语义） */
  name: string
  /** 页面描述（可选；缺省不输出） */
  description?: string
  /** 页面路径，如 /tw/shengxiao/shu/2027 */
  path: string
  /** 页面语言的 BCP-47 标注 */
  inLanguage: 'zh-Hant' | 'zh-Hans'
}

export default function WebPageJsonLd({ name, description, path, inLanguage }: Props) {
  const url = `https://www.mingcharts.com${path}`
  const payload = {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    '@id': `${url}#webpage`,
    url,
    name,
    ...(description ? { description } : {}),
    inLanguage,
    isPartOf: { '@id': SITE_ID },
  }
  return (
    <script
      type="application/ld+json"
      // 静态常量或来自服务端页面元数据，不含用户输入，无 XSS 风险
      dangerouslySetInnerHTML={{ __html: JSON.stringify(payload) }}
    />
  )
}
