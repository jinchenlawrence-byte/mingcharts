// 简体支付成功回跳页（2026-11-04 统一第二批）
// 轮询多态、SKU 分流、伙伴额度、业务单号回退全部在 components/checkout/CheckoutSuccess.tsx，
// 简/繁两树共用；本文件只传 locale。

import CheckoutSuccess from '@/components/checkout/CheckoutSuccess'

export default function CheckoutSuccessPage() {
  return <CheckoutSuccess locale="zh-Hans" />
}
