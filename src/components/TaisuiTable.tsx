import Link from 'next/link'
import { SHENGXIAO, getLiunian, LIUNIAN_YEARS } from '@/lib/shengxiaoData'
import { toHant } from '@/lib/hant'

// 十二生肖 × 流年 太岁关系对照表（2026-10-23 第 33 轮）
//
// 为什么要有这一页：96 个流年页是分散的，而写「某年运势」的人需要【一页看完】
// 12 个生肖那年犯不犯太岁。这类表最容易被别人引用（引用时自然带链接），
// 是 A 侧规划里的「可引用资产」。
//
// ★ 简繁共用这一个组件：关系词由 toHant 派生，【不写两份映射】——
//   第 32 轮的标题退化 bug 就是简繁各写一份词表造成的。

type Relation = '值' | '冲' | '害' | '刑' | '合' | '平'

const RELATION_STYLE: Record<Relation, { bg: string; fg: string }> = {
  '值': { bg: 'rgba(185,65,52,0.14)', fg: '#B94134' },
  '冲': { bg: 'rgba(196,110,40,0.14)', fg: '#9C5520' },
  '害': { bg: 'rgba(168,140,40,0.16)', fg: '#8A6D12' },
  '刑': { bg: 'rgba(112,86,150,0.14)', fg: '#6B4C97' },
  '合': { bg: 'rgba(58,124,86,0.14)', fg: '#2F6B49' },
  '平': { bg: 'rgba(120,114,104,0.10)', fg: '#7A7268' },
}

const RELATION_LABEL_HANS: Record<Relation, string> = {
  '值': '值太岁',
  '冲': '冲太岁',
  '害': '害太岁',
  '刑': '刑太岁',
  '合': '合太岁',
  '平': '无犯',
}

/** 某年生肖的流年页（简繁路径） */
function yearHref(base: string, animal: string, year: number) {
  return `${base}/shengxiao/${animal}/${year}`
}

export default function TaisuiTable({ hant = false }: { hant?: boolean }) {
  const thisYear = new Date().getFullYear()
  const years = LIUNIAN_YEARS
  const animalHref = (slug: string) => `${hant ? '/tw' : ''}/shengxiao/${slug}`
  const label = (r: Relation) => (hant ? toHant(RELATION_LABEL_HANS[r]) : RELATION_LABEL_HANS[r])
  const animalName = (name: string) => (hant ? toHant(name) : name)

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm border-collapse">
        <caption className="sr-only">
          {hant ? '十二生肖 2024–2031 流年太歲關係對照表' : '十二生肖 2024–2031 流年太岁关系对照表'}
        </caption>
        <thead>
          <tr className="text-left text-ink-light/70 border-b border-gold/20">
            <th className="py-2 pr-3 sticky left-0 bg-white/0">{hant ? '生肖' : '生肖'}</th>
            {years.map((y) => (
              <th
                key={y}
                className="py-2 px-2 text-center whitespace-nowrap"
                style={
                  y === thisYear
                    ? { backgroundColor: 'rgba(185,65,52,0.08)', color: '#B94134', fontWeight: 600 }
                    : undefined
                }
              >
                {y}
                {y === thisYear && (
                  <span className="block text-[10px] font-normal">{hant ? '今年' : '今年'}</span>
                )}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {SHENGXIAO.map((sx) => (
            <tr key={sx.slug} className="border-b border-gold/10">
              <td className="py-2 pr-3 whitespace-nowrap">
                <Link href={animalHref(sx.slug)} className="text-ink hover:underline">
                  {hant ? '屬' : '属'}
                  {animalName(sx.name)}
                </Link>
              </td>
              {years.map((y) => {
                const ln = getLiunian(sx, y)
                const r = ln.relation as Relation
                const st = RELATION_STYLE[r] ?? RELATION_STYLE['平']
                return (
                  <td key={y} className="py-1.5 px-1 text-center">
                    <Link
                      href={yearHref(hant ? '/tw' : '', sx.slug, y)}
                      className="inline-block rounded px-2 py-1 text-xs hover:underline"
                      style={{ backgroundColor: st.bg, color: st.fg }}
                      title={`${y} ${hant ? '年' : '年'}${animalName(sx.name)} · ${label(r)}`}
                    >
                      {label(r)}
                    </Link>
                  </td>
                )
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

/** 图例（简繁共用） */
export function TaisuiLegend({ hant = false }: { hant?: boolean }) {
  const items: Relation[] = ['值', '冲', '害', '刑', '合', '平']
  return (
    <div className="flex flex-wrap gap-3 text-xs mt-3">
      {items.map((r) => {
        const st = RELATION_STYLE[r]
        return (
          <span key={r} className="inline-flex items-center gap-1.5">
            <span
              className="inline-block w-3 h-3 rounded"
              style={{ backgroundColor: st.bg, border: `1px solid ${st.fg}` }}
            />
            <span className="text-ink-light">
              {hant ? toHant(RELATION_LABEL_HANS[r]) : RELATION_LABEL_HANS[r]}
            </span>
          </span>
        )
      })}
    </div>
  )
}
