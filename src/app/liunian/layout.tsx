import type { Metadata } from 'next'

// page.tsx 为 'use client' 不能导出 metadata，由本服务端 layout 提供
export const metadata: Metadata = {
  title: '年运报告：流年详批（今年/明年/后年）',
  description: '按目标流年逐一批批：流年干支十神、与原局冲合关系、事业/财运/感情/健康分维度倾向，当年含流月节奏；规则引擎排盘定喜忌，AI 据事实撰写深度解读。',
}

export default function LiunianLayout({ children }: { children: React.ReactNode }) {
  return children
}
