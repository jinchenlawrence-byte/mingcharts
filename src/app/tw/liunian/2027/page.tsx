import type { Metadata } from 'next'
import Link from 'next/link'
import TaisuiTable, { TaisuiLegend } from '@/components/TaisuiTable'
import { hantAlternates } from '@/lib/hant-seo'
import { toHant } from '@/lib/hant'
import { SHENGXIAO, getLiunian, getYearGanZhi } from '@/lib/shengxiaoData'

// 繁體版 2027 丁未年落地頁（第 35 輪）：與 /liunian/2027 同構。
// 關係詞與生肖名一律 toHant 派生（不寫第二份詞表）；靜態文案按台灣用詞直接寫繁體。
// ★ 日期邊界兩個都要說：民俗以春節 2 月 6 日為界，命理年柱以立春 2 月 4 日為界。

const YEAR = 2027

export const metadata: Metadata = {
  title: `2027 ${getYearGanZhi(YEAR)}年運勢總覽：羊值、牛沖、鼠害、狗刑怎麼看`,
  description:
    '2027 丁未年運勢總覽：一頁看完 12 個生肖與太歲的關係（羊值太歲、牛沖太歲、鼠害太歲、狗刑太歲，兔馬豬合太歲），並說明春節 2/6 與立春 2/4 兩個時間邊界的差別。',
  alternates: {
    canonical: `/tw/liunian/${YEAR}`,
    languages: hantAlternates(`/liunian/${YEAR}`),
  },
}

const FAN_TAISUI: Array<{ relation: '值' | '冲' | '害' | '刑'; label: string; note: string }> = [
  { relation: '值', label: '值太歲', note: '與太歲同支，也就是本命年。傳統講「守」：宜靜不宜動，重大決定緩一緩。' },
  { relation: '冲', label: '沖太歲', note: '與太歲正對，變動感最強。換崗、遷居、遠行容易發生，主動規劃勝過被動接受。' },
  { relation: '害', label: '害太歲', note: '與太歲相害，多暗損與口舌。合作條件易變，口頭承諾要補成文字。' },
  { relation: '刑', label: '刑太歲', note: '與太歲相刑，多摩擦與糾纏。同一件事反覆拉扯，先降溫再談事。' }
]

const ARTICLES: Array<{ slug: string; title: string; desc: string }> = [
  {
    slug: '2027-an-taisui-zenme-zuo',
    title: '2027 安太歲怎麼做：時間、流程、供品與常見誤解',
    desc: '誰需要安、什麼時候做、登記流程與供品，一次說清。'
  },
  {
    slug: '2027-fan-taisui-shengxiao',
    title: '2027 犯太歲生肖一次看：羊值、牛沖、鼠害、狗刑',
    desc: '四種關係的差別，以及各自的民俗應對。'
  },
  {
    slug: 'an-taisui-yao-zhunbei-shenme',
    title: '安太歲要準備什麼：一份可照著做的清單',
    desc: '資料三樣、費用怎麼看、太歲符事後怎麼處理。'
  }
]

export default function HantLiunian2027Page() {
  const rows = SHENGXIAO.map((sx) => ({ sx, ln: getLiunian(sx, YEAR) }))
  const fan = rows.filter((r) => ['值', '冲', '害', '刑'].includes(r.ln.relation))
  const he = rows.filter((r) => r.ln.relation === '合')
  const ping = rows.filter((r) => r.ln.relation === '平')
  const name = (n: string) => toHant(n)

  return (
    <div className="hw-wrap hw-c-pg">
      <Link href="/tw/liunian" className="hw-c-back">‹ 年運報告</Link>

      <section className="hw-c-box mb-6 mt-2">
        <h1 className="hw-c-h1">2027 {getYearGanZhi(YEAR)}年運勢總覽</h1>
        <p className="hw-c-lede">
          這一年落在你身上是什麼，看兩件事：生肖與太歲的關係，決定「是否犯太歲」；
          完整八字裡日主與流年干支的關係，決定「具體怎麼應」。前者一頁就能看完，後者需要排盤。
        </p>
        <p className="text-sm text-ink-light/70 bg-paper-dark/30 border border-gold/15 rounded px-3 py-2 mt-3">
          ★ 時間邊界有兩個，別混用：民俗的過年是<b>春節 2 月 6 日</b>（安太歲、生肖輪替按此）；
          命理的年柱切換是<b>立春 2 月 4 日</b>（排八字按此）。兩者相差兩天，
          生日落在 2 月初的人尤其要先確認用哪個口徑。
        </p>
        <div className="mt-4">
          <TaisuiTable hant focusYear={YEAR} />
          <TaisuiLegend hant />
        </div>
        <p className="text-xs text-ink-light/60 mt-3">
          下表所列為 {YEAR} 年那一欄，每一格都能點進該生肖當年的詳細運勢。
          <Link href="/tw/liunian/taisui-biao" className="hw-c-link ml-1">看多年對照表 →</Link>
        </p>
      </section>

      <section className="hw-c-box mb-6">
        <h2 className="hw-c-secTitle">四類犯太歲：{fan.map((r) => '屬' + name(r.sx.name)).join('、')}</h2>
        <div className="space-y-4">
          {FAN_TAISUI.map((f) => {
            const hit = fan.filter((r) => r.ln.relation === f.relation)
            return (
              <div key={f.relation} className="border-b border-gold/10 pb-3">
                <p className="font-semibold text-ink mb-1">
                  {f.label}：
                  {hit.map((r, i) => (
                    <span key={r.sx.slug}>
                      {i > 0 && '、'}
                      <Link href={`/tw/shengxiao/${r.sx.slug}/${YEAR}`} className="hw-c-link">屬{name(r.sx.name)}</Link>
                    </span>
                  ))}
                </p>
                <p className="text-sm text-ink-light">{f.note}</p>
              </div>
            )
          })}
        </div>
      </section>

      <section className="hw-c-box mb-6">
        <h2 className="hw-c-secTitle">合太歲與無犯的 8 個屬相</h2>
        <p className="text-sm text-ink-light mb-3">
          合太歲（{he.map((r) => '屬' + name(r.sx.name)).join('、')}）：與太歲六合或三合，民俗視為有人相助，
          適合主動談合作、擴展人脈；機會多，也要有人去接。
        </p>
        <p className="text-sm text-ink-light mb-3">
          無犯（{ping.map((r) => '屬' + name(r.sx.name)).join('、')}）：與太歲沒有明顯刑沖害合，屬平穩之年。
          平穩的正確用法是蓄力，把長期項目往前推。
        </p>
        <ul className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-sm">
          {[...he, ...ping].map((r) => (
            <li key={r.sx.slug}>
              <Link href={`/tw/shengxiao/${r.sx.slug}/${YEAR}`} className="hw-c-link">
                屬{name(r.sx.name)} 2027 運勢 →
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <section className="hw-c-box mb-6">
        <h2 className="hw-c-secTitle">安太歲怎麼做：三篇細讀</h2>
        <ul className="space-y-3 text-sm">
          {ARTICLES.map((a) => (
            <li key={a.slug}>
              <Link href={`/tw/article/${a.slug}`} className="hw-c-link font-medium">• {a.title}</Link>
              <span className="block text-ink-light">{a.desc}</span>
            </li>
          ))}
        </ul>
      </section>

      <section className="hw-c-box mb-6">
        <h2 className="hw-c-secTitle">12 個屬相的 2027 流年頁</h2>
        <ul className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-sm">
          {rows.map((r) => (
            <li key={r.sx.slug}>
              <Link href={`/tw/shengxiao/${r.sx.slug}/${YEAR}`} className="hw-c-link">
                屬{name(r.sx.name)} 2027 →
              </Link>
            </li>
          ))}
        </ul>
        <p className="text-sm text-ink-light mt-4">
          需要看自己這一年的完整情況：<Link href="/tw/liunian" className="hw-c-link">年運報告 →</Link>
        </p>
      </section>

      <p className="text-center text-xs text-ink-light/40">
        以上為傳統命理民俗內容，僅供參考娛樂，不構成任何決策建議。生肖與太歲關係由規則引擎確定性計算，不含 AI 推斷。
      </p>
      <p className="text-center text-xs text-ink-light/50 mt-2">
        <Link href={`/liunian/${YEAR}`} className="hw-c-link">简体版：2027 丁未年運勢總覽 →</Link>
      </p>
    </div>
  )
}
