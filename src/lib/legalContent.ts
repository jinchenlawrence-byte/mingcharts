import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { miniMarkdown } from './miniMarkdown'

export type LegalDoc = 'terms.md' | 'privacy.md'

/**
 * 从 markdown 源截取【正文部分】（排除内部说明区与附录）。
 * ★ 起始标记区分大小写："# TERMS OF SERVICE" / "# PRIVACY POLICY"
 *   （文件第 1 行是 "# Terms of Service — MingCharts"，大小写不同）
 * ★ privacy 结束标记：行首以 "## 📌 附" 开头
 */
export function getLegalBody(filename: LegalDoc): string {
  const filePath = join(process.cwd(), 'src', 'content', 'legal', filename)
  const raw = readFileSync(filePath, 'utf8')
  const lines = raw.split('\n')

  if (filename === 'terms.md') {
    const startIdx = lines.findIndex(
      (l) => l.trim() === '# TERMS OF SERVICE'
    )
    if (startIdx < 0) throw new Error('terms.md: 找不到 "# TERMS OF SERVICE" 起始标记')
    return lines.slice(startIdx).join('\n')
  }

  // privacy.md
  const startIdx = lines.findIndex(
    (l) => l.trim() === '# PRIVACY POLICY'
  )
  if (startIdx < 0) throw new Error('privacy.md: 找不到 "# PRIVACY POLICY" 起始标记')
  const endIdx = lines.findIndex(
    (l, i) => i > startIdx && l.startsWith('## 📌 附')
  )
  const body = endIdx > 0 ? lines.slice(startIdx, endIdx) : lines.slice(startIdx)
  return body.join('\n')
}

/** 读取 + 截取 + 渲染为 HTML */
export function renderLegal(filename: LegalDoc): string {
  return miniMarkdown(getLegalBody(filename))
}
