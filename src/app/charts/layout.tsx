import type { Metadata } from 'next'

// page.tsx 为 'use client' 不能导出 metadata，由本服务端 layout 提供
export const metadata: Metadata = {
  title: '我的命盘：已保存的八字排盘记录',
  description: '登录后查看与管理的八字命盘列表：四柱、日主、农历日期一览，点击可随时回看完整排盘结果。',
}

export default function ChartsLayout({ children }: { children: React.ReactNode }) {
  return children
}
