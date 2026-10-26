// 报告来源说明（承载体现在【报告开头】，而不是页脚）
//
// 为什么必须有：
//   白标伙伴把这份报告交付给他的客户，客户付的是"命理师的判断"。
//   如果不说明报告由引擎生成，客户会误以为是手写 —— 那是欺骗，也是合规风险
//   （境内有 AI 生成内容标识要求；美国 FTC 管"真人手写"这类虚假陈述）。
//
// 为什么写在开头而不是页脚：
//   页脚那行「由 明理引擎生成」当初是当【品牌回流】设计的，客户基本看不到；
//   放在标题下方，它才真正起披露作用。
//
// ★ 繁体文案是【预生成常量】而不是运行时 toHant：
//   本组件会被客户端组件（/reports/[id]）引用，运行时引 opencc-js 会把 5MB 词典打进客户端包。
//   一致性由 scripts/test-partner-accept.mjs 断言：toHant(HANS) === HANT。
//   改文案时两处一起改，测试会拦住只改一边。

const HANS = '本报告由明理引擎依据命盘生成，逐条注明所引经典；解读仅供传统文化参考。'
const HANT = '本報告由明理引擎依據命盤生成，逐條註明所引經典；解讀僅供傳統文化參考。'

export { HANS as REPORT_ORIGIN_HANS, HANT as REPORT_ORIGIN_HANT }

export default function ReportOriginNote({
  hant = false,
  className = '',
}: {
  hant?: boolean
  className?: string
}) {
  return (
    <p className={`text-xs text-ink-light/60 leading-relaxed ${className}`}>
      <span className="inline-block align-middle mr-1.5 text-ink-light/40" aria-hidden="true">※</span>
      {hant ? HANT : HANS}
    </p>
  )
}
