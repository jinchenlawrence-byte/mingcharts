'use client'

// AI 追问面板（内嵌 /chart、报告详情与四类报告模块页）—— ask 额度的前端消费方。
// ★ 入口永在（2026-11-08）：未登录给登录引导、无权益给购买入口、接口失败给重试，
//   不再因 allowed !== true 整体 return null；额度为 0 时保留入口并给追问包入口。
// ★ 权限仍由 /api/ask 的 allowed 下发（服务端单一事实源），前端不自行推断；
//   报告级是否付费由调用方按 src/lib/reportAccess.ts 的同一判定传入 reportPaid。
// ★ 合规展示：拒答提示、每条回答的免责句均由服务端返回并原样呈现（前端不生成命理内容）。
import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { getSupabase } from '@/lib/supabase'
import CheckoutButton from '@/components/CheckoutButton'
import { waffoProductId } from '@/lib/waffo-products'
import { SKUS, formatPriceUSD, MEMBER_ASK_PER_MONTH, ASK_PER_REPORT, ASK_PER_INVITE } from '@/lib/pricing'
import type { SkuId } from '@/lib/pricing'
import { localize } from '@/lib/hant'
import type { SiteLang } from '@/lib/lang'

interface AskMessage {
  role: 'user' | 'assistant'
  text: string
  /** 服务端标记：本条为硬拒答 */
  refused?: boolean
  /** 服务端标记：本条为 AI 失败兜底 */
  failed?: boolean
  /** 免责句（回答类消息附带） */
  disclaimer?: string
}

/** 多盘切换项（合婚用：默认男方盘，可切女方盘） */
export interface AskChartOption {
  key: string
  label: string
  chart: object
}

/** 面板状态：入口始终渲染，状态只决定正文 */
type AccessState = 'checking' | 'anonymous' | 'unavailable' | 'denied' | 'ready'

export default function AskPanel({
  chartId,
  chart,
  locale = 'zh-Hans',
  chartOptions,
  context,
  hint,
  reportId,
  reportPaid,
  unlockSku,
}: {
  /** 当前命盘 id（随问答落库作 chart_id；可为空） */
  chartId?: string | null
  /** 整份命盘数据（服务端据此复用命盘事实，防 AI 编造）；旧报告补算完成前可为 null */
  chart: object | null
  /** 繁體樹傳 zh-Hant（面板 UI 文案；AI 回答由 localeDirective 直出） */
  locale?: SiteLang
  /** 可切换的命盘（合婚：男方/女方）；为空时只用 chart */
  chartOptions?: AskChartOption[]
  /** 额外追问上下文（如紫微盘与分析摘要），服务端据此生成专属提示词 */
  context?: object
  /** 提问范围提示（方位/年运等模块用于引导问题边界） */
  hint?: string
  /** 报告 id（报告页传入，服务端校验归属） */
  reportId?: string | null
  /** 这份报告是否已付费（与重新生成按钮共用同一判定）；未传则只按账号权益展示 */
  reportPaid?: boolean
  /** 未付费时的解锁 SKU（紫微/合婚/方位/年运报告页传入） */
  unlockSku?: SkuId
}) {
  const L = (s: string) => localize(s, locale)
  const en = locale === 'en'
  const hant = locale === 'zh-Hant'
  const [activeKey, setActiveKey] = useState(chartOptions?.[0]?.key ?? '')
  const activeChart = chartOptions?.find((o) => o.key === activeKey)?.chart ?? chart
  const [messages, setMessages] = useState<AskMessage[]>([])
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const [remaining, setRemaining] = useState<number | null>(null)
  /** 会员本月剩余（服务端下发；非会员为 0）——用于展示额度来源 */
  const [memberRemaining, setMemberRemaining] = useState<number | null>(null)
  /** 报告赠送剩余（每份报告赠 5 次）——用于展示额度来源 */
  const [reportRemaining, setReportRemaining] = useState<number | null>(null)
  /** 邀请奖励剩余（每邀请 1 人赠 3 次）——用于展示额度来源 */
  const [inviteRemaining, setInviteRemaining] = useState<number | null>(null)
  /** 服务端下发的额度开关（GET /api/ask 返回）：只在开启时把 0 次锁定输入框 */
  const [enforced, setEnforced] = useState(false)
  const [access, setAccess] = useState<AccessState>('checking')
  const [retryTick, setRetryTick] = useState(0)
  const [error, setError] = useState('')
  const [exhausted, setExhausted] = useState(false)
  const listRef = useRef<HTMLDivElement>(null)

  const authPath = en ? '/en/auth' : hant ? '/tw/auth' : '/auth'
  const pricingPath = en ? '/en/pricing' : hant ? '/tw/pricing' : '/pricing'
  const chartPath = en ? '/en/chart' : hant ? '/tw/chart' : '/chart'

  // 挂载/重试时取剩余次数与权限（服务端权威值）
  useEffect(() => {
    let cancelled = false
    setAccess('checking')
    ;(async () => {
      try {
        const supabase = getSupabase()
        const { data: { session } } = await supabase.auth.getSession()
        if (!session) {
          if (!cancelled) setAccess('anonymous')
          return
        }
        const res = await fetch(`/api/ask?token=${encodeURIComponent(session.access_token)}`)
        if (!res.ok) {
          if (!cancelled) setAccess('unavailable')
          return
        }
        const data = await res.json().catch(() => null)
        if (cancelled) return
        if (typeof data?.remaining === 'number') setRemaining(data.remaining)
        if (typeof data?.memberRemaining === 'number') setMemberRemaining(data.memberRemaining)
        if (typeof data?.reportRemaining === 'number') setReportRemaining(data.reportRemaining)
        if (typeof data?.inviteRemaining === 'number') setInviteRemaining(data.inviteRemaining)
        if (data?.enforced === true) setEnforced(true)
        if (typeof data?.allowed === 'boolean') {
          setAccess(data.allowed ? 'ready' : 'denied')
        } else {
          setAccess('unavailable')
        }
      } catch {
        if (!cancelled) setAccess('unavailable')
      }
    })()
    return () => { cancelled = true }
  }, [retryTick])

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: 'smooth' })
  }, [messages, sending])

  // ★ 额度耗尽：入口仍在，给追问包购买入口；只有服务端开启强制时才锁输入框
  //   （enforced=false 时服务端仍放行，前端不能误锁）。
  const quotaOut = exhausted || (remaining !== null && remaining <= 0)
  const inputLocked = quotaOut && enforced

  const send = async () => {
    const q = input.trim()
    if (!q || sending || !activeChart) return
    if (quotaOut && enforced) return
    setError('')
    setMessages((m) => [...m, { role: 'user', text: q }])
    setInput('')
    setSending(true)
    try {
      const supabase = getSupabase()
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        setAccess('anonymous')
        setError(L('登录状态已失效，请重新登录。'))
        setSending(false)
        return
      }
      const res = await fetch('/api/ask', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        // ★ 2026-11-05：显式带 locale。此前不带 → 服务端退回 mc_locale cookie，
        //   用户访问过 /en 后，中文用户的追问回答会变成英文（线上实测）。
        //   追问必须与「所问那份报告」同语言，由面板所在树决定，不由 cookie 决定。
        body: JSON.stringify({
          token: session.access_token,
          chartId: chartId ?? undefined,
          reportId: reportId ?? undefined,
          chart: activeChart,
          context,
          question: q,
          locale,
        }),
      })
      const data = await res.json().catch(() => null)
      if (!res.ok) {
        if (data?.code === 'ASK_QUOTA_EXHAUSTED') {
          setExhausted(true)
          if (typeof data?.remaining === 'number') setRemaining(data.remaining)
          setError(data?.error ?? L('追问次数已用完'))
        } else if (data?.code === 'ASK_REQUIRES_PAID') {
          // 权限已失效（退款/订阅过期/该报告未付费）——保留入口，改为购买引导
          setAccess('denied')
          setError(data?.error ?? L('追问需先购买任一报告或开通会员'))
        } else if (data?.code === 'ASK_REPORT_FORBIDDEN') {
          setAccess('denied')
          setError(data?.error ?? L('该报告不属于当前账号，无法追问。'))
        } else {
          setError(data?.error ?? L('追问失败，请稍后再试'))
        }
        setSending(false)
        return
      }
      setMessages((m) => [...m, {
        role: 'assistant',
        text: data?.answer ?? '（无内容）',
        refused: !!data?.refused,
        failed: !!data?.failed,
        disclaimer: data?.disclaimer,
      }])
      if (typeof data?.remaining === 'number') setRemaining(data.remaining)
      if (typeof data?.memberRemaining === 'number') setMemberRemaining(data.memberRemaining)
      if (typeof data?.reportRemaining === 'number') setReportRemaining(data.reportRemaining)
      if (typeof data?.inviteRemaining === 'number') setInviteRemaining(data.inviteRemaining)
      if (typeof data?.remaining === 'number' && data.remaining <= 0) setExhausted(true)
    } catch (e) {
      setError(e instanceof Error ? e.message : L('网络异常，请稍后再试'))
    }
    setSending(false)
  }

  const askPrice = formatPriceUSD(SKUS.ask_pack.priceUSD)

  // ★ 报告级权益优先：本报告未付费时，即使账号有其他付费内容也只给「购买本报告」。
  const state: AccessState =
    reportPaid === false
      ? access === 'anonymous'
        ? 'anonymous'
        : access === 'checking'
          ? 'checking'
          : 'denied'
      : access

  return (
    <div className="hw-c-box hw-print-hide" style={{ marginTop: 20 }}>
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <h3 className="hw-c-secTitle" style={{ margin: 0 }}>{L('追问命理师')}</h3>
        {state === 'ready' && remaining !== null && (
          <span className="text-xs text-ink-light">
            {L('剩余追问次数：')}<b className="text-ink">{remaining}</b>
            {memberRemaining !== null && memberRemaining > 0 && (
              <>（{L('含会员本月')} <b className="text-ink">{memberRemaining}</b> {L('次')}）</>
            )}
            {reportRemaining !== null && reportRemaining > 0 && (
              <>（{L('含报告赠送')} <b className="text-ink">{reportRemaining}</b> {L('次')}）</>
            )}
            {inviteRemaining !== null && inviteRemaining > 0 && (
              <>（{L('含邀请奖励')} <b className="text-ink">{inviteRemaining}</b> {L('次')}）</>
            )}
          </span>
        )}
      </div>

      {state === 'checking' && (
        <p className="text-sm text-ink-light mt-2">{L('正在获取追问额度…')}</p>
      )}

      {state === 'anonymous' && (
        <div className="mt-2">
          <p className="text-sm text-ink-light">{L('登录后即可就这份报告向命理师追问。')}</p>
          <Link
            href={authPath}
            className="inline-block mt-3 rounded-full bg-ink text-white px-5 py-2 text-sm font-semibold transition hover:brightness-110"
          >
            {L('去登录')}
          </Link>
        </div>
      )}

      {state === 'unavailable' && (
        <div className="mt-2">
          <p className="text-sm text-ink-light">{L('暂时无法获取追问额度，请稍后重试。')}</p>
          <button
            type="button"
            onClick={() => setRetryTick((n) => n + 1)}
            className="inline-block mt-3 rounded-full border border-hw-line px-5 py-2 text-sm font-semibold text-ink transition hover:border-ink"
          >
            {L('重试')}
          </button>
        </div>
      )}

      {state === 'denied' && (
        <div className="mt-2">
          <p className="text-sm text-ink-light">
            {reportPaid === false
              ? L('本报告为免费试读，购买后可向命理师追问。')
              : L('当前账号尚未购买付费报告或会员，暂时无法追问。')}
          </p>
          {unlockSku ? (
            <div className="mt-3 max-w-xs">
              <CheckoutButton
                sku={unlockSku}
                available={waffoProductId(unlockSku) !== null}
                requireChart={false}
                authPath={authPath}
                locale={locale}
              >
                {L('购买本报告后可追问')}
              </CheckoutButton>
            </div>
          ) : (
            <Link
              href={pricingPath}
              className="inline-block mt-3 rounded-full bg-ink text-white px-5 py-2 text-sm font-semibold transition hover:brightness-110"
            >
              {L('查看报告与会员方案')}
            </Link>
          )}
        </div>
      )}

      {state === 'ready' && (
        <>
          <p className="text-xs text-ink-light mt-2 mb-3">
            {L('就你的命盘追问具体问题（如「今年事业上有哪些需要留意的地方」）。购买任一报告、开通会员或邀请好友注册后即可使用；每份报告赠')} {ASK_PER_REPORT} {L('次、每邀请 1 人赠')} {ASK_PER_INVITE} {L('次、会员每月')} {MEMBER_ASK_PER_MONTH} {L('次。涉医疗、法律、投资、生死与重大取舍的「该不该」类问题，命理不作判决——只讲倾向，供你自行权衡。')}
          </p>

          {hint && (
            <p className="hw-alert hw-alert--note text-sm">{hint}</p>
          )}

          {/* 多盘切换（合婚）：默认男方盘；切换后清空当前对话，避免两个盘的问答混在一起 */}
          {chartOptions && chartOptions.length > 1 && (
            <div className="flex flex-wrap items-center gap-2 mb-3">
              <span className="text-xs text-ink-light">{L('追问对象：')}</span>
              {chartOptions.map((o) => (
                <button
                  key={o.key}
                  type="button"
                  onClick={() => {
                    if (o.key === activeKey) return
                    setActiveKey(o.key)
                    setMessages([])
                    setError('')
                    setExhausted(false)
                  }}
                  className={`rounded-full px-3 py-1 text-sm font-semibold transition ${
                    o.key === activeKey
                      ? 'bg-hw-water text-white'
                      : 'border border-hw-line text-ink-light hover:text-ink'
                  }`}
                >
                  {o.label}
                </button>
              ))}
            </div>
          )}

          {/* 对话区 */}
          {messages.length > 0 && (
            <div ref={listRef} className="max-h-96 overflow-y-auto space-y-3 mb-3 rounded-2xl bg-paper-dark/20 p-3">
              {messages.map((m, i) => (
                <div key={i} className={m.role === 'user' ? 'flex justify-end' : 'flex justify-start'}>
                  <div
                    className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm leading-relaxed whitespace-pre-wrap ${
                      m.role === 'user'
                        ? 'bg-hw-water text-white'
                        : m.refused
                          ? 'bg-hw-warn-bg border-2 border-hw-warn-line text-ink/80'
                          : 'bg-white border border-hw-line text-ink/80'
                    }`}
                  >
                    {m.refused && (
                      <div className="text-sm font-extrabold text-hw-earth-ink mb-1">{L('此类问题不以命理作判决')}</div>
                    )}
                    {L(m.text)}
                    {m.disclaimer && (
                      <div className="hw-alert hw-alert--note mt-2 pt-2 text-[13px]">{L(m.disclaimer)}</div>
                    )}
                  </div>
                </div>
              ))}
              {sending && (
                <div className="flex justify-start">
                  <div className="rounded-2xl px-3 py-2 text-sm bg-white border border-hw-line text-ink-light">
                    {L('命理师正在作答…')}
                  </div>
                </div>
              )}
            </div>
          )}

          {error && <p className="hw-alert hw-alert--danger">{error}</p>}

          {/* 额度耗尽：购买入口（未登记 productId 时 CheckoutButton 显示「即将推出」） */}
          {quotaOut && (
            <div className="hw-alert hw-alert--warn">
              <p className="text-sm text-ink/80 mb-2">
                {L('追问次数已用完。可购买追问包（')}{L(SKUS.ask_pack.desc)} · {askPrice}{L('）继续提问。')}
              </p>
              <CheckoutButton
                sku="ask_pack"
                available={waffoProductId('ask_pack') !== null}
                requireChart={false}
                authPath={authPath}
                locale={locale}
                returnTo={chartPath}
              >
                {L('购买追问包')} · {askPrice}
              </CheckoutButton>
            </div>
          )}

          {!activeChart ? (
            <p className="hw-alert hw-alert--note text-sm">{L('本报告缺少排盘参数，暂时无法追问。')}</p>
          ) : (
            <div className="flex gap-2">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') send() }}
                placeholder={inputLocked ? L('追问次数已用完，购买追问包后可继续') : L('输入你的问题…')}
                maxLength={300}
                disabled={inputLocked}
                className="flex-1 rounded-full border border-hw-line px-4 py-2 text-sm outline-none focus:border-hw-water disabled:bg-paper-dark/30 disabled:cursor-not-allowed"
              />
              <button
                type="button"
                onClick={send}
                disabled={sending || inputLocked || !input.trim()}
                className="shrink-0 rounded-full bg-ink text-white px-5 py-2 text-sm font-semibold transition hover:brightness-110 disabled:opacity-60"
              >
                {sending ? L('追问中…') : L('追问')}
              </button>
            </div>
          )}
        </>
      )}
    </div>
  )
}
