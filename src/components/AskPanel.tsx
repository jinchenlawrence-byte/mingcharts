'use client'

// AI 追问面板（内嵌 /chart 结果页）—— ask 额度的前端消费方。
// ★ 追问与付费内容绑定（2026-10-21）：只要有任一付费内容（会员 / 任一报告 / 追问包）才渲染面板；
//   权限由 /api/ask 的 allowed 下发（服务端单一事实源），前端不自行推断。
// ★ 额度判定不在此自判：展示剩余次数、额度耗尽时给出购买入口；权威判定在 /api/ask（entitlement 单一事实源）。
// ★ 合规展示：拒答提示、每条回答的免责句均由服务端返回并原样呈现（前端不生成命理内容）。
import { useEffect, useRef, useState } from 'react'
import { getSupabase } from '@/lib/supabase'
import CheckoutButton from '@/components/CheckoutButton'
import { waffoProductId } from '@/lib/waffo-products'
import { SKUS, formatPriceUSD, MEMBER_ASK_PER_MONTH, ASK_PER_REPORT } from '@/lib/pricing'

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

export default function AskPanel({
  chartId,
  chart,
}: {
  /** 当前命盘 id（随问答落库作 chart_id；可为空） */
  chartId?: string | null
  /** 整份命盘数据（服务端据此复用命盘事实，防 AI 编造） */
  chart: object
}) {
  const [messages, setMessages] = useState<AskMessage[]>([])
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const [remaining, setRemaining] = useState<number | null>(null)
  /** 会员本月剩余（服务端下发；非会员为 0）——用于展示额度来源 */
  const [memberRemaining, setMemberRemaining] = useState<number | null>(null)
  /** 报告赠送剩余（每份报告赠 5 次）——用于展示额度来源 */
  const [reportRemaining, setReportRemaining] = useState<number | null>(null)
  /** 是否有追问权限（买过任意付费内容）；null=尚未取到，先不渲染 */
  const [allowed, setAllowed] = useState<boolean | null>(null)
  /** 服务端下发的额度开关（GET /api/ask 返回）：只有开启时才在 0 次时引导购买 */
  const [enforced, setEnforced] = useState(false)
  const [error, setError] = useState('')
  const [exhausted, setExhausted] = useState(false)
  const listRef = useRef<HTMLDivElement>(null)

  // 挂载时取剩余次数（服务端权威值；取不到则不显示，不影响提问）
  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const supabase = getSupabase()
        const { data: { session } } = await supabase.auth.getSession()
        if (!session) {
          if (!cancelled) setAllowed(false)
          return
        }
        const res = await fetch(`/api/ask?token=${encodeURIComponent(session.access_token)}`)
        if (!res.ok) return
        const data = await res.json().catch(() => null)
        if (!cancelled && typeof data?.remaining === 'number') setRemaining(data.remaining)
        if (!cancelled && typeof data?.memberRemaining === 'number') setMemberRemaining(data.memberRemaining)
        if (!cancelled && typeof data?.reportRemaining === 'number') setReportRemaining(data.reportRemaining)
        if (!cancelled && data?.enforced === true) setEnforced(true)
        // ★ 只有明确 allowed=true 才渲染；未买过任何付费内容 → 面板整体不出现
        if (!cancelled && typeof data?.allowed === 'boolean') setAllowed(data.allowed)
      } catch {
        // 忽略：仅影响剩余次数的展示
      }
    })()
    return () => { cancelled = true }
  }, [])

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: 'smooth' })
  }, [messages, sending])

  const send = async () => {
    const q = input.trim()
    if (!q || sending) return
    setError('')
    setMessages((m) => [...m, { role: 'user', text: q }])
    setInput('')
    setSending(true)
    try {
      const supabase = getSupabase()
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        setError('登录状态已失效，请重新登录。')
        setSending(false)
        return
      }
      const res = await fetch('/api/ask', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: session.access_token, chartId: chartId ?? undefined, chart, question: q }),
      })
      const data = await res.json().catch(() => null)
      if (!res.ok) {
        if (data?.code === 'ASK_QUOTA_EXHAUSTED') {
          setExhausted(true)
          if (typeof data?.remaining === 'number') setRemaining(data.remaining)
          setError(data?.error ?? '追问次数已用完')
        } else if (data?.code === 'ASK_REQUIRES_PAID') {
          // 权限已失效（退款/订阅过期）——直接收起面板
          setAllowed(false)
          setError(data?.error ?? '追问需先购买任一报告或开通会员')
        } else {
          setError(data?.error ?? '追问失败，请稍后再试')
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
      if (typeof data?.remaining === 'number' && data.remaining <= 0) setExhausted(true)
    } catch (e) {
      setError(e instanceof Error ? e.message : '网络异常，请稍后再试')
    }
    setSending(false)
  }

  const askPrice = formatPriceUSD(SKUS.ask_pack.priceUSD)
  // ★ 额度耗尽判定（2026-10-21 修复）：原先只有收到 402 后才置 exhausted，
  //   导致「从没买过 → 剩余 0」的新用户看不到任何购买入口（只能盲点追问换一句 402 文案）。
  //   enforced 来自服务端（与 POST 里 `ENTITLEMENT_ENFORCE && remaining <= 0` 同一口径）：
  //   内测期不催买，正式收费时剩余为 0 就直接给购买按钮。
  const quotaOut = enforced && (exhausted || (remaining !== null && remaining <= 0))

  // ★ 追问与付费内容绑定：未买过任何付费内容（或未登录）→ 整体不渲染
  if (allowed !== true) return null

  return (
    <div className="hw-c-box" style={{ marginTop: 20 }}>
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <h3 className="hw-c-secTitle" style={{ margin: 0 }}>追问命理师</h3>
        {remaining !== null && (
          <span className="text-xs text-ink-light/70">
            剩余追问次数：<b className="text-ink">{remaining}</b>
            {memberRemaining !== null && memberRemaining > 0 && (
              <>（含会员本月 <b className="text-ink">{memberRemaining}</b> 次）</>
            )}
            {reportRemaining !== null && reportRemaining > 0 && (
              <>（含报告赠送 <b className="text-ink">{reportRemaining}</b> 次）</>
            )}
          </span>
        )}
      </div>
      <p className="text-xs text-ink-light/60 mt-2 mb-3">
        就你的命盘追问具体问题（如「今年事业上有哪些需要留意的地方」）。购买任一报告或开通会员后即可使用；
        每份报告赠 {ASK_PER_REPORT} 次、会员每月 {MEMBER_ASK_PER_MONTH} 次。涉医疗、法律、投资、生死与重大取舍的
        「该不该」类问题，命理不作判决——只讲倾向，供你自行权衡。
      </p>

      {/* 对话区 */}
      {messages.length > 0 && (
        <div ref={listRef} className="max-h-96 overflow-y-auto space-y-3 mb-3 rounded-2xl bg-paper-dark/20 p-3">
          {messages.map((m, i) => (
            <div key={i} className={m.role === 'user' ? 'flex justify-end' : 'flex justify-start'}>
              <div
                className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm leading-relaxed whitespace-pre-wrap ${
                  m.role === 'user'
                    ? 'bg-[#3a66ff] text-white'
                    : m.refused
                      ? 'bg-gold/5 border border-gold/20 text-ink/80'
                      : 'bg-white border border-[#dedcf0] text-ink/80'
                }`}
              >
                {m.refused && (
                  <div className="text-xs font-semibold text-amber-600 mb-1">此类问题不以命理作判决</div>
                )}
                {m.text}
                {m.disclaimer && (
                  <div className="text-[11px] text-ink-light/50 mt-2 pt-2 border-t border-black/5">{m.disclaimer}</div>
                )}
              </div>
            </div>
          ))}
          {sending && (
            <div className="flex justify-start">
              <div className="rounded-2xl px-3 py-2 text-sm bg-white border border-[#dedcf0] text-ink-light/60">
                命理师正在作答…
              </div>
            </div>
          )}
        </div>
      )}

      {error && <p className="text-xs text-red-600 mb-2">{error}</p>}

      {/* 额度耗尽：购买入口（未登记 productId 时 CheckoutButton 显示「即将推出」） */}
      {quotaOut && (
        <div className="mb-3 rounded-2xl bg-gold/5 border border-gold/20 p-3">
          <p className="text-sm text-ink/80 mb-2">
            追问次数已用完。可购买追问包（{SKUS.ask_pack.desc} · {askPrice}）继续提问。
          </p>
          <CheckoutButton
            sku="ask_pack"
            available={waffoProductId('ask_pack') !== null}
            requireChart={false}
            returnTo="/chart"
          >
            购买追问包 · {askPrice}
          </CheckoutButton>
        </div>
      )}

      {/* 输入区（额度耗尽时禁用，避免每次点击都白跑一趟 402） */}
      <div className="flex gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') send() }}
          placeholder={quotaOut ? '追问次数已用完，购买追问包后可继续' : '输入你的问题…'}
          maxLength={300}
          disabled={quotaOut}
          className="flex-1 rounded-full border border-[#dedcf0] px-4 py-2 text-sm outline-none focus:border-[#3a66ff] disabled:bg-paper-dark/30 disabled:cursor-not-allowed"
        />
        <button
          type="button"
          onClick={send}
          disabled={sending || quotaOut || !input.trim()}
          className="shrink-0 rounded-full bg-ink text-white px-5 py-2 text-sm font-semibold transition hover:brightness-110 disabled:opacity-60"
        >
          {sending ? '追问中…' : '追问'}
        </button>
      </div>
    </div>
  )
}
