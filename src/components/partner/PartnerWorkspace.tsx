'use client'

// 伙伴工作台（第 34 轮 · 伙伴自助 V2）
//
// 只有拥有额度的伙伴账号能进来（服务端按 partner_credits 判定）；普通用户看到「仅对合作命理师开放」。
// 表单只收：品类 + 生辰（含出生地）+ 伙伴自己的品牌名/联系方式。
// ★ 不收集客户的任何联系方式 —— 伙伴是收集方，我们不留客户联系方式。
import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import Nav from '@/components/Nav'
import BirthPlacePicker from '@/components/BirthPlacePicker'
import type { BirthPlaceValue } from '@/components/BirthPlacePicker'
import { getSupabase } from '@/lib/supabase'
import { localize } from '@/lib/hant'
import type { OutputLocale } from '@/lib/locale'

type PageState = 'loading' | 'guest' | 'partner' | 'denied'
type Kind = 'fatebook' | 'hemun'

interface BirthForm {
  year: string
  month: string
  day: string
  hour: string
  minute: string
  gender: 1 | 0
  birth: BirthPlaceValue
}

interface PartnerReportRow {
  id: string
  kind: Kind
  title: string
  status: 'ready' | 'pending' | 'failed'
  created_at: string
  request_id: string | null
  share_url: string | null
}

const EMPTY_MALE: BirthForm = {
  year: '', month: '', day: '', hour: '', minute: '', gender: 1, birth: { mode: 'none' },
}
const EMPTY_FEMALE: BirthForm = {
  year: '', month: '', day: '', hour: '', minute: '', gender: 0, birth: { mode: 'none' },
}

/** 提交展平：城市 → birthCityId；其它 → birthZone（进阶经度 birthLng）；none → 不带 */
function personPayload(p: BirthForm) {
  const base = {
    year: p.year, month: p.month, day: p.day,
    hour: p.hour, minute: p.minute, gender: p.gender,
  }
  if (p.birth.mode === 'city') return { ...base, birthCityId: p.birth.cityId }
  if (p.birth.mode === 'zone') return { ...base, birthZone: p.birth.zone, birthLng: p.birth.lng }
  return base
}

function PersonFields({
  title, value, onChange, accent, disabled, L,
}: {
  title: string
  value: BirthForm
  onChange: (v: BirthForm) => void
  accent: 'blue' | 'rose'
  disabled: boolean
  L: (s: string) => string
}) {
  const set = (patch: Partial<BirthForm>) => onChange({ ...value, ...patch })
  const titleCls = accent === 'blue' ? 'text-[#3a66ff]' : 'text-[#e04a3a]'
  return (
    <div className="hw-c-box">
      <h3 className={`font-semibold mb-3 ${titleCls}`}>{title}</h3>
      <div className="grid grid-cols-3 gap-2 mb-2">
        <div>
          <label className="hw-f">{L('年')}</label>
          <input type="number" required placeholder="1990" className="hw-c-input" disabled={disabled}
            value={value.year} onChange={e => set({ year: e.target.value })} />
        </div>
        <div>
          <label className="hw-f">{L('月')}</label>
          <input type="number" required min={1} max={12} placeholder="5" className="hw-c-input" disabled={disabled}
            value={value.month} onChange={e => set({ month: e.target.value })} />
        </div>
        <div>
          <label className="hw-f">{L('日')}</label>
          <input type="number" required min={1} max={31} placeholder="8" className="hw-c-input" disabled={disabled}
            value={value.day} onChange={e => set({ day: e.target.value })} />
        </div>
      </div>
      <div className="grid grid-cols-3 gap-2">
        <div>
          <label className="hw-f">{L('时')}</label>
          <input type="number" required min={0} max={23} placeholder="16" className="hw-c-input" disabled={disabled}
            value={value.hour} onChange={e => set({ hour: e.target.value })} />
        </div>
        <div>
          <label className="hw-f">{L('分')}</label>
          <input type="number" min={0} max={59} placeholder="30" className="hw-c-input" disabled={disabled}
            value={value.minute} onChange={e => set({ minute: e.target.value })} />
        </div>
        <div>
          <label className="hw-f">{L('性别')}</label>
          <select className="hw-c-input" value={value.gender} disabled={disabled}
            onChange={e => set({ gender: parseInt(e.target.value) as 1 | 0 })}>
            <option value={1}>{L('男')}</option>
            <option value={0}>{L('女')}</option>
          </select>
        </div>
      </div>
      <div className="mt-2">
        <BirthPlacePicker value={value.birth} onChange={(b) => set({ birth: b })} accent={accent} />
      </div>
    </div>
  )
}

// 模块级标签保留简体原文，在渲染处经 L() 本地化（第 36 轮）
const STATUS_LABEL: Record<PartnerReportRow['status'], string> = {
  ready: '已生成',
  pending: '生成中',
  failed: '生成失败（已退额）',
}

const KIND_LABEL: Record<Kind, string> = {
  fatebook: '命书',
  hemun: '合婚',
}

export default function PartnerWorkspace({ locale }: { locale: OutputLocale }) {
  // ★ 第 36 轮：港台伙伴的工作台必须是繁体 —— 他们要拿这个工具服务繁体客户，
  //   一个全简体的工作台对专业用户是信任打折。文案不写第二份：简体为源，
  //   繁体经 lib/hant 的 localize 派生（与 /partners 营销页同一套做法）。
  const L = (s: string) => localize(s, locale)
  const partnersHref = locale === 'zh-Hant' ? '/tw/partners' : '/partners'
  // 繁体树已由 /tw 布局提供导航，工作台不再重复渲染简体 Nav
  const nav = locale === 'zh-Hans' ? <Nav /> : null
  const [pageState, setPageState] = useState<PageState>('loading')
  const [authToken, setAuthToken] = useState<string | null>(null)
  const [balance, setBalance] = useState<number | null>(null)
  const [rows, setRows] = useState<PartnerReportRow[]>([])

  const [kind, setKind] = useState<Kind>('fatebook')
  const [single, setSingle] = useState<BirthForm>(EMPTY_MALE)
  const [male, setMale] = useState<BirthForm>(EMPTY_MALE)
  const [female, setFemale] = useState<BirthForm>(EMPTY_FEMALE)
  const [brandName, setBrandName] = useState('')
  const [brandContact, setBrandContact] = useState('')

  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [done, setDone] = useState<{ title: string; shareUrl: string } | null>(null)
  const [copied, setCopied] = useState('')
  const requestIdRef = useRef<string | null>(null)

  const insufficient = balance !== null && balance < 1

  const refresh = async (token: string) => {
    const res = await fetch(`/api/partner/report?token=${encodeURIComponent(token)}`)
    const json = await res.json().catch(() => null)
    if (res.status === 403) {
      setPageState('denied')
      return
    }
    if (!res.ok || !json?.isPartner) {
      setError(json?.error || L('工作台读取失败，请稍后刷新'))
      setPageState('partner')
      return
    }
    setBalance(typeof json.balance === 'number' ? json.balance : 0)
    setRows((json.reports ?? []) as PartnerReportRow[])
    setPageState('partner')
  }

  useEffect(() => {
    ;(async () => {
      const { data: { session } } = await getSupabase().auth.getSession()
      if (!session?.access_token) {
        setPageState('guest')
        return
      }
      setAuthToken(session.access_token)
      await refresh(session.access_token)
    })()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const copyText = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(text)
    } catch {
      setError(L('复制失败，请手动选中链接复制'))
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!authToken || insufficient || submitting) return
    setSubmitting(true)
    setError('')
    setDone(null)

    // 同一份表单的 requestId 在失败重试时保持不变：服务端据此短路，绝不重复扣费
    const requestId = requestIdRef.current ?? crypto.randomUUID()
    requestIdRef.current = requestId

    const input = kind === 'fatebook'
      ? personPayload(single)
      : { male: personPayload(male), female: personPayload(female) }

    try {
      const res = await fetch('/api/partner/report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token: authToken,
          kind,
          input,
          brandName,
          brandContact,
          requestId,
          // ★ 第 36 轮：显式传语言。此前靠 mc_locale cookie 推断 ——
          //   伙伴若在简体页操作过，cookie 是 zh-Hans，他的客户拿到的报告会全是简体。
          //   港台伙伴（PerceptionHK / FairiesLotus / p8zi 这类）的客户读繁体，
          //   所以语言必须由「他当前所在的页面」决定，而不是上一次访问留下的 cookie。
          locale,
        }),
      })
      const json = await res.json().catch(() => null)
      if (!res.ok || !json?.success) {
        if (json?.needPurchase) setBalance(0)
        setError(json?.error || L('生成失败，请稍后重试'))
        return
      }
      // 成功：重置请求号，刷新余额与列表
      requestIdRef.current = null
      setDone({ title: json.data.report.title, shareUrl: json.data.report.shareUrl })
      setBalance(typeof json.data.balance === 'number' ? json.data.balance : null)
      await refresh(authToken)
    } catch {
      setError(L('网络错误，请稍后重试（重试不会重复扣费）'))
    } finally {
      setSubmitting(false)
    }
  }

  const ensureShareLink = async (row: PartnerReportRow) => {
    if (!authToken) return
    if (row.share_url) {
      await copyText(row.share_url)
      return
    }
    try {
      const res = await fetch('/api/partner/share', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: authToken, reportId: row.id }),
      })
      const json = await res.json().catch(() => null)
      if (!res.ok || !json?.success) {
        setError(json?.error || L('生成链接失败，请稍后重试'))
        return
      }
      await copyText(json.shareUrl)
      await refresh(authToken)
    } catch {
      setError(L('网络错误，请稍后重试'))
    }
  }

  if (pageState === 'loading') {
    return (
      <div className="hw-page">
        {nav}
        <main className="hw-wrap hw-c-pg">
          <p className="text-ink/60">{L('加载中...')}</p>
        </main>
      </div>
    )
  }

  if (pageState === 'guest') {
    return (
      <div className="hw-page">
        {nav}
        <main className="hw-wrap hw-c-pg">
          <div className="hw-c-box text-center">
            <h1 className="hw-c-h1">{L('伙伴工作台')}</h1>
            <p className="hw-c-dx mt-3">{L('请先登录伙伴账号')}</p>
            <p className="mt-4">
              <Link href="/auth" className="hw-c-btnBig">{L('去登录')}</Link>
            </p>
          </div>
        </main>
      </div>
    )
  }

  if (pageState === 'denied') {
    return (
      <div className="hw-page">
        {nav}
        <main className="hw-wrap hw-c-pg">
          <div className="hw-c-box text-center">
            <h1 className="hw-c-h1">{L('该页面仅对合作命理师开放')}</h1>
            <p className="hw-c-dx mt-3">
              {L('这是一个为合作命理师准备的自助出报告入口。如果你希望批发报告并挂自己的品牌，')}
              {L('可以先了解合作方式。')}
            </p>
            <p className="mt-4">
              <Link href={partnersHref} className="hw-c-btnBig">{L('了解合作 →')}</Link>
            </p>
            <p className="mt-4">
              <Link href="/" className="hw-c-back">{L('← 返回明理首页')}</Link>
            </p>
          </div>
        </main>
      </div>
    )
  }

  return (
    <div className="hw-page">
      {nav}
      <main className="hw-wrap hw-c-pg">
        <Link href="/" className="hw-c-back">{L('‹ 首页')}</Link>
        <header>
          <h1 className="hw-c-h1">{L('伙伴工作台')}</h1>
          <p className="hw-lede">
            {L('选品类、填生辰，自助出报告。每生成一份扣 1 份额度；生成失败会自动退回。')}
          </p>
        </header>

        {/* 额度 */}
        <div className="hw-c-box mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs text-ink-light/60">{L('剩余额度')}</p>
            <p className="text-2xl font-semibold text-ink">
              {balance ?? '—'} <span className="text-sm font-normal">{L('份')}</span>
            </p>
          </div>
          <Link href={partnersHref} className="hw-c-btnBig">{L('购买额度')}</Link>
        </div>

        {insufficient && (
          <p className="mb-4 rounded border-2 border-red-500 bg-red-50 px-3 py-2 text-sm font-bold text-red-700">
            {L(`⚠ 余额不足：当前 ${balance ?? 0} 份。请先购买额度再生成报告（表单已暂时禁用）。`)}
          </p>
        )}

        {error && <p className="hw-c-err mb-4">{error}</p>}

        {done && (
          <div className="hw-c-box mb-4 border-green-300 bg-green-50">
            <p className="font-semibold text-green-800">{L('✓ 报告已生成：')}{done.title}</p>
            <p className="text-xs text-ink-light/70 mt-2">{L('分享链接（90 天有效，客户无需注册即可阅读）：')}</p>
            <div className="flex flex-wrap items-center gap-2 mt-1">
              <input readOnly value={done.shareUrl} className="hw-c-input flex-1 min-w-[260px]" />
              <button type="button" onClick={() => copyText(done.shareUrl)}
                className="px-4 py-2 rounded-full border border-gold/20 bg-white text-sm font-medium hover:border-ink transition">
                {copied === done.shareUrl ? L('已复制') : L('复制链接')}
              </button>
            </div>
            <p className="text-xs text-ink-light/60 mt-2">
              {L('我也要打印：打开链接后点页面顶部的「打印 / 存为 PDF」，即可留一份纸质版。')}
            </p>
          </div>
        )}

        {/* 表单 */}
        <form onSubmit={handleSubmit}>
          <div className="hw-c-box mb-4">
            <label className="hw-f">{L('品类')}</label>
            <select className="hw-c-input" value={kind} disabled={insufficient || submitting}
              onChange={e => setKind(e.target.value as Kind)}>
              <option value="fatebook">{L('命书（单人 · 万字详批）')}</option>
              <option value="hemun">{L('合婚（双人 · 九维详批）')}</option>
            </select>
            <p className="text-[11px] text-ink-light/50 mt-1">
              {L('紫微、年运、方位城市暂未对伙伴开放。')}
            </p>
          </div>

          {kind === 'fatebook' ? (
            <div className="mb-4">
              <PersonFields title={L('客户生辰')} L={L} value={single} onChange={setSingle} accent="blue"
                disabled={insufficient || submitting} />
            </div>
          ) : (
            <div className="hw-c-two mb-4">
              <PersonFields title={L('男方')} L={L} value={male} onChange={setMale} accent="blue"
                disabled={insufficient || submitting} />
              <PersonFields title={L('女方')} L={L} value={female} onChange={setFemale} accent="rose"
                disabled={insufficient || submitting} />
            </div>
          )}

          <div className="hw-c-box mb-4">
            <h3 className="font-semibold mb-3 text-ink">{L('品牌位（可留空）')}</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="hw-f">{L('品牌名（最多 24 字）')}</label>
                <input type="text" maxLength={24} className="hw-c-input" disabled={insufficient || submitting}
                  placeholder={L('如：陈老师命理')} value={brandName}
                  onChange={e => setBrandName(e.target.value)} />
              </div>
              <div>
                <label className="hw-f">{L('联系方式（最多 40 字）')}</label>
                <input type="text" maxLength={40} className="hw-c-input" disabled={insufficient || submitting}
                  placeholder={L('LINE / 微信 / 电话')} value={brandContact}
                  onChange={e => setBrandContact(e.target.value)} />
              </div>
            </div>
            <p className="text-[11px] text-ink-light/50 mt-2">
              {L('品牌位会显示在客户报告标题上方；报告开头的「由明理引擎生成」披露不可移除。')}
            </p>
          </div>

          <p className="text-center">
            <button type="submit" disabled={insufficient || submitting}
              className="hw-c-btnBig disabled:opacity-50">
              {submitting ? L('生成中（约需 1–2 分钟）...') : L('生成报告（扣 1 份）')}
            </button>
          </p>
          <p className="hw-note text-center">{L('生成失败会自动退回额度；内容仅供传统文化参考。')}</p>
        </form>

        {/* 最近报告 */}
        <div className="hw-c-box mt-8">
          <h2 className="hw-c-secTitle">{L('最近报告')}</h2>
          {rows.length === 0 ? (
            <p className="text-sm text-ink-light/60">{L('还没有生成记录。')}</p>
          ) : (
            <ul className="divide-y divide-gold/10">
              {rows.map((row) => (
                <li key={row.id} className="py-3 flex flex-wrap items-center gap-2">
                  <div className="flex-1 min-w-[220px]">
                    <p className="text-sm font-medium text-ink">{row.title}</p>
                    <p className="text-xs text-ink-light/60">
                      {L(KIND_LABEL[row.kind] ?? row.kind)} ·{' '}
                      {new Date(row.created_at).toLocaleString(locale === 'zh-Hant' ? 'zh-TW' : 'zh-CN')} ·{' '}
                      <span className={
                        row.status === 'ready' ? 'text-green-700'
                          : row.status === 'failed' ? 'text-red-600' : 'text-ink-light'
                      }>
                        {L(STATUS_LABEL[row.status] ?? row.status)}
                      </span>
                    </p>
                  </div>
                  {row.status === 'ready' && (
                    <div className="flex items-center gap-2">
                      {row.share_url && (
                        <a href={row.share_url} target="_blank" rel="noopener noreferrer"
                          className="text-xs underline text-ink/70 hover:text-ink">{L('打开')}</a>
                      )}
                      <button type="button" onClick={() => ensureShareLink(row)}
                        className="px-3 py-1.5 rounded-full border border-gold/20 bg-white text-xs font-medium hover:border-ink transition">
                        {copied && copied === row.share_url ? L('已复制') : L('复制链接')}
                      </button>
                    </div>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      </main>
    </div>
  )
}
