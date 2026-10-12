'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Nav from '@/components/Nav'
import SaveChart from '@/components/SaveChart'
import { getSupabase } from '@/lib/supabase'
import { SKUS, formatPriceUSD } from '@/lib/pricing'
import type { PaidAnalysis, LuckCycles, LuckTag, FortuneTier } from '@/lib/analysis'

// 价格一律取自 SKUS（单一事实源），本文件不得硬编码价格
const FATEBOOK_PRICE = formatPriceUSD(SKUS.fatebook.priceUSD)

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
  '平': 'bg-amber-50 text-amber-600',
  '小凶': 'bg-red-50 text-red-600',
  '凶': 'bg-red-100 text-red-700',
  '大凶': 'bg-red-200 text-red-800'
}
const FORTUNE_BORDER: Record<FortuneTier, string> = {
  '大吉': 'border-emerald-400', '吉': 'border-emerald-300', '小吉': 'border-emerald-200',
  '平': 'border-amber-200',
  '小凶': 'border-red-200', '凶': 'border-red-300', '大凶': 'border-red-400'
}

// 流月标签配色（LuckTag——流月红线：只用 较宜/一般/宜慎 三档，不用 7 档判词）
// ★ 本页共三套样式表：FORTUNE_BADGE/BORDER（7 档＝大运/流年）、TAG_BADGE/BORDER（旧 5 档键集合＝流月，实际只产出三档）、DOMAIN_BADGE（分维度）
// ★ '大防' 死键已清（任务20步骤④）：产出者为零（7 档判词不含、流月内联三档不含、日运 DAILY_TAGS 排除），故类型放开为 Partial
const TAG_BADGE: Partial<Record<LuckTag, string>> = {
  '较宜': 'bg-emerald-50 text-emerald-600',
  '平顺': 'bg-gray-100 text-gray-500',
  '一般': 'bg-amber-50 text-amber-600',
  '宜慎': 'bg-orange-100 text-orange-700'
}
const TAG_BORDER: Partial<Record<LuckTag, string>> = {
  '较宜': 'border-emerald-200', '平顺': 'border-gray-200', '一般': 'border-amber-200',
  '宜慎': 'border-orange-300'
}

// 分维度倾向徽章（大运四维度）
const DOMAIN_BADGE: Record<'吉' | '平' | '滞', string> = {
  '吉': 'bg-emerald-50 text-emerald-600',
  '平': 'bg-gray-100 text-gray-500',
  '滞': 'bg-orange-100 text-orange-700'
}

// 付费内容：大运 → 流年 → 流月 三层岁运时间轴
function LuckCyclesView({ luck }: { luck: LuckCycles }) {
  const curDY = luck.daYun.find(d => d.current)
  const nowMonth = new Date().getMonth() + 1
  return (
    <div className="space-y-4">
      {/* 大运 */}
      <div className="bg-white rounded-lg shadow p-4">
        <h3 className="font-semibold text-amber-800 mb-1">岁运时间轴 · 大运</h3>
        <p className="text-xs text-gray-500 mb-3">大运十年一步，以节气换运；干支十神与吉凶由规则引擎推算</p>
        <div className="flex flex-wrap gap-2">
          {luck.daYun.map((d, i) => (
            <div
              key={i}
              className={`rounded px-3 py-2 text-center border min-w-[78px] ${
                d.current ? 'bg-amber-50 border-amber-500 ring-1 ring-amber-400' : 'bg-gray-50 border-gray-200'
              }`}
            >
              <div className="font-bold text-amber-800">{d.ganZhi}</div>
              <div className="text-xs text-gray-500">{d.startAge}-{d.startAge + 9}岁</div>
              <span className={`inline-block text-[11px] px-1.5 rounded mt-1 ${FORTUNE_BADGE[d.tag]}`}>{d.tag}</span>
            </div>
          ))}
        </div>
        {curDY && (
          <div className="mt-3 text-sm text-gray-700 border-t pt-3">
            <span className="font-medium text-amber-800">当前 {curDY.ganZhi} 运（{curDY.shiShenGan}主事）：</span>
            {curDY.note}
            {curDY.relations.length > 0 && (
              <ul className="mt-1 text-xs text-gray-600 list-disc list-inside">
                {curDY.relations.map((r, i) => <li key={i}>{r}</li>)}
              </ul>
            )}
            {/* 分维度呈现 */}
            {curDY.domains && (
              <div className="mt-2 grid grid-cols-2 gap-1.5 text-xs">
                {([['事业', curDY.domains.career], ['财运', curDY.domains.wealth], ['健康', curDY.domains.health], ['六亲', curDY.domains.relation]] as [string, { tendency: '吉' | '平' | '滞'; note: string }][]).map(([name, d]) => (
                  <div key={name} className="rounded bg-gray-50 p-1.5">
                    <span className={`inline-block text-[10px] px-1 rounded mr-1 ${DOMAIN_BADGE[d.tendency]}`}>{name}·{d.tendency}</span>
                    <span className="text-gray-600">{d.note}</span>
                  </div>
                ))}
              </div>
            )}
            <p className="mt-2 text-[11px] text-gray-400">岁运为倾向性参考，非确定性预言；重大决策（投资、迁居、婚嫁）请勿仅凭此断定。</p>
          </div>
        )}
      </div>

      {/* 流年 */}
      <div className="bg-white rounded-lg shadow p-4">
        <h3 className="font-semibold text-amber-800 mb-3">流年 · 今年起三年</h3>
        <div className="grid md:grid-cols-3 gap-3">
          {luck.liuNian.map((y, i) => (
            <div key={i} className={`rounded border-l-4 p-3 bg-gray-50 ${FORTUNE_BORDER[y.tag]}`}>
              <div className="flex items-center justify-between gap-1">
                <span className="font-bold text-amber-800">{y.year}年 {y.ganZhi}</span>
                <span className={`text-[11px] px-1.5 py-0.5 rounded whitespace-nowrap ${FORTUNE_BADGE[y.tag]}`}>{y.tag}</span>
              </div>
              <div className="text-xs text-gray-500 mt-1">
                {y.shiShenGan}主事{y.daYunGanZhi ? ` · 行${y.daYunGanZhi}运` : ''}
              </div>
              <p className="text-xs text-gray-700 mt-2 leading-relaxed">{y.note}</p>
              {y.relations.length > 0 && (
                <ul className="mt-2 text-[11px] text-gray-600 space-y-0.5">
                  {y.relations.map((r, j) => <li key={j}>· {r}</li>)}
                </ul>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* 流月 */}
      <div className="bg-white rounded-lg shadow p-4">
        <h3 className="font-semibold text-amber-800 mb-1">流月 · 当年十二个节令月</h3>
        <p className="text-xs text-gray-500 mb-3">命理以节气换月（非农历初一）：如寅月自立春起，丑月至次年小寒前</p>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
          {luck.liuYue.map((m, i) => (
            <div
              key={i}
              className={`rounded border-l-2 bg-gray-50 p-2 ${TAG_BORDER[m.tag]} ${
                m.month === nowMonth ? 'ring-1 ring-amber-400' : ''
              }`}
            >
              <div className="flex justify-between items-center gap-1">
                <span className="text-xs font-medium text-gray-700">{m.month}月·{m.jieQi}</span>
                <span className={`text-[10px] px-1 rounded ${TAG_BADGE[m.tag]}`}>{m.tag}</span>
              </div>
              <div className="text-sm font-bold text-amber-800 mt-0.5">
                {m.ganZhi} <span className="text-[10px] font-normal text-gray-500">{m.shiShenGan}</span>
              </div>
              <div className="text-[10px] text-gray-400">{m.rangeLabel}</div>
              {m.relations.length > 0 && (
                <div className="text-[10px] text-gray-500 mt-0.5">{m.relations.join('；')}</div>
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

  if (!chart) return <div className="min-h-screen flex items-center justify-center">加载中...</div>

  const pillarNames = ['年柱', '月柱', '日柱', '时柱']
  const pillars = [chart.pillars.year, chart.pillars.month, chart.pillars.day, chart.pillars.hour]
  const nowYearNum = new Date().getFullYear()

  return (
    <main className="min-h-screen bg-gradient-to-b from-amber-50 to-white py-8">
      <Nav />
      <div className="container mx-auto px-4 max-w-4xl">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-amber-900 mb-2">排盘结果</h1>
          <p className="text-gray-600">
            {chart.input.year}年{chart.input.month}月{chart.input.day}日 {chart.input.hour}时{chart.input.minute}分
            {chart.input.gender === 1 ? ' 男' : ' 女'} · 农历{chart.lunarDate}
          </p>
        </div>

        {/* 夏令时切换点提示：出生时刻本身在 gap/重复时刻上（旧命盘无此字段时不显示） */}
        {chart.trueSolar?.dstNotice && (
          <div className="mb-6 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            ⚠ {chart.trueSolar.dstNotice}
          </div>
        )}

        {/* 四柱表 */}
        <div className="bg-white rounded-lg shadow-lg overflow-hidden mb-6">
          <table className="w-full">
            <thead className="bg-amber-100">
              <tr>
                <th className="py-3 px-4 text-left text-amber-900"></th>
                {pillarNames.map((name, i) => (
                  <th key={i} className="py-3 px-4 text-center text-amber-900 font-semibold">{name}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              <tr className="border-b">
                <td className="py-3 px-4 font-medium text-gray-700">天干</td>
                {pillars.map((p, i) => (
                  <td key={i} className="py-3 px-4 text-center text-2xl font-bold text-amber-800">
                    {p.ganZhi[0]}
                  </td>
                ))}
              </tr>
              <tr className="border-b">
                <td className="py-3 px-4 font-medium text-gray-700">地支</td>
                {pillars.map((p, i) => (
                  <td key={i} className="py-3 px-4 text-center text-2xl font-bold text-amber-800">
                    {p.ganZhi[1]}
                  </td>
                ))}
              </tr>
              <tr className="border-b">
                <td className="py-3 px-4 font-medium text-gray-700">十神</td>
                {pillars.map((p, i) => (
                  <td key={i} className="py-3 px-4 text-center text-sm text-gray-600">
                    {p.tenGodGan || '日主'}
                  </td>
                ))}
              </tr>
              <tr>
                <td className="py-3 px-4 font-medium text-gray-700">藏干</td>
                {pillars.map((p, i) => (
                  <td key={i} className="py-3 px-4 text-center text-sm text-gray-600">
                    {p.cangGan.join(' ')}
                  </td>
                ))}
              </tr>
              {/* 十二长生 / 神煞：新排盘才有此字段，旧命盘（localStorage 旧数据）不显示 */}
              {pillars.some(p => p.changSheng) && (
                <tr className="border-b">
                  <td className="py-3 px-4 font-medium text-gray-700">十二长生</td>
                  {pillars.map((p, i) => (
                    <td key={i} className="py-3 px-4 text-center text-sm text-gray-600">
                      {p.changSheng || '—'}
                    </td>
                  ))}
                </tr>
              )}
              {pillars.some(p => p.shenSha && p.shenSha.length > 0) && (
                <tr className="border-b">
                  <td className="py-3 px-4 font-medium text-gray-700">神煞</td>
                  {pillars.map((p, i) => (
                    <td key={i} className="py-3 px-4 text-center text-xs text-gray-600">
                      {p.shenSha && p.shenSha.length > 0 ? p.shenSha.join('、') : '—'}
                    </td>
                  ))}
                </tr>
              )}
              {pillars.some(p => p.kongWang) && (
                <tr>
                  <td className="py-3 px-4 font-medium text-gray-700">空亡</td>
                  {pillars.map((p, i) => (
                    <td key={i} className="py-3 px-4 text-center text-sm text-gray-600">
                      {p.kongWang || '—'}
                    </td>
                  ))}
                </tr>
              )}
            </tbody>
          </table>
          {/* 口径说明：文案与 src/lib/paipan.ts 的 SHEN_SHA_NOTE 同步（测试守护一致性） */}
          <p className="px-4 py-3 text-[11px] text-gray-400 border-t border-gray-100">
            神煞取法依《渊海子平》《三命通会》通行口径：天乙贵人、文昌、禄神、羊刃、太极贵人、福星贵人、国印贵人、金舆、红艳煞自日干起（羊刃仅阳干）；桃花、驿马、华盖、将星、劫煞、灾煞、亡神自年支、日支起（三合局取支）；孤辰寡宿、红鸾、天喜自年支起；天德贵人、月德贵人、天医、天赦、四废自月支起（天赦、四废见于日柱）；魁罡、阴阳差错、十恶大败、孤鸾煞取自日柱干支，三奇贵人取年月日或月日时天干顺布；空亡为各柱干支所在旬空之二支。均为传统民俗论法，流派间取法或有差异，仅供参考、非确定性，不构成任何决策建议。
          </p>
        </div>

        {/* 基础信息 */}
        <div className="grid md:grid-cols-2 gap-4 mb-6">
          <div className="bg-white rounded-lg shadow p-4">
            <h3 className="font-semibold text-amber-800 mb-2">基础信息</h3>
            <div className="space-y-1 text-sm">
              <p><span className="text-gray-600">日主：</span>{chart.dayMaster}</p>
              <p><span className="text-gray-600">旺衰：</span>{chart.analysis.wangShuai}</p>
              <p><span className="text-gray-600">格局：</span>{chart.analysis.geJu}</p>
              <p><span className="text-gray-600">起运：</span>{chart.qiYun}</p>
            </div>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <h3 className="font-semibold text-amber-800 mb-2">胎元命宫</h3>
            <div className="space-y-1 text-sm">
              <p><span className="text-gray-600">胎元：</span>{chart.taiYuan}</p>
              <p><span className="text-gray-600">命宫：</span>{chart.mingGong}</p>
              <p><span className="text-gray-600">身宫：</span>{chart.shenGong}</p>
            </div>
          </div>
        </div>

        {/* 大运 */}
        <div className="bg-white rounded-lg shadow p-4 mb-6">
          <h3 className="font-semibold text-amber-800 mb-3">大运</h3>
          <div className="flex flex-wrap gap-2">
            {chart.daYun.map((dy, i) => {
              const isCurrent = nowYearNum >= dy.startYear && nowYearNum <= dy.endYear
              return (
                <div
                  key={i}
                  className={`rounded px-3 py-2 text-center ${
                    isCurrent ? 'bg-amber-200 ring-1 ring-amber-400' : 'bg-amber-50'
                  }`}
                >
                  <div className="font-bold text-amber-800">{dy.ganZhi}</div>
                  <div className="text-xs text-gray-600">{dy.startAge}-{dy.startAge + 9}岁</div>
                  {isCurrent && <div className="text-[10px] text-amber-700 font-medium">当前</div>}
                </div>
              )
            })}
          </div>
        </div>

        {/* 保存命盘 */}
        <SaveChart />

        {/* 已解锁：完整命理分析 */}
        {chart.analysis.isPaid && chart.analysis.paid && (
          <div className="mb-6 space-y-4">
            <h2 className="text-xl font-bold text-amber-900">完整命理分析 · 六书精要</h2>
            {/* 结构化岁运时间轴（旧命盘无此数据时不显示，仅展示文字） */}
            {chart.analysis.paid.luckCycles && (
              <LuckCyclesView luck={chart.analysis.paid.luckCycles} />
            )}
            {([
              ['八字总览', chart.analysis.paid.overview],
              ['性格天赋', chart.analysis.paid.personality],
              ['用神喜忌', chart.analysis.paid.yongShen],
              ['格局成败', chart.analysis.paid.geJuAnalysis],
              ['调候用神', chart.analysis.paid.tiaoHou],
              ['大运流年', chart.analysis.paid.daYunAnalysis],
              ['事业财运', chart.analysis.paid.career],
              ['婚姻感情', chart.analysis.paid.marriage],
              ['子女六亲', chart.analysis.paid.children],
              ['健康提示', chart.analysis.paid.health]
            ] as [string, string][]).map(([title, text]) => (
              <div key={title} className="bg-white rounded-lg shadow p-4">
                <h3 className="font-semibold text-amber-800 mb-2">{title}</h3>
                <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-line">{text}</p>
              </div>
            ))}

            {/* 古籍相似命例（规则引擎检索，旧命盘无此数据时不显示） */}
            {chart.analysis.paid.similarCases && chart.analysis.paid.similarCases.length > 0 && (
              <div className="bg-white rounded-lg shadow p-4">
                <h3 className="font-semibold text-amber-800 mb-1">古籍相似命例</h3>
                <p className="text-xs text-gray-500 mb-3">
                  从《子平真诠》《滴天髓》《三命通会》等典籍命例库中按四柱结构相似度检索，供参照印证（仅供学习参考）
                </p>
                <div className="space-y-3">
                  {chart.analysis.paid.similarCases.map((c, i) => (
                    <div key={i} className={`rounded-lg border p-3 ${c.exact ? 'border-amber-400 bg-amber-50' : 'border-gray-200'}`}>
                      <div className="flex flex-wrap items-baseline gap-2 mb-1">
                        <span className="font-bold text-amber-900">
                          {c.person || '未具名命造'}
                        </span>
                        <span className="text-sm text-gray-700">
                          {c.pillars.year} {c.pillars.month} {c.pillars.day} {c.pillars.hour}
                        </span>
                        {c.exact && (
                          <span className="text-xs bg-amber-600 text-white px-2 py-0.5 rounded">四柱全同</span>
                        )}
                        <span className="text-xs text-gray-400 ml-auto">{c.source}</span>
                      </div>
                      <div className="flex flex-wrap gap-1 mb-1">
                        {c.matches.map((m, j) => (
                          <span key={j} className="text-xs bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded">{m}</span>
                        ))}
                      </div>
                      {c.readings && c.readings.length > 1 ? (
                        <div className="space-y-2 mt-2">
                          {c.readings.map((r, j) => (
                            <div key={j} className="border-l-2 border-amber-200 pl-3">
                              <div className="text-xs text-amber-600 mb-0.5">
                                {r.source.split(' ')[0]}{r.person ? ` · ${r.person}` : ''}
                              </div>
                              <p className="text-sm text-gray-700 leading-relaxed">
                                {r.text.length > 220 ? r.text.slice(0, 220) + '…' : r.text}
                              </p>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-sm text-gray-700 leading-relaxed">{c.text}</p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* 付费解锁区 */}
        {!chart.analysis.isPaid && (
        <div className="bg-gradient-to-r from-amber-500 to-amber-600 rounded-lg shadow-lg p-6 text-white text-center">
          <h3 className="text-xl font-bold mb-2">解锁完整命理分析</h3>
          <p className="mb-4 opacity-90">基于《子平真诠》《滴天髓》《穷通宝鉴》等六书精要</p>
          {chart.locked?.preview && (
            <p className="mb-4 text-sm opacity-90">{chart.locked.preview}</p>
          )}
          
          <div className="grid md:grid-cols-3 gap-3 mb-4 text-sm">
            <div className="bg-white/20 rounded p-2">八字总览</div>
            <div className="bg-white/20 rounded p-2">性格天赋</div>
            <div className="bg-white/20 rounded p-2">用神喜忌</div>
            <div className="bg-white/20 rounded p-2">格局成败</div>
            <div className="bg-white/20 rounded p-2">调候用神</div>
            <div className="bg-white/20 rounded p-2">大运流年</div>
            <div className="bg-white/20 rounded p-2">事业财运</div>
            <div className="bg-white/20 rounded p-2">婚姻感情</div>
            <div className="bg-white/20 rounded p-2">子女六亲</div>
            <div className="bg-white/20 rounded p-2">健康提示</div>
          </div>

          <button
            onClick={handleUnlock}
            disabled={unlocking}
            className="bg-white text-amber-600 px-8 py-3 rounded-full font-bold hover:bg-amber-50 transition disabled:opacity-60"
          >
            {unlocking ? 'AI命理师解读生成中（约30秒）...' : `解锁完整分析（内测期免费体验）`}
          </button>
          {payError && <p className="text-sm mt-2 text-red-100">{payError}</p>}
          <p className="text-xs mt-3 opacity-75">
            正式开放后 {FATEBOOK_PRICE}/次（会员不含报告）·{' '}
            <Link href="/mingshu" className="underline">查看命书详情</Link>
          </p>
        </div>
        )}

        {/* 返回 */}
        <div className="text-center mt-6">
          <button
            onClick={() => router.push('/')}
            className="text-amber-600 hover:text-amber-800"
          >
            ← 重新排盘
          </button>
        </div>
      </div>

    </main>
  )
}
