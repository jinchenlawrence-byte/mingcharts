// 命书面客打印版（分享页专用，服务端渲染，无客户端 JS）
//
// 为什么不复用 /chart 里的渲染：命书十卷的渲染内联在 src/app/chart/page.tsx（676 行）里，
// 抽组件会动到主转化页 —— 那是"改一处、坏一片"的地方。分享页只需要【干净的、可打印的正文】，
// 所以这里按 reports/charts 里存的结构直接排十卷，不共享 JSX，也就零回归风险。
//
// ★ 卷名与字段顺序必须与 /chart 的 VOLS / PAID_KEYS 一致（那边是产品定义的十卷）。

const VOLS = ['八字总览', '性格天赋', '用神喜忌', '格局成败', '调候用神', '大运流年', '事业财运', '婚姻感情', '子女六亲', '健康提示']
const PAID_KEYS = ['overview', 'personality', 'yongShen', 'geJuAnalysis', 'tiaoHou', 'daYunAnalysis', 'career', 'marriage', 'children', 'health'] as const
const CN_NUM = ['一', '二', '三', '四', '五', '六', '七', '八', '九', '十']

export interface FatebookPaid {
  [key: string]: unknown
}

export default function ShareFatebookView({ paid }: { paid: FatebookPaid | null }) {
  if (!paid) {
    return (
      <p className="hw-note">
        这份命书的正文未能读取（可能仍在生成中）。请与你的命理师联系重新发送。
      </p>
    )
  }

  const volumes = VOLS.map((title, i) => ({
    no: CN_NUM[i],
    title,
    body: typeof paid[PAID_KEYS[i]] === 'string' ? (paid[PAID_KEYS[i]] as string) : '',
  })).filter((v) => v.body.trim().length > 0)

  if (volumes.length === 0) {
    return <p className="hw-note">这份命书暂无正文内容，请与你的命理师联系。</p>
  }

  return (
    <div className="space-y-6">
      {volumes.map((v) => (
        <section key={v.title} className="hw-c-box hw-print-block">
          <h2 className="hw-c-secTitle">
            卷{v.no} · {v.title}
          </h2>
          <p className="hw-c-body whitespace-pre-wrap">{v.body}</p>
        </section>
      ))}
    </div>
  )
}
