// 繁體支付成功回跳頁（2026-11-04 統一第二批）
// 此前只有 6 次通用輪詢 + 兩個終態：買會員/伙伴額度都會被丟進「我的報告」。
// 現在複用簡體實現：權益輪詢多態、SKU 分流、伙伴額度、支付單號回退全部與簡體一致，
// 文案經 toHant 轉繁、站內連結自動加 /tw 前綴。

import CheckoutSuccess from '@/components/checkout/CheckoutSuccess'

export default function TwCheckoutSuccessPage() {
  return <CheckoutSuccess locale="zh-Hant" />
}
