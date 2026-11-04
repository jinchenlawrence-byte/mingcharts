// 繁體會員中心（2026-11-04 統一第二批）
// 此前只有「狀態 + 管理訂閱」93 行，缺權益宮格、追問額度、權益內容區與站內取消自動續費。
// 現在直接複用簡體實現（components/member/MemberCenter.tsx），傳 locale=zh-Hant：
// 所有介面文案經 toHant 轉繁，權益標題沿用 GRANT_LABELS 單一來源，取消/恢復接口與簡體同一套。

import MemberCenter from '@/components/member/MemberCenter'

export default function TwMemberPage() {
  return <MemberCenter locale="zh-Hant" />
}
