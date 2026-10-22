'use client'

// 分享页的操作条：打印为 PDF + 免责提示。
// 打印走浏览器原生（window.print），不引入服务端 PDF —— 中文排版成本高，v1 用不上。
export default function SharePrintBar() {
  return (
    <div className="hw-print-hide flex flex-wrap items-center gap-3 mb-6">
      <button
        type="button"
        onClick={() => window.print()}
        className="hw-c-btnBig cursor-pointer"
      >
        打印 / 存为 PDF
      </button>
      <span className="text-xs text-ink-light/60">
        提示：在打印对话框里选「另存为 PDF」即可得到文件版。
      </span>
    </div>
  )
}
