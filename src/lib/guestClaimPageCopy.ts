// 认领页三语文案（先付款后注册 · 阶段 D，2026-11-17）
//
// 与 guestClaimCopy（邮件）分开：邮件正文与页面措辞不同，且验收脚本分别断言。
// ★ 繁体逐字写死，不靠 toHant 运行时转换。

export type ClaimPageLocale = 'zh-Hans' | 'zh-Hant' | 'en'

export type ClaimErrorCode =
  | 'invalid'
  | 'not_found'
  | 'revoked'
  | 'expired'
  | 'email_mismatch'
  | 'already_claimed'
  | 'not_ready'
  | 'network'
  | 'server'

export interface ClaimPageCopy {
  title: string
  intro: string
  checking: string
  loginTitle: string
  loginBody: string
  loginCta: string
  claiming: string
  successTitle: string
  successBody: string
  passwordHint: string
  passwordCta: string
  openReport: string
  reports: string
  home: string
  switchAccount: string
  errors: Record<ClaimErrorCode, string>
}

export const CLAIM_PAGE_COPY: Record<ClaimPageLocale, ClaimPageCopy> = {
  'zh-Hans': {
    title: '领取你的命书',
    intro: '这份命书已付款完成。登录后会自动归入你的账号，无需再做什么。',
    checking: '正在确认登录状态…',
    loginTitle: '请先登录',
    loginBody: '请用购买时填写的邮箱登录（或注册）后领取。报告只会归入这个邮箱的账号。',
    loginCta: '登录并领取',
    claiming: '正在把报告归入你的账号…',
    successTitle: '领取成功',
    successBody: '命书已经放进你的账号，可以随时打开阅读。',
    passwordHint:
      '账号已用此邮箱创建，目前为免密登录（邮件链接登录），不是没有账号。想设置密码方便下次直接登录：',
    passwordCta: '设置密码',
    openReport: '打开命书',
    reports: '我的报告',
    home: '返回首页',
    switchAccount: '退出并切换账号',
    errors: {
      invalid: '领取链接格式不正确，请回到邮件里重新点击按钮。',
      not_found: '没有找到这份命书。请确认链接完整，或联系 hello@mingcharts.com。',
      revoked: '这个领取链接已经失效（报告可能已被领取或订单退款）。可到「我的报告」查看，或联系我们。',
      expired: '领取链接已过期。请联系 hello@mingcharts.com，我们会为购买邮箱重新发送。',
      email_mismatch: '当前登录的邮箱与购买时填写的邮箱不一致。请用购买时的邮箱登录后再领取。',
      already_claimed: '这份命书已被其他账号领取。如有疑问请联系 hello@mingcharts.com。',
      not_ready: '命书还在生成中，请稍后再打开这个链接。',
      network: '网络异常，请稍后刷新重试。',
      server: '服务暂时不可用，请稍后重试。',
    },
  },
  'zh-Hant': {
    title: '領取你的命書',
    intro: '這份命書已付款完成。登入後會自動歸入你的帳號，無需再做什麼。',
    checking: '正在確認登入狀態…',
    loginTitle: '請先登入',
    loginBody: '請用購買時填寫的郵箱登入（或註冊）後領取。報告只會歸入這個郵箱的帳號。',
    loginCta: '登入並領取',
    claiming: '正在把報告歸入你的帳號…',
    successTitle: '領取成功',
    successBody: '命書已經放進你的帳號，可以隨時打開閱讀。',
    passwordHint:
      '帳號已用此郵箱建立，目前為免密登入（郵件連結登入），不是沒有帳號。想設定密碼方便下次直接登入：',
    passwordCta: '設定密碼',
    openReport: '打開命書',
    reports: '我的報告',
    home: '返回首頁',
    switchAccount: '登出並切換帳號',
    errors: {
      invalid: '領取連結格式不正確，請回到郵件裡重新點擊按鈕。',
      not_found: '沒有找到這份命書。請確認連結完整，或聯繫 hello@mingcharts.com。',
      revoked: '這個領取連結已經失效（報告可能已被領取或訂單退款）。可到「我的報告」查看，或聯繫我們。',
      expired: '領取連結已過期。請聯繫 hello@mingcharts.com，我們會為購買郵箱重新發送。',
      email_mismatch: '目前登入的郵箱與購買時填寫的郵箱不一致。請用購買時的郵箱登入後再領取。',
      already_claimed: '這份命書已被其他帳號領取。如有疑問請聯繫 hello@mingcharts.com。',
      not_ready: '命書還在生成中，請稍後再打開這個連結。',
      network: '網絡異常，請稍後重新整理重試。',
      server: '服務暫時不可用，請稍後重試。',
    },
  },
  en: {
    title: 'Claim your Fate Book',
    intro: 'This Fate Book is already paid for. Sign in and it will be added to your account automatically.',
    checking: 'Checking your sign-in status…',
    loginTitle: 'Sign in to claim',
    loginBody:
      'Sign in (or create an account) with the email you used at checkout. The report can only be added to that email’s account.',
    loginCta: 'Sign in and claim',
    claiming: 'Adding the report to your account…',
    successTitle: 'Claimed',
    successBody: 'Your Fate Book is now in your account and ready to read.',
    passwordHint:
      'Your account was created with this email and currently uses passwordless sign-in (email link) — the account exists. To set a password for faster sign-in next time:',
    passwordCta: 'Set a password',
    openReport: 'Open the Fate Book',
    reports: 'My reports',
    home: 'Back to home',
    switchAccount: 'Sign out and switch account',
    errors: {
      invalid: 'This claim link is malformed. Please go back to the email and tap the button again.',
      not_found: 'We could not find this Fate Book. Check that the link is complete, or contact hello@mingcharts.com.',
      revoked: 'This claim link is no longer valid (it may have been claimed already, or the order was refunded). Check “My reports”, or contact us.',
      expired: 'This claim link has expired. Contact hello@mingcharts.com and we will resend it to the buyer email.',
      email_mismatch: 'You are signed in with a different email than the one used at checkout. Sign in with the buyer email to claim.',
      already_claimed: 'This Fate Book has already been claimed by another account. Contact hello@mingcharts.com if you need help.',
      not_ready: 'The Fate Book is still being written. Please open this link again later.',
      network: 'Network error. Please refresh and try again.',
      server: 'The service is temporarily unavailable. Please try again later.',
    },
  },
}

/** 错误码 → 页面语言；未知码按 server 处理，绝不把英文错误码甩给用户 */
export function claimErrorText(locale: ClaimPageLocale, code: string | null | undefined): string {
  const known = code && code in CLAIM_PAGE_COPY[locale].errors ? (code as ClaimErrorCode) : 'server'
  return CLAIM_PAGE_COPY[locale].errors[known]
}
