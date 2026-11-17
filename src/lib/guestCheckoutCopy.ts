// 游客结账三语文案（阶段 B，2026-11-17）
//
// 为什么单独成文件：入口组件与成功页共用同一份文案，且验收脚本要能在 Node 里
// 直接断言「三种语言一份不缺、占位符一致」——放在客户端组件里就没法在脚本中断言。
// ★ 繁体逐字写死，不靠 toHant 运行时转换（避免术语/标点被误转）。

export type GuestLocale = 'zh-Hans' | 'zh-Hant' | 'en'

export interface GuestEntryCopy {
  toggle: string
  title: string
  desc: string
  emailLabel: string
  emailPlaceholder: string
  pay: string
  note: string
  errEmail: string
  errChart: string
  errNetwork: string
  unavailable: string
}

export const GUEST_ENTRY_COPY: Record<GuestLocale, GuestEntryCopy> = {
  'zh-Hans': {
    toggle: '没有账号？先付款，凭邮箱领取命书',
    title: '先付款 · 后注册',
    desc: '无需注册即可购买。付款成功后命书立即开始生成，凭这个邮箱领取，系统会自动把报告放进你的账号（认领窗口 30 天）。',
    emailLabel: '接收报告与领取链接的邮箱',
    emailPlaceholder: 'you@example.com',
    pay: '前往支付',
    note: '收据与领取邮件都会发到这个邮箱；不需要现在设置密码。',
    errEmail: '请输入有效的邮箱地址',
    errChart: '没有找到你刚排的命盘，请先完成排盘再回来购买',
    errNetwork: '网络异常，请稍后再试',
    unavailable: '该商品尚未开放购买',
  },
  'zh-Hant': {
    toggle: '沒有帳號？先付款，憑郵箱領取命書',
    title: '先付款 · 後註冊',
    desc: '無需註冊即可購買。付款成功後命書立即開始生成，憑這個郵箱領取，系統會自動把報告放進你的帳號（認領窗口 30 天）。',
    emailLabel: '接收報告與領取連結的郵箱',
    emailPlaceholder: 'you@example.com',
    pay: '前往支付',
    note: '收據與領取郵件都會寄到這個郵箱；不需要現在設定密碼。',
    errEmail: '請輸入有效的郵箱地址',
    errChart: '沒有找到你剛排的命盤，請先完成排盤再回來購買',
    errNetwork: '網絡異常，請稍後再試',
    unavailable: '該商品尚未開放購買',
  },
  en: {
    toggle: 'No account? Pay first, claim with your email',
    title: 'Pay first · Register later',
    desc: 'Buy without an account. The Fate Book starts generating right after payment; claim it with this email and it is added to your account automatically (30-day claim window).',
    emailLabel: 'Email for the report and claim link',
    emailPlaceholder: 'you@example.com',
    pay: 'Continue to payment',
    note: 'Your receipt and claim email go to this address. No password needed now.',
    errEmail: 'Please enter a valid email address',
    errChart: 'We could not find your chart. Cast a chart first, then come back.',
    errNetwork: 'Network error. Please try again.',
    unavailable: 'This product is not available yet.',
  },
}

export type GuestPhase =
  | 'guest_checking'
  | 'guest_pending'
  | 'guest_working'
  | 'guest_ready'
  | 'guest_failed'
  | 'guest_refunded'
  | 'guest_expired'
  | 'guest_claimed'
  | 'guest_notfound'

export interface GuestSuccessCopy {
  phases: Record<GuestPhase, { title: string; body: string }>
  refresh: string
  home: string
  reports: string
  ref: string
}

export const GUEST_SUCCESS_COPY: Record<GuestLocale, GuestSuccessCopy> = {
  'zh-Hans': {
    phases: {
      guest_checking: { title: '正在确认你的支付状态', body: '支付渠道的通知可能需要几秒钟，请勿关闭此页面。' },
      guest_pending: { title: '尚未收到付款确认', body: '如果你刚完成付款，通常几秒内就会确认。可以点「刷新状态」，或稍后用业务单号联系客服。' },
      guest_working: { title: '付款已确认，命书正在生成', body: '十卷精批通常需要 1–3 分钟。可以关闭本页，稍后凭业务单号回来查看；领取邮件会发到 {email}。' },
      guest_ready: { title: '命书已生成', body: '领取邮件将发送到 {email}（认领窗口 30 天）。若 10 分钟内未收到，请联系 hello@mingcharts.com 并附业务单号。' },
      guest_failed: { title: '命书生成失败', body: '已记录该错误，我们会尽快补发或退款。请用业务单号联系 hello@mingcharts.com。' },
      guest_refunded: { title: '该订单已退款', body: '款项已原路退回。如仍想购买，可回到命盘页重新下单。' },
      guest_expired: { title: '该订单已关闭', body: '长时间未支付或未认领，订单已关闭。可重新下单。' },
      guest_claimed: { title: '命书已在你的账号中', body: '这份报告已绑定到你的账号，可在「我的报告」中查看。' },
      guest_notfound: { title: '未找到这笔订单', body: '请确认链接完整；也可联系 hello@mingcharts.com 并附业务单号。' },
    },
    refresh: '刷新状态',
    home: '返回首页',
    reports: '我的报告',
    ref: '业务单号：',
  },
  'zh-Hant': {
    phases: {
      guest_checking: { title: '正在確認你的支付狀態', body: '支付渠道的通知可能需要幾秒鐘，請勿關閉此頁面。' },
      guest_pending: { title: '尚未收到付款確認', body: '如果你剛完成付款，通常幾秒內就會確認。可以點「刷新狀態」，或稍後用業務單號聯繫客服。' },
      guest_working: { title: '付款已確認，命書正在生成', body: '十卷精批通常需要 1–3 分鐘。可以關閉本頁，稍後憑業務單號回來查看；領取郵件會寄到 {email}。' },
      guest_ready: { title: '命書已生成', body: '領取郵件將寄到 {email}（認領窗口 30 天）。若 10 分鐘內未收到，請聯繫 hello@mingcharts.com 並附業務單號。' },
      guest_failed: { title: '命書生成失敗', body: '已記錄該錯誤，我們會儘快補發或退款。請用業務單號聯繫 hello@mingcharts.com。' },
      guest_refunded: { title: '該訂單已退款', body: '款項已原路退回。如仍想購買，可回到命盤頁重新下單。' },
      guest_expired: { title: '該訂單已關閉', body: '長時間未支付或未認領，訂單已關閉。可重新下單。' },
      guest_claimed: { title: '命書已在你的帳號中', body: '這份報告已綁定到你的帳號，可在「我的報告」中查看。' },
      guest_notfound: { title: '未找到這筆訂單', body: '請確認連結完整；也可聯繫 hello@mingcharts.com 並附業務單號。' },
    },
    refresh: '刷新狀態',
    home: '返回首頁',
    reports: '我的報告',
    ref: '業務單號：',
  },
  en: {
    phases: {
      guest_checking: { title: 'Confirming your payment', body: 'The payment provider may take a few seconds to notify us. Please keep this page open.' },
      guest_pending: { title: 'Payment not confirmed yet', body: 'If you have just paid, confirmation usually arrives within seconds. Tap "Refresh status", or contact support with your order reference.' },
      guest_working: { title: 'Payment confirmed — your Fate Book is being written', body: 'The ten volumes usually take 1–3 minutes. You can close this page and come back with your order reference; the claim email goes to {email}.' },
      guest_ready: { title: 'Your Fate Book is ready', body: 'The claim email will be sent to {email} (30-day claim window). If it has not arrived in 10 minutes, contact hello@mingcharts.com with your order reference.' },
      guest_failed: { title: 'Generation failed', body: 'We have logged the error and will resend or refund shortly. Please contact hello@mingcharts.com with your order reference.' },
      guest_refunded: { title: 'This order was refunded', body: 'The payment has been returned to your original method. You can order again from the chart page.' },
      guest_expired: { title: 'This order is closed', body: 'It was left unpaid or unclaimed for too long. You can order again.' },
      guest_claimed: { title: 'Your Fate Book is in your account', body: 'This report is now linked to your account. Open "My reports" to read it.' },
      guest_notfound: { title: 'Order not found', body: 'Please check that the link is complete, or contact hello@mingcharts.com with your order reference.' },
    },
    refresh: 'Refresh status',
    home: 'Back to home',
    reports: 'My reports',
    ref: 'Order reference: ',
  },
}
