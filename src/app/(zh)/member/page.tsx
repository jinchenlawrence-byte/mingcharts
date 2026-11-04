// 简体会员中心（2026-11-04 统一第二批）
// 实现已抽到 components/member/MemberCenter.tsx（简/繁两树共享，传 locale）。
// 本文件只负责“简体树”这一层接线。

import MemberCenter from '@/components/member/MemberCenter'

export default function MemberPage() {
  return <MemberCenter locale="zh-Hans" />
}
