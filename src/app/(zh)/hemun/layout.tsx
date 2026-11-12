import type { Metadata } from 'next'
import { triAlternates } from '@/lib/lang'

// page.tsx 为 'use client' 不能导出 metadata，由本服务端 layout 提供
export const metadata: Metadata = {
  // ★ 2026-11-12 A 阶段：标题从「术语罗列」改成用户能懂的因果——免费 + 只要生日 + 没时辰也能合。
  //   带品牌后缀（ | 明理 ）合计 28 字，仍守「≤30 字」的旧规矩。
  title: '八字合婚免费配对：只要双方生日，没时辰也能合',
  description:
    '只填双方生日就能合婚，不用出生时辰。给出三项判断：夫妻宫冲合害刑、双方日干五行、配偶星有没有显现在年月日上；缺时辰的项目标注「未计算」。',
  alternates: { canonical: '/hemun', languages: triAlternates('/hemun') },
}

export default function HemunLayout({ children }: { children: React.ReactNode }) {
  return children
}
