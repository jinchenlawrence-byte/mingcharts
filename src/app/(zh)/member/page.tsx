// 简体会员中心（2026-11-04 统一第二批）
// 实现已抽到 components/member/MemberCenter.tsx（简/繁两树共享，传 locale）。
// 本文件只负责“简体树”这一层接线。
//
// 站点头部归属（2026-11-18 修复 /tw/member 双导航）：
//   · 繁 / 英树：root layout 已渲染 SiteHeader，页面与共享组件都不得再渲染；
//   · 简体树：root layout 不带头部，历来由各页面自己渲染（Nav 或 SiteHeader）。
//   因此头部放在本页面（而不是 MemberCenter 内部），共享内容组件一律不带站点 chrome，
//   以后新增共享组件或新页面都不会再出现“布局 + 页面各一份”的双导航。

import MemberCenter from '@/components/member/MemberCenter'
import SiteHeader from '@/components/SiteHeader'

export default function MemberPage() {
  return (
    <>
      <SiteHeader locale="zh-Hans" />
      <MemberCenter locale="zh-Hans" />
    </>
  )
}
