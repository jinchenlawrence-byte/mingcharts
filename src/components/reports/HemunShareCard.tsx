import Link from 'next/link'
import { localize } from '@/lib/hant'
import type { SiteLang } from '@/lib/lang'
import { pathForLang } from '@/lib/lang'
import { branchRelation, ganRelation, shareRows, type HemunSharePayload } from '@/lib/hemunShare'

/** 分享卡：只呈现三项标签，三柱模式不出现任何「未计算」项 */
export default function HemunShareCard({ payload, locale }: { payload: HemunSharePayload; locale: SiteLang }) {
  const L = (s: string) => localize(s, locale)
  const rows = shareRows(payload)
  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-gold/25 bg-white px-5 py-6">
        <div className="flex items-center justify-between mb-4">
          <span className="text-xs tracking-widest text-ink-light">{L('合婚分享卡')}</span>
          <span className="text-xs text-ink-light">{L(payload.m === '3' ? '三柱合婚摘要' : '四柱合婚摘要')}</span>
        </div>
        <div className="space-y-3">
          {[
            { k: '夫妻宫', v: rows.spouse },
            { k: '双方日干', v: rows.gan },
            { k: '配偶星', v: rows.star },
          ].map(r => (
            <div key={r.k} className="flex items-baseline gap-3 border-b border-gold/10 pb-2.5 last:border-0 last:pb-0">
              <span className="text-sm text-ink-light w-20 shrink-0">{L(r.k)}</span>
              <span className="text-[17px] text-ink font-medium">{L(r.v)}</span>
            </div>
          ))}
        </div>
      </div>

      <p className="text-xs text-ink-light text-center">
        {L('本卡只含日支与日主，不含出生信息。')}
      </p>

      <div className="text-center">
        <Link href={pathForLang('/hemun', locale)} className="text-sm underline underline-offset-4">
          {L('看自己的合婚 ›')}
        </Link>
      </div>
    </div>
  )
}
