import Link from 'next/link'
import Nav from '@/components/Nav'
import { paipan, getWangShuai, getGeJu } from '@/lib/paipan'
import { generateAnalysis, type AnalyzableChart } from '@/lib/analysis'
import { getZodiac, getNaYin, getConstellation, getXiu, getSanShiCai } from '@/lib/baziData'

// 不预生成全部日期（约15000页），用 ISR 按需生成缓存
export const dynamic = 'force-dynamic'
export const revalidate = 86400 // 缓存1天

export async function generateMetadata({ params }: { params: Promise<{ year: string; month: string; day: string }> }) {
  const { year, month, day } = await params
  return {
    title: `${year}年${month}月${day}日八字算命 · 出生当日干支命理分析`,
    description: `${year}年${month}月${day}日出生八字：当日干支、十神、藏干、旺衰格局、大运流年。按出生日期查看命理分析与生肖运势。`,
    // 每日日期页是批量生成的薄内容（约 2.2 万条），只供站内浏览与跳转，
    // 不参与索引，避免拉低整站质量分；年/月聚合页仍正常收录。
    robots: { index: false, follow: true },
  }
}

export default async function DayPage({ params }: { params: Promise<{ year: string; month: string; day: string }> }) {
  const { year, month, day } = await params
  const yearNum = parseInt(year, 10)
  const monthNum = parseInt(month, 10)
  const dayNum = parseInt(day, 10)

  // 日期合法性校验
  if (
    yearNum < 1900 || yearNum > 2100 ||
    monthNum < 1 || monthNum > 12 ||
    dayNum < 1 || dayNum > 31
  ) {
    return (
      <main className="hw-page">
        <Nav />
        <div className="hw-wrap hw-c-pg">
          <div className="hw-narrow text-center">
            <div className="hw-c-box">
              <h1 className="hw-c-secTitle">日期不合法</h1>
              <p className="hw-c-dx text-center">请检查年月日范围（1900-2100，月 1-12，日 1-31）。</p>
              <Link href="/" className="hw-c-blue">返回首页</Link>
            </div>
          </div>
        </div>
      </main>
    )
  }

  // 排盘（默认12:00，日详情页无精确时辰）
  const chart = paipan({
    year: yearNum,
    month: monthNum,
    day: dayNum,
    hour: 12,
    minute: 0,
    gender: 1
  })

  const wangShuai = getWangShuai(chart)
  const geJu = getGeJu(chart)

  const analyzable = {
    ...chart,
    analysis: { wangShuai, geJu, isPaid: false }
  } as AnalyzableChart

  const analysis = generateAnalysis(analyzable)

  const zodiac = getZodiac(chart.pillars.year.zhi)
  const naYin = getNaYin(chart.pillars.year.ganZhi)
  const constellation = getConstellation(monthNum, dayNum)
  const xiu = getXiu(monthNum, dayNum)
  const sanShiCai = getSanShiCai(dayNum)

  const pillars = [
    { label: '年柱', ...chart.pillars.year },
    { label: '月柱', ...chart.pillars.month },
    { label: '日柱', ...chart.pillars.day },
    { label: '时柱', ...chart.pillars.hour }
  ]

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
          <Link href={`/bazi/${year}/${month}`}>{monthNum}月</Link>
          <span className="mx-2">›</span>
          <span>{dayNum}日</span>
        </nav>

        <h1 className="hw-c-h1">
          {year}年{monthNum}月{dayNum}日出生的人命运如何？
        </h1>
        <p className="hw-lede">
          生辰八字命理分析（注：本页按午时排盘，如需精确分析请输入出生时辰）
        </p>

        {/* 基本信息卡片 */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          <div className="hw-c-box p-4! text-center">
            <div className="text-xs text-ink-light/60 mb-1">生肖</div>
            <div className="text-xl font-bold text-ink">属{zodiac.name}</div>
          </div>
          <div className="hw-c-box p-4! text-center">
            <div className="text-xs text-ink-light/60 mb-1">星座</div>
            <div className="text-xl font-bold text-ink">{constellation}</div>
          </div>
          <div className="hw-c-box p-4! text-center">
            <div className="text-xs text-ink-light/60 mb-1">纳音</div>
            <div className="text-xl font-bold text-ink">{naYin}</div>
          </div>
          <div className="hw-c-box p-4! text-center">
            <div className="text-xs text-ink-light/60 mb-1">本命佛</div>
            <div className="text-sm font-bold text-ink">{zodiac.benmingfo}</div>
          </div>
        </div>

        {/* 八字排盘 */}
        <div className="hw-c-box mb-6">
          <h2 className="hw-c-secTitle">生辰八字排盘</h2>
          <div className="grid grid-cols-4 gap-2 mb-4">
            {pillars.map(p => (
              <div key={p.label} className="text-center">
                <div className="text-xs text-ink-light/60 mb-1">{p.label}</div>
                <div className="text-2xl font-bold text-ink">{p.ganZhi}</div>
                <div className="text-xs text-amber-600">{p.tenGodGan}</div>
                <div className="text-xs text-ink-light/60 mt-1">
                  {p.cangGan.map((g, i) => (
                    <span key={i}>{g}({p.tenGodCangGan[i]}) </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div><span className="text-ink-light/60">日主：</span><span className="font-semibold">{chart.dayMaster}</span></div>
            <div><span className="text-ink-light/60">旺衰：</span><span className="font-semibold">{wangShuai}</span></div>
            <div><span className="text-ink-light/60">格局：</span><span className="font-semibold">{geJu}</span></div>
            <div><span className="text-ink-light/60">胎元：</span><span className="font-semibold">{chart.taiYuan}</span></div>
          </div>
        </div>

        {/* 二十八星宿 & 三世书财运 */}
        <div className="grid md:grid-cols-2 gap-4 mb-6">
          <div className="hw-c-box p-4!">
            <h3 className="font-bold text-ink mb-2">二十八星宿</h3>
            <p className="text-sm text-ink/70">
              {xiu}宿。{xiu === '角' || xiu === '亢' || xiu === '氐' || xiu === '房' || xiu === '心' || xiu === '尾' || xiu === '箕'
                ? '属东方青龙七宿，主仁慈宽厚，有领导才能。'
                : xiu === '斗' || xiu === '牛' || xiu === '女' || xiu === '虚' || xiu === '危' || xiu === '室' || xiu === '壁'
                  ? '属北方玄武七宿，主聪明智慧，善于谋划。'
                  : xiu === '奎' || xiu === '娄' || xiu === '胃' || xiu === '昴' || xiu === '毕' || xiu === '觜' || xiu === '参'
                    ? '属西方白虎七宿，主刚毅果断，重义气。'
                    : '属南方朱雀七宿，主热情开朗，才华横溢。'}
            </p>
          </div>
          <div className="hw-c-box p-4!">
            <h3 className="font-bold text-ink mb-2">三世书财运</h3>
            <p className="text-sm text-ink/70">{sanShiCai}</p>
          </div>
        </div>

        {/* 性格分析（免费） */}
        <div className="hw-c-box mb-6">
          <h2 className="hw-c-secTitle">性格天赋</h2>
          <p className="hw-c-body whitespace-pre-line">{analysis.personality}</p>
        </div>

        {/* 事业财运（部分免费，引导付费） */}
        <div className="hw-c-box mb-6">
          <h2 className="hw-c-secTitle">事业财运</h2>
          <p className="hw-c-body whitespace-pre-line">
            {analysis.career.split('\n').slice(0, 2).join('\n')}
          </p>
          <div className="mt-3 p-3 bg-gold/5 rounded text-sm text-ink/70">
            <Link href="/" className="hw-c-link">
              输入出生时辰 → 查看完整事业财运分析（含用神行业、财运走势、贵人方位）
            </Link>
          </div>
        </div>

        {/* 婚姻感情（部分免费） */}
        <div className="hw-c-box mb-6">
          <h2 className="hw-c-secTitle">婚姻感情</h2>
          <p className="hw-c-body whitespace-pre-line">
            {analysis.marriage.split('\n').slice(0, 2).join('\n')}
          </p>
          <div className="mt-3 p-3 bg-gold/5 rounded text-sm text-ink/70">
            <Link href="/" className="hw-c-link">
              输入出生时辰 → 查看完整婚姻分析（含夫妻宫、配偶星、桃花、结婚时机）
            </Link>
          </div>
        </div>

        {/* 健康提示（部分免费） */}
        <div className="hw-c-box mb-6">
          <h2 className="hw-c-secTitle">健康提示</h2>
          <p className="hw-c-body whitespace-pre-line">
            {analysis.health.split('\n').slice(0, 2).join('\n')}
          </p>
          <div className="mt-3 p-3 bg-gold/5 rounded text-sm text-ink/70">
            <Link href="/" className="hw-c-link">
              输入出生时辰 → 查看完整健康分析（含五行体质、脏腑养护、大运健康走势）
            </Link>
          </div>
        </div>

        {/* 用神喜忌（部分免费） */}
        <div className="hw-c-box mb-6">
          <h2 className="hw-c-secTitle">用神喜忌</h2>
          <p className="hw-c-body whitespace-pre-line">
            {analysis.yongShen.split('\n').slice(0, 2).join('\n')}
          </p>
          <div className="mt-3 p-3 bg-gold/5 rounded text-sm text-ink/70">
            <Link href="/" className="hw-c-link">
              输入出生时辰 → 查看完整用神分析（含喜用行业、方位、颜色、后天改运建议）
            </Link>
          </div>
        </div>

        {/* CTA */}
        <div className="hw-c-cta">
          <h2 className="hw-c-secTitle">获取精准八字排盘</h2>
          <p className="hw-c-dx">
            本页按默认时辰排盘，输入您的精确出生时辰，获取更准确的八字命理分析
          </p>
          <Link href="/" className="hw-c-btnBig">
            立即排盘 →
          </Link>
        </div>

        <div className="mt-8 hw-c-fine text-center">
          <p>以上分析仅供参考娱乐，不构成人生决策依据。命运掌握在自己手中。</p>
        </div>
      </div>
    </main>
  )
}
