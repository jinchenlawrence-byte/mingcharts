import type { Metadata } from 'next'

// page.tsx 为 'use client' 不能导出 metadata，由本服务端 layout 提供
export const metadata: Metadata = {
  title: '八字合婚配对：日柱夫妻宫与五行互补分析',
  description: '双人八字合婚：日柱夫妻宫、年柱生肖（民俗）、纳音（古法）、五行互补与配偶星分析，附相处建议，基于子平六书传统合婚方法。',
}

export default function HemunLayout({ children }: { children: React.ReactNode }) {
  return children
}
