'use client'

// 伙伴申请表单（命理师白标 v1）
// 无验证码：靠服务端限流（APPLY_RULES）+ 蜜罐字段兜底 —— 这类表单不值得为它引入 Turnstile。
import { useState } from 'react'

const CONTACT_KINDS = [
  { v: 'line', label: 'LINE' },
  { v: 'wechat', label: 'WeChat' },
  { v: 'email', label: 'Email' },
  { v: 'ig', label: 'Instagram' },
  { v: 'other', label: '其他' },
]

const VOLUMES = ['<10', '10-30', '30-100', '100+']

export default function PartnerApplyForm({ hant = false }: { hant?: boolean }) {
  const t = (s: string, h: string) => (hant ? h : s)

  const [form, setForm] = useState({
    name: '', contactKind: 'line', contact: '', channel: '', volume: '10-30', region: '', note: '',
  })
  const [company, setCompany] = useState('') // 蜜罐：真人看不见
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null)

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }))

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setBusy(true)
    setMsg(null)
    try {
      const res = await fetch('/api/partner/apply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, company }),
      })
      const json = await res.json().catch(() => ({}))
      if (res.ok && json.ok) {
        setMsg({ kind: 'ok', text: t('已收到，我们会在 48 小时内联系你。', '已收到，我們會在 48 小時內聯絡你。') })
        setForm({ name: '', contactKind: 'line', contact: '', channel: '', volume: '10-30', region: '', note: '' })
      } else {
        setMsg({ kind: 'err', text: json.error || t('提交失败，请稍后重试', '提交失敗，請稍後重試') })
      }
    } catch {
      setMsg({ kind: 'err', text: t('网络异常，请稍后重试', '網路異常，請稍後重試') })
    } finally {
      setBusy(false)
    }
  }

  return (
    <form onSubmit={submit} className="hw-c-box">
      <h2 className="hw-c-secTitle">{t('申请合作', '申請合作')}</h2>
      <p className="text-sm text-ink-light mb-4">
        {t('只问能联系上你的信息，不会要证件或税号。', '只問能聯絡上你的資訊，不會要證件或稅號。')}
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
        <label className="block">
          <span className="text-ink-light/70">{t('称呼', '稱呼')} *</span>
          <input value={form.name} onChange={set('name')} maxLength={40} required
            className="mt-1 w-full border border-gold/20 rounded px-3 py-2 bg-white" />
        </label>

        <label className="block">
          <span className="text-ink-light/70">{t('联系方式类型', '聯絡方式類型')} *</span>
          <select value={form.contactKind} onChange={set('contactKind')}
            className="mt-1 w-full border border-gold/20 rounded px-3 py-2 bg-white">
            {CONTACT_KINDS.map((k) => (
              <option key={k.v} value={k.v}>{k.label}</option>
            ))}
          </select>
        </label>

        <label className="block">
          <span className="text-ink-light/70">{t('联系方式', '聯絡方式')} *</span>
          <input value={form.contact} onChange={set('contact')} maxLength={120} required
            placeholder={form.contactKind === 'email' ? 'you@example.com' : t('ID 或号码', 'ID 或號碼')}
            className="mt-1 w-full border border-gold/20 rounded px-3 py-2 bg-white" />
        </label>

        <label className="block">
          <span className="text-ink-light/70">{t('平台 / 账号（选填）', '平台／帳號（選填）')}</span>
          <input value={form.channel} onChange={set('channel')} maxLength={120}
            placeholder="IG @xxx / 小紅書 / YouTube"
            className="mt-1 w-full border border-gold/20 rounded px-3 py-2 bg-white" />
        </label>

        <label className="block">
          <span className="text-ink-light/70">{t('每月接单量', '每月接單量')} *</span>
          <select value={form.volume} onChange={set('volume')}
            className="mt-1 w-full border border-gold/20 rounded px-3 py-2 bg-white">
            {VOLUMES.map((v) => (
              <option key={v} value={v}>{v} {t('份', '份')}</option>
            ))}
          </select>
        </label>

        <label className="block">
          <span className="text-ink-light/70">{t('客群地区（选填）', '客群地區（選填）')}</span>
          <input value={form.region} onChange={set('region')} maxLength={40}
            placeholder={t('台湾 / 香港 / 马来西亚 / 北美…', '台灣／香港／馬來西亞／北美…')}
            className="mt-1 w-full border border-gold/20 rounded px-3 py-2 bg-white" />
        </label>
      </div>

      {/* 蜜罐：绝对定位移出视口，真人看不到、不会填；机器人会填满所有 input */}
      <div aria-hidden="true" style={{ position: 'absolute', left: '-9999px', top: 0, height: 0, overflow: 'hidden' }}>
        <label>
          company
          <input tabIndex={-1} autoComplete="off" value={company} onChange={(e) => setCompany(e.target.value)} />
        </label>
      </div>

      <label className="block mt-3 text-sm">
        <span className="text-ink-light/70">{t('想说的话（选填）', '想說的話（選填）')}</span>
        <textarea value={form.note} onChange={set('note')} maxLength={1000} rows={3}
          className="mt-1 w-full border border-gold/20 rounded px-3 py-2 bg-white"
          placeholder={t('你的客群、主要看哪些品类、现在怎么交付…', '你的客群、主要看哪些品類、現在怎麼交付…')} />
      </label>

      <div className="flex items-center gap-3 mt-4">
        <button type="submit" disabled={busy} className="hw-c-btnBig cursor-pointer disabled:opacity-60">
          {busy ? t('提交中…', '提交中…') : t('提交申请', '提交申請')}
        </button>
        <span className="text-xs text-ink-light/50">
          {t('或邮件 hello@mingcharts.com', '或郵件 hello@mingcharts.com')}
        </span>
      </div>

      {msg && (
        <p className={`mt-3 text-sm ${msg.kind === 'ok' ? 'text-green-700' : 'text-red-600'}`}>{msg.text}</p>
      )}
    </form>
  )
}
