'use client'

// 年运报告共享渲染组件：/liunian 生成页 与 /reports/[id] 回看页共用，防止双渲染器漂移
import type { LuckLiuNianItem, LuckLiuYueItem, LuckDaYunItem } from '@/lib/analysis'
import type { Pillar } from '@/lib/paipan'
import type { AILiunianSections } from '@/lib/aiLiunian'

export interface LiunianResultData {
  targetYear: number
  nowYear: number
  input: { year: number; month: number; day: number; hour: number; minute: number; gender: 1 | 0 }
  pillars: { year: Pillar; month: Pillar; day: Pillar; hour: Pillar }
  dayMaster: string
  taiYuan: string
  mingGong: string
  lunarDate: string
  wangShuai: string
  geJu: string
  favorable: string[]
  unfavorable: string[]
  curDaYun: LuckDaYunItem | null
  liuNian: LuckLiuNianItem[]
  liuYue: LuckLiuYueItem[] | null
  ai: AILiunianSections
  aiSource: string
  dstNotice: string | null
}

const TAG_STYLE: Record<string, string> = {
  '较宜': 'bg-green-100 text-green-800 border-green-300',
  '平顺': 'bg-emerald-50 text-emerald-700 border-emerald-200',
  '一般': 'bg-gray-100 text-gray-600 border-gray-300',
  '宜慎': 'bg-orange-100 text-orange-800 border-orange-300',
  '大防': 'bg-red-100 text-red-800 border-red-300'
}

const AI_SECTIONS: Array<{ key: keyof AILiunianSections; name: string }> = [
  { key: 'annualOverview', name: '年运总纲' },
  { key: 'careerFlow', name: '流年事业' },
  { key: 'wealthFlow', name: '流年财运' },
  { key: 'loveFlow', name: '流年感情' },
  { key: 'healthFlow', name: '流年健康' },
  { key: 'monthFlow', name: '当年流月节奏' }
]

const WX_COLOR: Record<string, string> = {
  '木': 'text-green-700', '火': 'text-red-600', '土': 'text-amber-700',
  '金': 'text-yellow-600', '水': 'text-blue-700'
}

export default function LiunianResultView({ data }: { data: LiunianResultData }) {
  const target = data.liuNian.find(y => y.year === data.targetYear)
  const gender = data.input.gender === 1 ? '男' : '女'
  const pillarLine = (pl: Pillar) => pl.ganZhi

  return (
    <div className="space-y-6">
      {/* 目标流年头部 */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex flex-wrap items-center gap-3 mb-4">
          <h2 className="text-2xl font-bold text-slate-900">
            {data.targetYear}年 · {target?.ganZhi}年流年详批
          </h2>
          {target && (
            <span className={`px-3 py-1 rounded-full border text-sm font-medium ${TAG_STYLE[target.tag] || TAG_STYLE['一般']}`}>
              {target.tag}
            </span>
          )}
          <span className="text-xs text-gray-400 ml-auto">{data.aiSource}</span>
        </div>

        {/* 命主与四柱摘要 */}
        <div className="bg-slate-50 rounded-md p-4 text-sm">
          <p className="mb-2 text-gray-600">
            {gender}命 · 公历 {data.input.year}-{data.input.month}-{data.input.day} {data.input.hour}时
            {data.input.minute > 0 ? `${data.input.minute}分` : ''}
            <span className="text-gray-400 ml-2">农历 {data.lunarDate}</span>
          </p>
          <p className="tracking-widest text-lg font-semibold text-slate-800 mb-2">
            {pillarLine(data.pillars.year)}　{pillarLine(data.pillars.month)}　
            {pillarLine(data.pillars.day)}　{pillarLine(data.pillars.hour)}
          </p>
          <p className="text-gray-600">
            日主 <span className="font-semibold">{data.dayMaster}</span>
            　旺衰 <span className="font-semibold">{data.wangShuai}</span>
            　格局 <span className="font-semibold">{data.geJu}</span>
            　胎元 {data.taiYuan}　命宫 {data.mingGong}
          </p>
          <p className="text-gray-600 mt-1">
            喜用五行：
            {data.favorable.map(w => (
              <span key={w} className={`font-semibold mx-0.5 ${WX_COLOR[w] || ''}`}>{w}</span>
            ))}
            　忌神：{data.unfavorable.join('、') || '无'}
          </p>
          {data.dstNotice && (
            <p className="text-xs text-amber-700 mt-2">提示：{data.dstNotice}</p>
          )}
        </div>

        {/* 当前大运 */}
        {data.curDaYun && (
          <div className="mt-3 text-sm text-gray-700 bg-indigo-50 border border-indigo-100 rounded-md p-3">
            <span className="font-semibold">当前大运：</span>
            {data.curDaYun.ganZhi}（{data.curDaYun.startYear}-{data.curDaYun.endYear}年，{data.curDaYun.startAge}岁起）
            　运干{data.curDaYun.shiShenGan}、运支本气{data.curDaYun.shiShenZhi}
            　倾向【{data.curDaYun.tag}】
            {data.curDaYun.structuralIssues?.length ? (
              <span className="text-amber-700">　结构病：{data.curDaYun.structuralIssues.join('；')}</span>
            ) : null}
          </div>
        )}
      </div>

      {/* 三年流年概览 */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="font-semibold text-slate-900 mb-3">三年流年概览（今年起）</h3>
        <div className="grid md:grid-cols-3 gap-3">
          {data.liuNian.map(y => {
            const isTarget = y.year === data.targetYear
            return (
              <div key={y.year}
                className={`rounded-md border p-3 text-sm ${isTarget ? 'border-slate-800 ring-2 ring-slate-300 bg-slate-50' : 'border-gray-200 bg-white'}`}>
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-bold text-slate-800">{y.year}年</span>
                  <span className="tracking-wider">{y.ganZhi}</span>
                  <span className={`px-2 py-0.5 rounded border text-xs ${TAG_STYLE[y.tag] || TAG_STYLE['一般']}`}>
                    {y.tag}
                  </span>
                  {isTarget && <span className="text-xs text-slate-500 ml-auto">本次详批</span>}
                </div>
                <p className="text-gray-600">{y.shiShenGan}主事 · {y.shiShenZhi}</p>
                {y.note && <p className="text-gray-500 mt-1 text-xs leading-relaxed">{y.note}</p>}
              </div>
            )
          })}
        </div>
      </div>

      {/* AI 深度解读板块 */}
      <div className="space-y-4">
        {AI_SECTIONS.map(({ key, name }) => {
          const text = data.ai[key]
          if (!text) return null
          return (
            <div key={key} className="bg-white rounded-lg shadow p-6">
              <h3 className="font-semibold text-slate-900 mb-3 flex items-center gap-2">
                <span className="w-1.5 h-5 bg-slate-700 rounded-sm inline-block" />
                {name}
              </h3>
              <div className="text-gray-700 leading-relaxed whitespace-pre-wrap text-[15px]">{text}</div>
            </div>
          )
        })}
      </div>

      {/* 当年流月表（仅目标年=当年时展示） */}
      {data.liuYue && data.liuYue.length > 0 && (
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="font-semibold text-slate-900 mb-3">当年流月节奏（节气换月）</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">
            {data.liuYue.map(m => (
              <div key={m.month} className={`rounded-md border p-2.5 ${TAG_STYLE[m.tag] || TAG_STYLE['一般']}`}>
                <p className="font-semibold">{m.month}月 · {m.ganZhi}</p>
                <p className="text-xs opacity-80">{m.jieQi}起 {m.rangeLabel}</p>
                <p className="text-xs mt-1">{m.shiShenGan}主事 · {m.tag}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 免责声明 */}
      <p className="text-xs text-gray-400 text-center leading-relaxed">
        本报告由规则引擎排盘定喜忌、AI 据事实撰写解读，为倾向性参考，非确定性结论，不构成任何重大决策依据；重大事项请结合实际理性判断。
      </p>
    </div>
  )
}
