// 认领邮件文案与 HTML（阶段 D，2026-11-17）
//
// 只放纯函数：不读环境变量、不连数据库，验收脚本可直接 import 断言三语齐全。
// ★ 繁体逐字写死，不走 toHant（邮件里的用词/标点必须人工可读）。

export type ClaimLocale = 'zh-Hans' | 'zh-Hant' | 'en'

export interface ClaimEmailInput {
  locale: ClaimLocale
  /** 一键登录并回到认领页（自有域名 callback + token_hash） */
  magicUrl: string
  /** 认领页本身的纯文本备用地址（需要先登录） */
  claimUrl: string
  /** 业务单号 MCG-… */
  ref: string
  /** 报告标题（生成时已定稿，可能含书名号） */
  title: string
}

const SUPPORT = 'hello@mingcharts.com'

function esc(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

export const CLAIM_SUBJECTS: Record<ClaimLocale, (title: string) => string> = {
  'zh-Hans': (t) => `你的命书已生成 · 领取（${t}）`,
  'zh-Hant': (t) => `你的命書已生成 · 領取（${t}）`,
  en: () => 'Your Fate Book is ready — claim it',
}

export const CLAIM_BODY: Record<
  ClaimLocale,
  { intro: string; cta: string; note: string; refLabel: string; fallback: string; ignore: string; sign: string }
> = {
  'zh-Hans': {
    intro: '你购买的命书《{title}》已经生成。点击下面的按钮登录，报告会自动归入你的账号。',
    cta: '领取我的命书',
    note: '领取链接 30 天内有效，只能用买家邮箱登录后领取。',
    refLabel: '业务单号：',
    fallback: '按钮无法点击时，请复制这个地址到浏览器打开：',
    ignore: '如果这不是你本人的购买，请忽略本邮件。',
    sign: '—— MingCharts 命理',
  },
  'zh-Hant': {
    intro: '你購買的命書《{title}》已經生成。點擊下面的按鈕登入，報告會自動歸入你的帳號。',
    cta: '領取我的命書',
    note: '領取連結 30 天內有效，只能用買家郵箱登入後領取。',
    refLabel: '業務單號：',
    fallback: '按鈕無法點擊時，請複製這個地址到瀏覽器打開：',
    ignore: '如果這不是你本人的購買，請忽略本郵件。',
    sign: '—— MingCharts 命理',
  },
  en: {
    intro: 'Your Fate Book “{title}” is ready. Tap the button below to sign in; the report will be added to your account automatically.',
    cta: 'Claim my Fate Book',
    note: 'This link is valid for 30 days and can only be claimed while signed in with the buyer email.',
    refLabel: 'Order reference: ',
    fallback: 'If the button does not work, copy this address into your browser:',
    ignore: 'If you did not make this purchase, please ignore this email.',
    sign: '— MingCharts',
  },
}

export function buildClaimEmail(input: ClaimEmailInput): { subject: string; html: string; text: string } {
  const { locale, magicUrl, claimUrl, ref, title } = input
  const subject = CLAIM_SUBJECTS[locale](title)
  const body = CLAIM_BODY[locale]
  const intro = body.intro.replace('{title}', title)

  const text = [
    intro,
    '',
    `${body.cta}: ${magicUrl}`,
    '',
    body.note,
    `${body.refLabel}${ref}`,
    '',
    body.fallback,
    claimUrl,
    '',
    body.ignore,
    body.sign,
    `support: ${SUPPORT}`,
  ].join('\n')

  const html = `<!doctype html>
<html lang="${locale}">
<body style="margin:0;padding:24px;background:#f6f1e7;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;color:#2b2118;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;margin:0 auto;background:#fffdf8;border:1px solid #e6dcc8;border-radius:12px;">
    <tr><td style="padding:28px 28px 8px 28px;">
      <h1 style="margin:0 0 12px 0;font-size:20px;line-height:1.4;">${esc(subject)}</h1>
      <p style="margin:0 0 18px 0;font-size:15px;line-height:1.7;">${esc(intro)}</p>
      <p style="margin:0 0 22px 0;">
        <a href="${esc(magicUrl)}" style="display:inline-block;background:#b45309;color:#ffffff;text-decoration:none;font-weight:600;font-size:15px;padding:12px 22px;border-radius:999px;">${esc(body.cta)}</a>
      </p>
      <p style="margin:0 0 6px 0;font-size:13px;line-height:1.6;color:#6b5b4a;">${esc(body.note)}</p>
      <p style="margin:0 0 18px 0;font-size:13px;line-height:1.6;color:#6b5b4a;">${esc(body.refLabel)}<span style="font-family:ui-monospace,Menlo,monospace;">${esc(ref)}</span></p>
      <hr style="border:none;border-top:1px solid #eee3d0;margin:0 0 16px 0;" />
      <p style="margin:0 0 6px 0;font-size:12px;line-height:1.6;color:#8a7a68;">${esc(body.fallback)}</p>
      <p style="margin:0 0 16px 0;font-size:12px;line-height:1.6;word-break:break-all;"><a href="${esc(claimUrl)}" style="color:#8a5a20;">${esc(claimUrl)}</a></p>
      <p style="margin:0 0 6px 0;font-size:12px;line-height:1.6;color:#8a7a68;">${esc(body.ignore)}</p>
      <p style="margin:0;font-size:12px;line-height:1.6;color:#8a7a68;">${esc(body.sign)} · <a href="mailto:${SUPPORT}" style="color:#8a5a20;">${SUPPORT}</a></p>
    </td></tr>
  </table>
</body>
</html>`

  return { subject, html, text }
}
