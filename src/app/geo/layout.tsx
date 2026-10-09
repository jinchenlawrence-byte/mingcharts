import type { Metadata } from 'next'

// page.tsx 为 'use client' 不能导出 metadata，由本服务端 layout 提供
export const metadata: Metadata = {
  title: '方位城市五行解析：财富之城·事业之城·贵人之城',
  description: '按出生八字五行喜忌，以相对出生地的方位推荐财富、事业、贵人、安居、才华五类城市，附真太阳时校正与城市地气说明。',
}

export default function GeoLayout({ children }: { children: React.ReactNode }) {
  return children
}
