import type { Metadata } from 'next'
import Link from 'next/link'
import { AGE_REF_YEAR, ROC_FROM, ROC_TO, rocRange, rocRow } from '@/lib/ageData'

export const revalidate = 86400

export const metadata: Metadata = {
  title: `民國年次幾歲對照表：${ROC_FROM}–${ROC_TO} 年次換算西元、實歲、虛歲`,
  description: `民國 ${ROC_FROM} 到 ${ROC_TO} 年次一次查完：對應西元、生肖、${AGE_REF_YEAR} 年實歲與虛歲。附民國與西元換算公式，以及虛歲算法說明。`,
  alternates: { canonical: '/tw/age' },
}

export default function HantAgeHubPage() {
  const rows = rocRange().map((roc) => rocRow(roc))

  return (
    <div className="hw-wrap hw-c-pg">
      <nav className="text-xs text-ink-light mb-3">
        <Link href="/tw" className="hover:text-ink">首頁</Link>
        <span className="mx-1">›</span>
        <span>民國年次年齡</span>
      </nav>

      <h1 className="hw-c-h1">民國年次幾歲？{ROC_FROM}–{ROC_TO} 年次對照表</h1>
      <p className="hw-lede">
        「我是民國 66 年次，今年幾歲？」這一頁把民國年次、西元、生肖、實歲與虛歲排在同一張表，{AGE_REF_YEAR} 年的答案直接對照即可。
      </p>

      <div className="hw-c-box mb-6">
        <h2 className="hw-c-secTitle">民國與西元怎麼換算？</h2>
        <p className="hw-c-body">
          民國年次加 1911 就是西元，西元年減 1911 就是民國年次。例如民國 66 年次：66 + 1911 = 1977 年；反過來 1977 − 1911 = 66 年次。
        </p>
        <p className="hw-c-body mt-3">
          實歲是「今年 − 出生年」，但要看生日是否已過：生日已過取上限，生日未過要再減 1，所以表中會出現「48–49」這樣的區間。虛歲則是「今年 − 出生年 + 1」，不論生日到了沒有。
        </p>
        <p className="hw-c-body mt-3">
          年次與生肖是兩套不同的切法。年次只用來換算年份，生肖則以立春為界：同一個民國年次，若在當年立春之前出生，生肖要算上一年。因此護照上的出生年、長輩口中的年次、命理排盤用的生肖年，偶爾會差一格，屬正常現象。
        </p>
      </div>

      <div className="hw-c-box mb-6">
        <h2 className="hw-c-secTitle">民國 {ROC_FROM}–{ROC_TO} 年次年齡對照</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="border-b border-gold/20 text-ink-light">
                <th className="text-left py-2 pr-3 font-medium">民國年次</th>
                <th className="text-left py-2 pr-3 font-medium">西元</th>
                <th className="text-left py-2 pr-3 font-medium">生肖</th>
                <th className="text-right py-2 pr-3 font-medium">實歲</th>
                <th className="text-right py-2 font-medium">虛歲</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.roc} className="border-b border-gold/10">
                  <td className="py-2 pr-3 text-ink">
                    <Link
                      href={`/tw/age/${r.roc}`}
                      className="hover:text-ink underline-offset-4 hover:underline"
                    >
                      民國 {r.roc} 年次
                    </Link>
                  </td>
                  <td className="py-2 pr-3 text-ink-light">{r.year} 年</td>
                  <td className="py-2 pr-3">
                    <Link
                      href={`/tw/shengxiao/${r.animal}/age`}
                      className="hover:text-ink underline-offset-4 hover:underline"
                    >
                      {r.name}
                    </Link>
                  </td>
                  <td className="py-2 pr-3 text-right">
                    {r.ageMin === r.ageMax ? r.ageMax : `${r.ageMin}–${r.ageMax}`}
                  </td>
                  <td className="py-2 text-right">{r.xu}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="text-xs text-ink-light mt-3">
          表內歲數以 {AGE_REF_YEAR} 年計算；生肖以立春為界，1 月至 2 月上旬出生者可能屬上一年生肖。
        </p>
      </div>

      <div className="hw-c-box mb-6">
        <h2 className="hw-c-secTitle">常用年次快速入口</h2>
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 text-sm">
          {[50, 55, 60, 65, 66, 70, 71, 75, 80, 85, 90, 100].map((roc) => (
            <Link
              key={roc}
              href={`/tw/age/${roc}`}
              className="text-center border border-gold/15 rounded py-2 hover:bg-gold/5 transition"
            >
              民國 {roc} 年次
            </Link>
          ))}
        </div>
      </div>

      <div className="hw-c-cta">
        <h2 className="hw-c-secTitle">知道歲數之後，下一步是看命盤</h2>
        <p className="hw-c-dx">
          年齡與生肖只用到出生年；完整的八字需要年、月、日、時四柱。輸入出生時辰，即可看到自己的五行喜忌與流年走向。
        </p>
        <Link href="/tw" className="hw-c-btnBig">
          免費排盤 →
        </Link>
      </div>
    </div>
  )
}
