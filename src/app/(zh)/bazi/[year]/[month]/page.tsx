import Link from 'next/link'
import Nav from '@/components/Nav'
import MonthDays from '@/components/bazi/MonthDays'
import { getYearGanZhi, getZodiac, getConstellation } from '@/lib/baziData'

// ★ 2026-11-05（两次修正后的定稿）：月页只预渲染 1990–2010，其余年份按需生成。
//   起因：Vercel Hobby 部署存储 10 GB 已超，先想全改成 SSR 省钱，但算错了账 ——
//   Hobby 的 Fluid Active CPU（4h / 滚动 30 天）才是会导致【项目被暂停】的额度，
//   而静态页由 CDN 直接出，不消耗 CPU。用存储换 CPU 等于拿次要资源换主要风险。
//   定稿：保留 21 年（1990–2010）× 12 = 252 页静态（约 14 MB），
//   1950–1989 与 2011 之后按需生成 —— 存储可控、CPU 归零。
export function generateStaticParams() {
  const params: { year: string; month: string }[] = []
  for (let y = 1990; y <= 2010; y++) {
    for (let m = 1; m <= 12; m++) {
      params.push({ year: String(y), month: String(m).padStart(2, '0') })
    }
  }
  return params
}

export const revalidate = 604800 // 7 天（少重算 = 少烧 CPU）

export async function generateMetadata({ params }: { params: Promise<{ year: string; month: string }> }) {
  const { year, month } = await params
  const yearNum = parseInt(year, 10)
  const ganZhi = getYearGanZhi(yearNum)
  const zodiac = getZodiac(ganZhi[1])
  return {
    title: `${year}年${month}月八字算命 · ${ganZhi}年属${zodiac.name}每日八字查询`,
    description: `${year}年${month}月每日八字查询：${ganZhi}年（属${zodiac.name}），按日查看生辰八字、干支十神、命理分析与生肖运势。`,
    alternates: { canonical: `/bazi/${year}/${month}` },
    // ★ 2026-11-10（GSC 覆盖报告驱动）：1990 年之前的月页不再参与索引。
    //   证据：GSC「已发现-尚未编入索引」528 条里 430 条是 /bazi，年份分布
    //   1950s 71 / 1960s 84 / 1970s 78 / 1980s 90 / 1990s 87 / 2000-2010 仅 20 ——
    //   Google 看过这些页（结构几乎一样），明确判定不值得收录。
    //   而 /bazi 全段 28 天 1,318 次展示、0 次点击 ⇒ noindex 掉零流量损失。
    //   页面仍可访问（人类在用），只是把抓取预算与整站质量信号让给 1990 后的页面。
    robots: yearNum < 1990 || yearNum > 2010
      ? { index: false, follow: true }
      : undefined,
  }
}

export default async function MonthPage({ params }: { params: Promise<{ year: string; month: string }> }) {
  const { year, month } = await params
  const yearNum = parseInt(year, 10)
  const monthNum = parseInt(month, 10)

  const ganZhi = getYearGanZhi(yearNum)
  const zodiac = getZodiac(ganZhi[1])
  const daysInMonth = new Date(yearNum, monthNum, 0).getDate()

  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1)

  // 该月包含的星座
  const constellations: string[] = []
  for (let d = 1; d <= daysInMonth; d++) {
    const c = getConstellation(monthNum, d)
    if (!constellations.includes(c)) constellations.push(c)
  }

  return (
    <main className="hw-page">
      <Nav />
      <div className="hw-wrap hw-c-pg">
        <nav className="hw-c-back">
          <Link href="/">首页</Link>
          <span className="mx-2">›</span>
          <Link href="/bazi">八字算命</Link>
          <span className="mx-2">›</span>
          <Link href={`/bazi/${year}`}>{year}年</Link>
          <span className="mx-2">›</span>
          <span>{monthNum}月</span>
        </nav>

        <h1 className="hw-c-h1">
          {year}年{monthNum}月出生的人命运如何？
        </h1>
        <p className="hw-lede">
          {year}年{ganZhi}年属{zodiac.name}，{monthNum}月出生。本月涵盖星座：{constellations.join('、')}。
        </p>

        {/* ★ 2026-11-05（B 方案）：30 个日页链接折叠起来，默认不渲染 ——
            日页是站内工具（noindex、不进 sitemap、robots 已挡），
            写进服务端 HTML 只会让抓取方发现它们，而每条日页都是 force-dynamic。
            需要的人点「展开整月」即可。 */}
        <MonthDays year={year} month={month} days={days} />

        <div className="hw-c-box bg-gold/5! text-sm">
          <p className="font-semibold text-ink mb-2">{year}年{monthNum}月出生总览</p>
          <p className="text-ink/70">
            {year}年{monthNum}月出生的人，生肖属{zodiac.name}。农历{monthNum}月为{['正', '二', '三', '四', '五', '六', '七', '八', '九', '十', '冬', '腊'][monthNum - 1]}月，
            此月出生之人{monthNum >= 3 && monthNum <= 5 ? '正值春季，木气旺盛，性格仁慈有活力' : monthNum >= 6 && monthNum <= 8 ? '正值夏季，火气旺盛，性格热情开朗' : monthNum >= 9 && monthNum <= 11 ? '正值秋季，金气旺盛，性格刚毅果断' : '正值冬季，水气旺盛，性格聪明内敛'}。
          </p>
        </div>

        <div className="mt-8">
          <Link href={`/bazi/${year}`} className="hw-c-back">
            ← 返回{year}年
          </Link>
        </div>
      </div>
    </main>
  )
}
