'use client'

// 人机验证失败提示（三语）——2026-11-05 线上误报修复
// 旧版把所有 error-callback 都解释成「浏览器广告拦截」，真实原因可能是挑战请求被网络阻断、
// 域名/sitekey 不匹配、Cloudflare 临时错误等。这里按失败类型给出不同指引，并把 Cloudflare
// 错误码原样带出（便于用户反馈、便于排查），重试入口保持不变。
import type { SiteLang } from '@/lib/lang'
import type { TurnstileFailure } from '@/components/Turnstile'

const COPY: Record<SiteLang, {
  load: string
  timeout: string
  challenge: (code?: string) => string
  retry: string
}> = {
  'zh-Hans': {
    load: '人机验证加载失败：验证脚本被浏览器或网络拦截。请先用无痕窗口打开本页重试（Chrome：Ctrl+Shift+N），多数情况立刻可用；仍失败再关闭广告拦截／隐私／下载嗅探类插件，或更换浏览器后点「重试验证」。',
    timeout: '人机验证加载超时：与 Cloudflare 的连接可能被网络或插件阻断。请先点「重试验证」；仍失败请用无痕窗口重试，或更换网络。',
    challenge: (code) => `人机验证未完成${code ? `（错误码 ${code}）` : ''}：请点「重试验证」重新验证；若反复失败，请更换网络或浏览器后再试。`,
    retry: '重试验证',
  },
  'zh-Hant': {
    load: '人機驗證載入失敗：驗證腳本被瀏覽器或網路攔截。請先用無痕視窗開啟本頁重試（Chrome：Ctrl+Shift+N），多數情況立即可用；仍失敗再關閉廣告阻擋／隱私／下載嗅探類外掛，或更換瀏覽器後點「重試驗證」。',
    timeout: '人機驗證載入逾時：與 Cloudflare 的連線可能被網路或外掛阻斷。請先點「重試驗證」；仍失敗請用無痕視窗重試，或更換網路。',
    challenge: (code) => `人機驗證未完成${code ? `（錯誤碼 ${code}）` : ''}：請點「重試驗證」重新驗證；若反覆失敗，請更換網路或瀏覽器後再試。`,
    retry: '重試驗證',
  },
  en: {
    load: 'Verification failed to load: the challenge script was blocked by your browser or network. First, open this page in a private/incognito window and retry (Chrome: Ctrl+Shift+N) - that fixes most cases. If it still fails, turn off ad blockers, privacy or download-sniffer extensions, or try another browser, then tap Retry.',
    timeout: 'Verification timed out: the connection to Cloudflare may be blocked by your network or an extension. Tap Retry first; if it keeps failing, try a private/incognito window or another network.',
    challenge: (code) => `Verification didn't complete${code ? ` (error ${code})` : ''}. Tap Retry to run it again. If it keeps failing, switch networks or browsers.`,
    retry: 'Retry',
  },
}

export default function TurnstileNotice({
  error,
  onRetry,
  locale = 'zh-Hans',
}: {
  error: TurnstileFailure | null
  onRetry: () => void
  locale?: SiteLang
}) {
  if (!error) return null
  const c = COPY[locale]
  const text = error.kind === 'challenge' ? c.challenge(error.code) : c[error.kind]
  return (
    <div className="mx-auto max-w-[440px] rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-center">
      <p className="text-sm font-bold leading-relaxed text-red-600">{text}</p>
      <button
        type="button"
        onClick={onRetry}
        className="mt-1.5 text-sm font-bold text-red-700 underline underline-offset-2 hover:brightness-110"
      >
        {c.retry}
      </button>
    </div>
  )
}
