'use client'

// 免費查神煞（第 36 轮）—— C 端免费钩子，也是 B 端「工具可信度」的展示
//
// 为什么做这一页：
//   站上有 53 篇神煞查法，但读者只能「看文章」，不能「查自己」。
//   这一步把免费内容变成一次【留下痕迹的交互】：输入生日 → 看到自己命中带哪些神煞
//   → 想深入 → 才可能付费。社媒与搜索带来的冲动流量需要一个能立刻用的入口。
//
// ★ 立场（与全站一致）：只给「命中哪些」，不给吉凶判断、不吓人。
//   每个神煞链到查法文章，读者自己核对口诀与出典。
// ★ 真太阳时：走 /api/paipan，自带出生地与经度校正 —— 这是我们相对同类产品的差异点。
import { useState } from 'react'
import Link from 'next/link'
import BirthPlacePicker from '@/components/BirthPlacePicker'
import type { BirthPlaceValue } from '@/components/BirthPlacePicker'
import { localize } from '@/lib/hant'
import type { SiteLang } from '@/lib/lang'
import { SHEN_SHA_SLUG } from '@/lib/shenshaArticles'
import { SHENSHA_GROUPS } from '@/lib/shenshaIndex'

interface Hit {
  name: string
  pillars: string[]
}

const PILLAR_LABEL: Record<string, string> = { year: '年柱', month: '月柱', day: '日柱', hour: '时柱' }

/** slug → 分类 id（用于把命中项归到七类里） */
const SLUG_GROUP: Record<string, string> = (() => {
  const m: Record<string, string> = {}
  for (const g of SHENSHA_GROUPS) for (const s of g.slugs) m[s] = g.id
  return m
})()

export default function ShenshaCheck({ locale }: { locale: SiteLang }) {
  const L = (s: string) => localize(s, locale)
  const prefix = locale === 'zh-Hant' ? '/tw' : ''

  const [year, setYear] = useState('')
  const [month, setMonth] = useState('')
  const [day, setDay] = useState('')
  const [hour, setHour] = useState('')
  const [minute, setMinute] = useState('')
  const [gender, setGender] = useState<1 | 0>(1)
  const [birth, setBirth] = useState<BirthPlaceValue>({ mode: 'none' })

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [hits, setHits] = useState<Hit[] | null>(null)
  const [kongWang, setKongWang] = useState<string[]>([])
  const [ganZhi, setGanZhi] = useState<string[]>([])

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (loading) return
    setError('')

    const payload: Record<string, unknown> = {
      year: Number(year), month: Number(month), day: Number(day),
      hour: Number(hour), minute: Number(minute || 0), gender,
    }
    if (birth.mode === 'city') payload.birthCityId = birth.cityId
    if (birth.mode === 'zone') { payload.birthZone = birth.zone; payload.birthLng = birth.lng }

    setLoading(true)
    try {
      const res = await fetch('/api/paipan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const json = await res.json().catch(() => null)
      if (!res.ok || !json?.success) {
        setError(json?.error || L('查询失败，请检查生辰是否填对'))
        return
      }
      const pillars = json.data?.pillars ?? {}
      const merged: Record<string, string[]> = {}
      const kw: string[] = []
      const gz: string[] = []
      for (const key of ['year', 'month', 'day', 'hour']) {
        const p = pillars[key]
        if (!p) continue
        gz.push(p.ganZhi ?? '')
        if (p.kongWang) kw.push(`${L(PILLAR_LABEL[key])}：${p.kongWang}`)
        for (const name of p.shenSha ?? []) {
          merged[name] = merged[name] ?? []
          if (!merged[name].includes(key)) merged[name].push(key)
        }
      }
      setHits(Object.entries(merged).map(([name, arr]) => ({ name, pillars: arr })))
      setKongWang(kw)
      setGanZhi(gz)
    } catch {
      setError(L('网络异常，请稍后重试'))
    } finally {
      setLoading(false)
    }
  }

  /** 把命中项按七类归组；不在索引里的归到「其他」 */
  const grouped = (() => {
    if (!hits) return []
    const byGroup: Record<string, Hit[]> = {}
    const other: Hit[] = []
    for (const h of hits) {
      const slug = SHEN_SHA_SLUG[h.name]
      const gid = slug ? SLUG_GROUP[slug] : undefined
      if (gid) (byGroup[gid] = byGroup[gid] ?? []).push(h)
      else other.push(h)
    }
    const out = SHENSHA_GROUPS
      .filter((g) => byGroup[g.id]?.length)
      .map((g) => ({ id: g.id, label: g.label, hits: byGroup[g.id] }))
    if (other.length) out.push({ id: 'other', label: '其他', hits: other })
    return out
  })()

  return (
    <div>
      <form onSubmit={submit} className="hw-c-box mb-6">
        <h2 className="hw-c-secTitle">{L('输入生辰，查你命中带哪些神煞')}</h2>
        <div className="grid grid-cols-3 sm:grid-cols-5 gap-2 mb-2">
          <div>
            <label className="hw-f">{L('年')}</label>
            <input type="number" required min={1900} max={2100} placeholder="1990"
              className="hw-c-input" value={year} onChange={(e) => setYear(e.target.value)} />
          </div>
          <div>
            <label className="hw-f">{L('月')}</label>
            <input type="number" required min={1} max={12} placeholder="6"
              className="hw-c-input" value={month} onChange={(e) => setMonth(e.target.value)} />
          </div>
          <div>
            <label className="hw-f">{L('日')}</label>
            <input type="number" required min={1} max={31} placeholder="15"
              className="hw-c-input" value={day} onChange={(e) => setDay(e.target.value)} />
          </div>
          <div>
            <label className="hw-f">{L('时')}</label>
            <input type="number" required min={0} max={23} placeholder="10"
              className="hw-c-input" value={hour} onChange={(e) => setHour(e.target.value)} />
          </div>
          <div>
            <label className="hw-f">{L('分')}</label>
            <input type="number" min={0} max={59} placeholder="30"
              className="hw-c-input" value={minute} onChange={(e) => setMinute(e.target.value)} />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2 mb-2">
          <div>
            <label className="hw-f">{L('性别')}</label>
            <select className="hw-c-input" value={gender}
              onChange={(e) => setGender(parseInt(e.target.value) as 1 | 0)}>
              <option value={1}>{L('男')}</option>
              <option value={0}>{L('女')}</option>
            </select>
          </div>
        </div>

        <div className="mt-2">
          <BirthPlacePicker value={birth} onChange={setBirth} accent="blue" />
        </div>

        <div className="flex flex-wrap items-center gap-3 mt-4">
          <button type="submit" disabled={loading} className="hw-c-btnBig cursor-pointer disabled:opacity-60">
            {loading ? L('推算中…') : L('免费查神煞')}
          </button>
          <span className="text-xs text-ink-light/60">
            {L('出生地用于真太阳时校正；不填则按北京时间。')}
          </span>
        </div>

        {error && <p className="hw-c-err mt-3">{error}</p>}
      </form>

      {hits && (
        <section className="hw-c-box mb-6">
          <h2 className="hw-c-secTitle">
            {L(`命中 ${hits.length} 个神煞`)}
            {ganZhi.length === 4 && (
              <span className="ml-2 text-xs font-normal text-ink-light/60">
                {ganZhi.join(' · ')}
              </span>
            )}
          </h2>

          {hits.length === 0 ? (
            <p className="text-sm text-ink-light">{L('未命中站内已收录的神煞。')}</p>
          ) : (
            <div className="space-y-4">
              {grouped.map((g) => (
                <div key={g.id}>
                  <h3 className="text-sm font-semibold text-ink mb-1">{L(g.label)}</h3>
                  <ul className="divide-y divide-gold/10">
                    {g.hits.map((h) => {
                      const slug = SHEN_SHA_SLUG[h.name]
                      return (
                        <li key={h.name} className="py-2 flex flex-col sm:flex-row sm:items-baseline gap-x-3">
                          <span className="font-medium shrink-0 sm:w-28">{L(h.name)}</span>
                          <span className="text-xs text-ink-light/50 shrink-0 sm:w-24">
                            {h.pillars.map((p) => L(PILLAR_LABEL[p])).join('、')}
                          </span>
                          {slug ? (
                            <Link href={`${prefix}/article/${slug}`} className="hw-c-link text-sm">
                              {L('查法与出典 →')}
                            </Link>
                          ) : (
                            <span className="text-sm text-ink-light/60">{L('总目录可查')}</span>
                          )}
                        </li>
                      )
                    })}
                  </ul>
                </div>
              ))}
            </div>
          )}

          {kongWang.length > 0 && (
            <p className="text-xs text-ink-light/60 mt-4">
              {L('旬空（空亡）')}：{kongWang.join('；')}
            </p>
          )}

          <p className="text-xs text-ink-light/60 mt-4">
            {L('※ 神煞只是辅助标签，不作吉凶判断。命理分析以五行生克、格局旺衰与运程为主。')}
          </p>

          {/* ★ 第 36 轮：承接（不用新增 SKU，只推已经能买的两样）
              · 命书 $29.99：十卷万字、逐条引证 —— 想看这些在他盘里到底怎么作用
              · 日运会员 $9.9/月：唯一有复购的产品（每日日运 + 流月 + 追问）
              两个目标页目前只有简体版，如实标注，不假装有繁体。 */}
          <div className="mt-5 pt-4 border-t border-gold/15">
            <p className="text-sm text-ink-light mb-3">
              {L('想知道这些神煞在你盘里到底怎么作用？')}
            </p>
            <div className="flex flex-wrap items-center gap-3">
              <Link href="/pricing" className="hw-c-btnBig inline-block">
                {L('看命书 · 十卷万字 →')}
              </Link>
              <Link href="/member" className="hw-c-back inline-block">
                {L('日运会员 · 每月 $9.9')}
              </Link>
            </div>
            <p className="text-[11px] text-ink-light/50 mt-2">
              {L('（这两个页面目前为简体版；命书内容与本体逐条引证一致。）')}
            </p>
          </div>

          <p className="text-sm mt-4">
            <Link href={`${prefix}/shensha`} className="hw-c-link">{L('← 53 个神煞总目录')}</Link>
          </p>
        </section>
      )}
    </div>
  )
}
