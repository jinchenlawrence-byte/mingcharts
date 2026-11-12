import Link from 'next/link'
import { ROC_FROM, ROC_TO, type AgeRow } from '@/lib/ageData'
import { getShengXiao } from '@/lib/shengxiaoData'
import { toHant } from '@/lib/hant'

/**
 * 年龄对照表（繁体）。
 * 生肖年龄页与民國年次页共用；行内「出生年份」可链到对应的民國年次页，
 * 为后续「生肖 × 出生年」细分页预留了同样的行结构。
 */
export function AgeTable({
  rows,
  linkRoc = true,
  highlightRoc,
}: {
  rows: AgeRow[]
  linkRoc?: boolean
  highlightRoc?: number
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm border-collapse">
        <thead>
          <tr className="border-b border-gold/20 text-ink-light">
            <th className="text-left py-2 pr-3 font-medium">出生年份</th>
            <th className="text-left py-2 pr-3 font-medium">民國年次</th>
            <th className="text-right py-2 pr-3 font-medium">實歲</th>
            <th className="text-right py-2 pr-3 font-medium">虛歲</th>
            <th className="text-left py-2 font-medium">生肖</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => {
            const sx = getShengXiao(r.animal)
            const name = toHant(sx?.name ?? '')
            const isHighlight = highlightRoc != null && r.roc === highlightRoc
            return (
              <tr
                key={r.year}
                className={`border-b border-gold/10 ${isHighlight ? 'bg-gold/10 font-semibold' : ''}`}
              >
                <td className="py-2 pr-3 text-ink">
                  {linkRoc && r.roc >= ROC_FROM && r.roc <= ROC_TO ? (
                    <Link
                      href={`/tw/age/${r.roc}`}
                      className="hover:text-ink underline-offset-4 hover:underline"
                    >
                      {r.year} 年
                    </Link>
                  ) : (
                    <span>{r.year} 年</span>
                  )}
                </td>
                <td className="py-2 pr-3 text-ink-light">民國 {r.roc} 年</td>
                <td className="py-2 pr-3 text-right">
                  {r.ageMin === r.ageMax ? r.ageMax : `${r.ageMin}–${r.ageMax}`}
                </td>
                <td className="py-2 pr-3 text-right">{r.xu}</td>
                <td className="py-2">
                  <Link
                    href={`/tw/shengxiao/${r.animal}/age`}
                    className="hover:text-ink underline-offset-4 hover:underline"
                  >
                    {name}
                  </Link>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
