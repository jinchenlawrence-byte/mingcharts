'use client'

// ★ 排盘结果页（2026-10-17 重塑）：设计稿多页版「排盘结果页」生产实现
// 纪律：
//   · 样式 hw-c- 前缀并入 globals.css（site-audit ④ 在 Node 直接 import 本文件，不能用 CSS module）
//   · 数据一律来自 /api/paipan 真排盘引擎（paipan.ts 单一事实源），五行配色仅展示层
//   · 藏干/十二长生/神煞/空亡行与 SHEN_SHA_NOTE 口径说明受 test-shensha-changsheng.mjs ⑤ 守护，不得改写
//   · 价格取自 SKUS（单一事实源），本文件不得硬编码价格
import { useEffect, useState } from 'react'
import type { CSSProperties } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Nav from '@/components/Nav'
import SaveChart from '@/components/SaveChart'
import { getSupabase } from '@/lib/supabase'
import { SKUS, formatPriceUSD } from '@/lib/pricing'
import { shenshaHref, KONG_WANG_SLUG, CHANG_SHENG_SLUG } from '@/lib/shenshaArticles'
import type { PaidAnalysis, LuckCycles, LuckTag, FortuneTier } from '@/lib/analysis'

// 价格一律取自 SKUS（单一事实源），本文件不得硬编码价格
const FATEBOOK_PRICE = formatPriceUSD(SKUS.fatebook.priceUSD)

// ── 五行展示映射（仅展示层；排盘算法见 src/lib/paipan.ts）──
const GAN_WX: Record<string, string> = {
  '甲': 'wood', '乙': 'wood', '丙': 'fire', '丁': 'fire', '戊': 'earth', '己': 'earth',
  '庚': 'metal', '辛': 'metal', '壬': 'water', '癸': 'water',
}
const ZHI_WX: Record<string, string> = {
  '寅': 'wood', '卯': 'wood', '巳': 'fire', '午': 'fire',
  '辰': 'earth', '戌': 'earth', '丑': 'earth', '未': 'earth',
  '申': 'metal', '酉': 'metal', '亥': 'water', '子': 'water',
}
const WX_CN: Record<string, string> = { wood: '木', fire: '火', earth: '土', metal: '金', water: '水' }
const WX_BG: Record<string, string> = { wood: '#3CC796', fire: '#FF6B5B', earth: '#F6C24F', metal: '#D6DBE6', water: '#3A66FF' }
const WX_ORDER = ['wood', 'fire', 'earth', 'metal', 'water'] as const
const WX_DESC: Record<string, string> = {
  wood: '如树，向上生长，重成长与仁心。',
  fire: '如火，热烈外放，重表达与行动。',
  earth: '如山，稳重厚实，重信用与承载。',
  metal: '如金，果断利落，重原则与边界。',
  water: '如水，灵动聪慧，重洞察与变通。',
}
const CN_NUM = ['一', '二', '三', '四', '五', '六', '七', '八', '九', '十']
// 命书十卷：与解锁后「六书精要」十章一一对应（顺序即 paid 字段顺序）
const VOLS = ['八字总览', '性格天赋', '用神喜忌', '格局成败', '调候用神', '大运流年', '事业财运', '婚姻感情', '子女六亲', '健康提示']
const PAID_KEYS = ['overview', 'personality', 'yongShen', 'geJuAnalysis', 'tiaoHou', 'daYunAnalysis', 'career', 'marriage', 'children', 'health'] as const

interface ChartData {
  input: {
    year: number
    month: number
    day: number
    hour: number
    minute: number
    gender: number
  }
  lunarDate: string
  pillars: {
    year: { ganZhi: string; tenGodGan: string; cangGan: string[]; tenGodCangGan: string[]; changSheng?: string; shenSha?: string[]; kongWang?: string }
    month: { ganZhi: string; tenGodGan: string; cangGan: string[]; tenGodCangGan: string[]; changSheng?: string; shenSha?: string[]; kongWang?: string }
    day: { ganZhi: string; tenGodGan: string; cangGan: string[]; tenGodCangGan: string[]; changSheng?: string; shenSha?: string[]; kongWang?: string }
    hour: { ganZhi: string; tenGodGan: string; cangGan: string[]; tenGodCangGan: string[]; changSheng?: string; shenSha?: string[]; kongWang?: string }
  }
  dayMaster: string
  taiYuan: string
  mingGong: string
  shenGong: string
  qiYun: string
  daYun: Array<{ ganZhi: string; startAge: number; startYear: number; endYear: number }>
  analysis: {
    wangShuai: string
    geJu: string
    isPaid: boolean
    paid?: PaidAnalysis
  }
  trueSolar?: {
    offsetMin: number
    zone: string
    dstNotice: string | null
  }
  // ★ 门禁（§8.5.1）：未解锁时给 preview 与 skus，已解锁为 null
  locked?: { skus: string[]; preview: string } | null
}

// ★ 大运/流年 7 档判词配色（FortuneTier）：文字标签本身即判词，不只靠颜色区分（色盲可达）
//   大吉/吉/小吉 → emerald 系（深→浅梯度）；平 → amber 中性；小凶/凶/大凶 → red 系（浅→深梯度）
const FORTUNE_BADGE: Record<FortuneTier, string> = {
  '大吉': 'bg-emerald-100 text-emerald-800',
  '吉': 'bg-emerald-50 text-emerald-700',
  '小吉': 'bg-emerald-50 text-emerald-600',
  '平': 'bg-gold/5 text-amber-600',
  '小凶': 'bg-red-50 text-red-600',
  '凶': 'bg-red-100 text-red-700',
  '大凶': 'bg-red-200 text-red-800'
}
const FORTUNE_BORDER: Record<FortuneTier, string> = {
  '大吉': 'border-emerald-400', '吉': 'border-emerald-300', '小吉': 'border-emerald-200',
  '平': 'border-gold/20',
  '小凶': 'border-red-200', '凶': 'border-red-300', '大凶': 'border-red-400'
}

// 流月标签配色（LuckTag——流月红线：只用 较宜/一般/宜慎 三档，不用 7 档判词）
// ★ 本页共三套样式表：FORTUNE_BADGE/BORDER（7 档＝大运/流年）、TAG_BADGE/BORDER（旧 5 档键集合＝流月，实际只产出三档）、DOMAIN_BADGE（分维度）
// ★ '大防' 死键已清（任务20步骤④）：产出者为零（7 档判词不含、流月内联三档不含、日运 DAILY_TAGS 排除），故类型放开为 Partial
const TAG_BADGE: Partial<Record<LuckTag, string>> = {
  '较宜': 'bg-emerald-50 text-emerald-600',
  '平顺': 'bg-paper-dark/40 text-ink-light/60',
  '一般': 'bg-gold/5 text-amber-600',
  '宜慎': 'bg-orange-100 text-orange-700'
}
const TAG_BORDER: Partial<Record<LuckTag, string>> = {
  '较宜': 'border-emerald-200', '平顺': 'border-gold/15', '一般': 'border-gold/20',
  '宜慎': 'border-orange-300'
}

// 分维度倾向徽章（大运四维度）
const DOMAIN_BADGE: Record<'吉' | '平' | '滞', string> = {
  '吉': 'bg-emerald-50 text-emerald-600',
  '平': 'bg-paper-dark/40 text-ink-light/60',
  '滞': 'bg-orange-100 text-orange-700'
}

// 付费内容：大运 → 流年 → 流月 三层岁运时间轴
function LuckCyclesView({ luck }: { luck: LuckCycles }) {
  const curDY = luck.daYun.find(d => d.current)
  const nowMonth = new Date().getMonth() + 1
  return (
    <div className="space-y-4">
      {/* 大运 */}
      <div className="hw-c-box">
        <h3 className="hw-c-secTitle">岁运时间轴 · 大运</h3>
        <p className="text-xs text-ink-light/60 mb-3">大运十年一步，以节气换运；干支十神与吉凶由规则引擎推算</p>
        <div className="flex flex-wrap gap-2">
          {luck.daYun.map((d, i) => (
            <div
              key={i}
              className={`rounded px-3 py-2 text-center border min-w-[78px] ${
                d.current ? 'bg-gold/5 border-amber-500 ring-1 ring-amber-400' : 'bg-paper-dark/30 border-gold/15'
              }`}
            >
              <div className="font-bold text-ink">{d.ganZhi}</div>
              <div className="text-xs text-ink-light/60">{d.startAge}-{d.startAge + 9}岁</div>
              <span className={`inline-block text-[11px] px-1.5 rounded mt-1 ${FORTUNE_BADGE[d.tag]}`}>{d.tag}</span>
            </div>
          ))}
        </div>
        {curDY && (
          <div className="mt-3 text-sm text-ink/70 border-t pt-3">
            <span className="font-medium text-ink">当前 {curDY.ganZhi} 运（{curDY.shiShenGan}主事）：</span>
            {curDY.note}
            {curDY.relations.length > 0 && (
              <ul className="mt-1 text-xs text-ink-light list-disc list-inside">
                {curDY.relations.map((r, i) => <li key={i}>{r}</li>)}
              </ul>
            )}
            {/* 分维度呈现 */}
            {curDY.domains && (
              <div className="mt-2 grid grid-cols-2 gap-1.5 text-xs">
                {([['事业', curDY.domains.career], ['财运', curDY.domains.wealth], ['健康', curDY.domains.health], ['六亲', curDY.domains.relation]] as [string, { tendency: '吉' | '平' | '滞'; note: string }][]).map(([name, d]) => (
                  <div key={name} className="rounded bg-paper-dark/30 p-1.5">
                    <span className={`inline-block text-[10px] px-1 rounded mr-1 ${DOMAIN_BADGE[d.tendency]}`}>{name}·{d.tendency}</span>
                    <span className="text-ink-light">{d.note}</span>
                  </div>
                ))}
              </div>
            )}
            <p className="mt-2 text-[11px] text-ink-light/40">岁运为倾向性参考，非确定性预言；重大决策（投资、迁居、婚嫁）请勿仅凭此断定。</p>
          </div>
        )}
      </div>

      {/* 流年 */}
      <div className="hw-c-box">
        <h3 className="hw-c-secTitle">流年 · 今年起三年</h3>
        <div className="grid md:grid-cols-3 gap-3">
          {luck.liuNian.map((y, i) => (
            <div key={i} className={`rounded border-l-4 p-3 bg-paper-dark/30 ${FORTUNE_BORDER[y.tag]}`}>
              <div className="flex items-center justify-between gap-1">
                <span className="font-bold text-ink">{y.year}年 {y.ganZhi}</span>
                <span className={`text-[11px] px-1.5 py-0.5 rounded whitespace-nowrap ${FORTUNE_BADGE[y.tag]}`}>{y.tag}</span>
              </div>
              <div className="text-xs text-ink-light/60 mt-1">
                {y.shiShenGan}主事{y.daYunGanZhi ? ` · 行${y.daYunGanZhi}运` : ''}
              </div>
              <p className="text-xs text-ink/70 mt-2 leading-relaxed">{y.note}</p>
              {y.relations.length > 0 && (
                <ul className="mt-2 text-[11px] text-ink-light space-y-0.5">
                  {y.relations.map((r, j) => <li key={j}>· {r}</li>)}
                </ul>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* 流月 */}
      <div className="hw-c-box">
        <h3 className="hw-c-secTitle">流月 · 当年十二个节令月</h3>
        <p className="text-xs text-ink-light/60 mb-3">命理以节气换月（非农历初一）：如寅月自立春起，丑月至次年小寒前</p>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
          {luck.liuYue.map((m, i) => (
            <div
              key={i}
              className={`rounded border-l-2 bg-paper-dark/30 p-2 ${TAG_BORDER[m.tag]} ${
                m.month === nowMonth ? 'ring-1 ring-amber-400' : ''
              }`}
            >
              <div className="flex justify-between items-center gap-1">
                <span className="text-xs font-medium text-ink/70">{m.month}月·{m.jieQi}</span>
                <span className={`text-[10px] px-1 rounded ${TAG_BADGE[m.tag]}`}>{m.tag}</span>
              </div>
              <div className="text-sm font-bold text-ink mt-0.5">
                {m.ganZhi} <span className="text-[10px] font-normal text-ink-light/60">{m.shiShenGan}</span>
              </div>
              <div className="text-[10px] text-ink-light/40">{m.rangeLabel}</div>
              {m.relations.length > 0 && (
                <div className="text-[10px] text-ink-light/60 mt-0.5">{m.relations.join('；')}</div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export default function ChartPage() {
  const router = useRouter()
  const [chart, setChart] = useState<ChartData | null>(null)
  const [unlocking, setUnlocking] = useState(false)
  const [payError, setPayError] = useState('')

  const handleUnlock = async () => {
    const supabase = getSupabase()
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      router.push('/auth')
      return
    }
    setUnlocking(true)
    setPayError('')
    try {
      const res = await fetch('/api/unlock', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: session.access_token, chart })
      })
      const data = await res.json()
      if (!res.ok || !data.success) throw new Error(data.error || '解锁失败')
      localStorage.setItem('currentChart', JSON.stringify(data.data.chartData))
      setChart(data.data.chartData)
    } catch (e) {
      setPayError(e instanceof Error ? e.message : '解锁失败，请稍后重试')
    } finally {
      setUnlocking(false)
    }
  }

  useEffect(() => {
    const stored = localStorage.getItem('currentChart')
    if (stored) {
      setChart(JSON.parse(stored))
    } else {
      router.push('/')
    }
  }, [router])

  if (!chart) {
    return (
      <main className="hw-page flex min-h-screen items-center justify-center">
        <p className="hw-c-meta">正在取盘…</p>
      </main>
    )
  }

  const pillarNames = ['年柱', '月柱', '日柱', '时柱']
  const pillars = [chart.pillars.year, chart.pillars.month, chart.pillars.day, chart.pillars.hour]
  const nowYearNum = new Date().getFullYear()
  const dayWx = GAN_WX[chart.dayMaster] ?? 'water'
  const pad = (n: number) => (n < 10 ? '0' : '') + n
  // 农历仅取「日期＋四柱干支」段（纳音/星宿/彭祖百忌/方位/冲煞在下方「命盘档案」条还原展示）
  const lunarShort = chart.lunarDate.split('纳音')[0].trim()
  // 命盘档案拆解：农历 toFullString 的方括号分段
  // 实测格式：一九九〇年四月十四 庚午(马)年 … 巳(蛇)时 纳音[四柱纳音] 星期X 西方白虎 星宿[觜火猴](凶)
  //           彭祖百忌[…] 喜神方位[巽](东南) 阳贵神方位[…] 阴贵神方位[…] 福神方位[…] 财神方位[…] 冲[(丁卯)兔] 煞[东]
  const fullLunar = chart.lunarDate
  const bracketOf = (label: string) => fullLunar.match(new RegExp(label + '\\[([^\\]]*)\\]'))?.[1]?.trim() ?? ''
  const naYin = bracketOf('纳音').split(/\s+/).filter(Boolean).join(' · ')
  const xiuXiang = fullLunar.match(/([东南西北]方(?:青龙|白虎|朱雀|玄武))/)?.[1] ?? ''
  const xiu = bracketOf('星宿')
  const xiuJi = fullLunar.match(/星宿\[[^\]]*\]\((吉|凶|平)\)/)?.[1] ?? ''
  const pengZu = bracketOf('彭祖百忌').replace(/\s+/g, '，')
  const fangWei = [...fullLunar.matchAll(/(喜神|阳贵神|阴贵神|福神|财神)方位\[([^\]]+)\]\(([^)]+)\)/g)]
    .map((m) => `${m[1]}${m[3]}（${m[2]}）`).join(' · ')
  const chong = fullLunar.match(/冲\[([^\]]*)\]/)?.[1]?.replace(/\(/g, '（').replace(/\)/g, '）') ?? ''
  const sha = bracketOf('煞')

  // 五行分布：四天干＋四地支（藏干/合化不计入，仅作快速印象）
  const wxCount: Record<string, number> = { wood: 0, fire: 0, earth: 0, metal: 0, water: 0 }
  for (const p of pillars) {
    const g = GAN_WX[p.ganZhi[0]]
    const z = ZHI_WX[p.ganZhi[1]]
    if (g) wxCount[g]++
    if (z) wxCount[z]++
  }
  const lack = WX_ORDER.filter((k) => wxCount[k] === 0)

  const paid = chart.analysis.isPaid ? chart.analysis.paid ?? null : null
  const paidRows: [string, string][] | null = paid
    ? VOLS.map((title, i) => [title, paid[PAID_KEYS[i]]])
    : null

  return (
    <main className="hw-page">
      <Nav />
      <div className="hw-wrap hw-c-pg">
        <Link href="/" className="hw-c-back">‹ 重新排盘</Link>
        <h1 className="hw-c-h1">日主 {chart.dayMaster}{WX_CN[dayWx]}</h1>
        <p className="hw-c-meta">
          {chart.input.year}年{chart.input.month}月{chart.input.day}日 {pad(chart.input.hour)}:{pad(chart.input.minute)}
          {' · '}{chart.input.gender === 1 ? '乾造' : '坤造'} · 农历{lunarShort}
        </p>
        <p className="hw-c-dx">你的日主属{WX_CN[dayWx]}，{WX_DESC[dayWx]}</p>

        {/* 夏令时切换点提示：出生时刻本身在 gap/重复时刻上（旧命盘无此字段时不显示） */}
        {chart.trueSolar?.dstNotice && (
          <div className="hw-c-warn">⚠ {chart.trueSolar.dstNotice}</div>
        )}

        {/* 四柱（五行配色柱卡；日柱抬升并标「日主」） */}
        <div className="hw-pillars" style={{ paddingTop: 28 }}>
          {pillars.map((p, i) => (
            <div key={i} className={`hw-c-pillar${i === 2 ? ' hw-day' : ''}`} style={{ '--i': i } as CSSProperties}>
              <span className="hw-t">{pillarNames[i]}</span>
              <span className={`hw-g hw-${GAN_WX[p.ganZhi[0]] ?? 'water'}`}>{p.ganZhi[0]}</span>
              <span className={`hw-g hw-${ZHI_WX[p.ganZhi[1]] ?? 'water'}`}>{p.ganZhi[1]}</span>
              <span className="hw-c-s">{p.tenGodGan || '日主'}</span>
            </div>
          ))}
        </div>
        <div className="hw-legend" aria-label="五行配色">
          {WX_ORDER.map((k) => (
            <span key={k}><i style={{ background: WX_BG[k] }} />{WX_CN[k]}</span>
          ))}
        </div>

        {/* 命盘档案：纳音 / 星宿 / 彭祖百忌 / 方位 / 冲煞（农历 toFullString 全量信息，设计稿省略、此处以档案条还原） */}
        {(naYin || pengZu || fangWei || xiu) && (
          <div className="hw-c-box" style={{ marginTop: 14 }}>
            <div className="hw-c-kv" style={{ lineHeight: 1.9 }}>
              {naYin && (
                <p>
                  <span>纳音：</span>{naYin}<span style={{ marginLeft: 6 }}>（年 · 月 · 日 · 时）</span>
                </p>
              )}
              {xiu && (
                <p>
                  <span>星宿：</span>{xiuXiang}{xiuXiang && ' · '}{xiu}
                  {xiuJi && <span style={{ opacity: 0.6 }}>（{xiuJi}）</span>}
                </p>
              )}
              {pengZu && <p><span>彭祖百忌：</span>{pengZu}</p>}
              {fangWei && <p><span>方位：</span>{fangWei}</p>}
              {(chong || sha) && (
                <p>
                  <span>冲煞：</span>{chong && `冲${chong}`}{chong && sha ? ' · ' : ''}{sha && `煞${sha}`}
                </p>
              )}
            </div>
          </div>
        )}

        {/* 藏干/十二长生/神煞/空亡 明细（test-shensha-changsheng.mjs ⑤ 逐字守护） */}
        <div className="hw-c-box hw-c-boxFlush">
          <div className="hw-c-tableWrap">
            <table className="hw-c-table">
              <thead>
                <tr>
                  <th aria-label="项目"></th>
                  {pillarNames.map((n, i) => <th key={i}>{n}</th>)}
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>藏干</td>
                  {pillars.map((p, i) => (
                    <td key={i}>
                      {p.cangGan.map((g, j) => (
                        <span key={j}>
                          {j > 0 && '　'}
                          {g}
                          {p.tenGodCangGan?.[j] && (
                            <span style={{ opacity: 0.6, fontSize: 12 }}>（{p.tenGodCangGan[j]}）</span>
                          )}
                        </span>
                      ))}
                    </td>
                  ))}
                </tr>
                {/* 十二长生 / 神煞 / 空亡：新排盘才有此字段，旧命盘（localStorage 旧数据）不显示 */}
                {pillars.some(p => p.changSheng) && (
                  <tr>
                    <td>十二长生</td>
                    {pillars.map((p, i) => (
                      <td key={i}>
                        {p.changSheng
                          ? <Link href={`/article/${CHANG_SHENG_SLUG}`} className="hw-c-link">{p.changSheng}</Link>
                          : '—'}
                      </td>
                    ))}
                  </tr>
                )}
                {pillars.some(p => p.shenSha && p.shenSha.length > 0) && (
                  <tr>
                    <td>神煞</td>
                    {pillars.map((p, i) => (
                      <td key={i}>
                        {p.shenSha && p.shenSha.length > 0
                          ? p.shenSha.map((name, j) => {
                              const href = shenshaHref(name)
                              return (
                                <span key={j}>
                                  {j > 0 && '、'}
                                  {href
                                    ? <Link href={href} className="hw-c-link">{name}</Link>
                                    : name}
                                </span>
                              )
                            })
                          : '—'}
                      </td>
                    ))}
                  </tr>
                )}
                {pillars.some(p => p.kongWang) && (
                  <tr>
                    <td>空亡</td>
                    {pillars.map((p, i) => (
                      <td key={i}>
                        {p.kongWang
                          ? <Link href={`/article/${KONG_WANG_SLUG}`} className="hw-c-link">{p.kongWang}</Link>
                          : '—'}
                      </td>
                    ))}
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          {/* 口径说明：文案与 src/lib/paipan.ts 的 SHEN_SHA_NOTE 同步（测试守护一致性） */}
          <p className="hw-c-fine">
            神煞取法依《渊海子平》《三命通会》通行口径：天乙贵人、文昌、禄神、羊刃、太极贵人、福星贵人、国印贵人、金舆、红艳煞自日干起（羊刃仅阳干）；桃花、驿马、华盖、将星、劫煞、灾煞、亡神自年支、日支起（三合局取支）；孤辰寡宿、红鸾、天喜自年支起；天德贵人、月德贵人、天医、天赦、四废自月支起（天赦、四废见于日柱）；魁罡、阴阳差错、十恶大败、孤鸾煞取自日柱干支，三奇贵人取年月日或月日时天干顺布；童子煞依月支季节（春秋寅子、冬夏卯未辰）或年柱纳音（金木命见午卯、水火命见酉戌、土命见辰巳）查日支、时支，德秀贵人自月支起见四柱天干（《三命通会》），金神取乙丑、己巳、癸酉见于日柱、时柱，飞刃自日干起（仅阳干、羊刃对冲），流霞自日干起，天罗地网依年柱纳音（火命见戌亥、水土命见辰巳，金木命不论）查日支、时支，六秀日、十灵日取自日柱干支；空亡为各柱干支所在旬空之二支。均为传统民俗论法（童子煞属民俗传说），流派间取法或有差异，仅供参考、非确定性，不构成任何决策建议。
          </p>
          <p className="hw-c-fine">
            点击神煞、十二长生、空亡名称可查看对应知识文章（命理知识 › 神煞查询）。
          </p>
        </div>

        {/* 五行分布 */}
        <h2 className="hw-c-h2">五行分布</h2>
        <div className="hw-c-bar5">
          {WX_ORDER.map((k) =>
            wxCount[k] > 0 ? (
              <span key={k} className={`hw-${k}`} style={{ flex: wxCount[k] }}>
                {WX_CN[k]}{wxCount[k]}
              </span>
            ) : null
          )}
        </div>
        <p className="hw-c-dx" style={{ marginTop: 12 }}>
          {lack.length > 0 ? `五行缺：${lack.map((k) => WX_CN[k]).join('、')}。` : '五行俱全。'}
        </p>
        <p className="hw-note">按四柱天干＋地支八字统计；藏干与地支合化未计入，仅作快速印象。</p>

        {/* 格局旺衰 / 胎元命宫 */}
        <div className="hw-c-two" style={{ marginTop: 20 }}>
          <div className="hw-c-box">
            <h3 className="hw-c-secTitle">格局旺衰</h3>
            <div className="hw-c-kv">
              <p><span>旺衰：</span>{chart.analysis.wangShuai}</p>
              <p><span>格局：</span>{chart.analysis.geJu}</p>
              <p><span>起运：</span>{chart.qiYun}</p>
            </div>
          </div>
          <div className="hw-c-box">
            <h3 className="hw-c-secTitle">胎元命宫</h3>
            <div className="hw-c-kv">
              <p><span>胎元：</span>{chart.taiYuan}</p>
              <p><span>命宫：</span>{chart.mingGong}</p>
              <p><span>身宫：</span>{chart.shenGong}</p>
            </div>
          </div>
        </div>

        {/* 大运时间轴（当前大运描黑圈；干支天干按五行着色） */}
        <h2 className="hw-c-h2">大运</h2>
        <div className="hw-c-dy">
          {chart.daYun.map((dy, i) => {
            const isCurrent = nowYearNum >= dy.startYear && nowYearNum <= dy.endYear
            const tx = GAN_WX[dy.ganZhi[0]] ?? 'water'
            return (
              <div key={i} className={isCurrent ? 'hw-c-cur' : ''}>
                <b className={`hw-tx-${tx}`}>{dy.ganZhi}</b>
                <i>{dy.startAge}–{dy.startAge + 9}岁</i>
                <i>{dy.startYear}–{dy.endYear}</i>
                {isCurrent && <span className="hw-c-curTag">当前</span>}
              </div>
            )
          })}
        </div>
        <p className="hw-note">起运：{chart.qiYun}。大运十年一步，以节气精确换运；当前大运的吉凶细断见解锁后的「大运流年」卷。</p>

        {/* 保存命盘 */}
        <SaveChart />

        {/* 命书十卷 */}
        <h2 className="hw-c-h2">命书十卷</h2>
        <div className={`hw-c-vols${chart.analysis.isPaid ? '' : ' hw-c-locked'}`}>
          {VOLS.map((v, i) => (
            <span key={v}><i>卷{CN_NUM[i]}</i>{v}</span>
          ))}
        </div>

        {/* 付费解锁区（内测期免费解锁；正式开放后走 SKUS 价格） */}
        {!chart.analysis.isPaid && (
          <div className="hw-c-cta">
            {chart.locked?.preview && <p className="hw-c-dx">{chart.locked.preview}</p>}
            <button onClick={handleUnlock} disabled={unlocking} className="hw-c-btnBig">
              {unlocking ? 'AI命理师解读生成中（约30秒）...' : '解锁完整命书（内测期免费体验）'}
            </button>
            {payError && <p className="hw-c-err">{payError}</p>}
            <p className="hw-note" style={{ marginTop: 14 }}>
              正式开放后 {FATEBOOK_PRICE}/次（会员不含报告）· <Link href="/mingshu" className="hw-c-link">查看命书详情</Link>
            </p>
          </div>
        )}

        {/* 已解锁：完整命理分析（六书精要十章 + 岁运时间轴 + 古籍相似命例） */}
        {paidRows && paid && (
          <div className="space-y-4" style={{ marginTop: 20 }}>
            {paid.luckCycles && <LuckCyclesView luck={paid.luckCycles} />}
            {paidRows.map(([title, text], i) => (
              <div key={title} className="hw-c-box">
                <h3 className="hw-c-secTitle">卷{CN_NUM[i]} · {title}</h3>
                <p className="hw-c-body">{text}</p>
              </div>
            ))}

            {/* 古籍相似命例（规则引擎检索，旧命盘无此数据时不显示） */}
            {paid.similarCases && paid.similarCases.length > 0 && (
              <div className="hw-c-box">
                <h3 className="hw-c-secTitle">古籍相似命例</h3>
                <p className="text-xs text-ink-light/60 mb-3">
                  从《子平真诠》《滴天髓》《三命通会》等典籍命例库中按四柱结构相似度检索，供参照印证（仅供学习参考）
                </p>
                <div className="space-y-3">
                  {paid.similarCases.map((c, i) => (
                    <div key={i} className={`rounded-lg border p-3 ${c.exact ? 'border-amber-400 bg-gold/5' : 'border-gold/15'}`}>
                      <div className="flex flex-wrap items-baseline gap-2 mb-1">
                        <span className="font-bold text-ink">
                          {c.person || '未具名命造'}
                        </span>
                        <span className="text-sm text-ink/70">
                          {c.pillars.year} {c.pillars.month} {c.pillars.day} {c.pillars.hour}
                        </span>
                        {c.exact && (
                          <span className="text-xs bg-amber-600 text-white px-2 py-0.5 rounded">四柱全同</span>
                        )}
                        <span className="text-xs text-ink-light/40 ml-auto">{c.source}</span>
                      </div>
                      <div className="flex flex-wrap gap-1 mb-1">
                        {c.matches.map((m, j) => (
                          <span key={j} className="text-xs bg-gold/10 text-ink/70 px-1.5 py-0.5 rounded">{m}</span>
                        ))}
                      </div>
                      {c.readings && c.readings.length > 1 ? (
                        <div className="space-y-2 mt-2">
                          {c.readings.map((r, j) => (
                            <div key={j} className="border-l-2 border-gold/20 pl-3">
                              <div className="text-xs text-amber-600 mb-0.5">
                                {r.source.split(' ')[0]}{r.person ? ` · ${r.person}` : ''}
                              </div>
                              <p className="text-sm text-ink/70 leading-relaxed">
                                {r.text.length > 220 ? r.text.slice(0, 220) + '…' : r.text}
                              </p>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-sm text-ink/70 leading-relaxed">{c.text}</p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </main>
  )
}
