/**
 * 极简 markdown → HTML 转换器
 * 仅供法律页渲染用（marked 装不了时的 fallback）
 * 支持：h1-h4 / 段落 / 加粗 / 斜体 / 链接 / 行代码 / 表格 / 引用 / 有序无序列表 / 水平线
 */

/** 转义 HTML 特殊字符 */
function esc(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

/** 行内格式化（加粗、斜体、链接、行代码） */
function inline(s: string): string {
  let r = esc(s)
  // 行代码 `code`
  r = r.replace(/`([^`]+)`/g, '<code>$1</code>')
  // 加粗 **text**
  r = r.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
  // 斜体 *text*（避免与加粗冲突，只匹配单个*且非**）
  r = r.replace(/(^|[^*])\*([^*]+)\*(?!\*)/g, '$1<em>$2</em>')
  // 链接 [text](url) —— url 只允许 http/https/mailto
  r = r.replace(
    /\[([^\]]+)\]\((https?:\/\/[^\s)]+|mailto:[^\s)]+)\)/g,
    '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>'
  )
  return r
}

export function miniMarkdown(md: string): string {
  const lines = md.split('\n')
  const out: string[] = []
  let i = 0
  let inUl = false
  let inOl = false
  let inBq = false

  const closeLists = () => {
    if (inUl) { out.push('</ul>'); inUl = false }
    if (inOl) { out.push('</ol>'); inOl = false }
    if (inBq) { out.push('</blockquote>'); inBq = false }
  }

  while (i < lines.length) {
    const line = lines[i]
    const trimmed = line.trimStart()

    // 空行
    if (trimmed === '') { closeLists(); i++; continue }

    // 水平线
    if (/^---+\s*$/.test(trimmed)) { closeLists(); out.push('<hr/>'); i++; continue }

    // 标题
    const hm = trimmed.match(/^(#{1,4})\s+(.+)$/)
    if (hm) {
      closeLists()
      const lvl = hm[1].length
      out.push(`<h${lvl}>${inline(hm[2])}</h${lvl}>`)
      i++; continue
    }

    // 表格（行以 | 开头）
    if (trimmed.startsWith('|')) {
      closeLists()
      const tableLines: string[] = []
      while (i < lines.length && lines[i].trimStart().startsWith('|')) {
        tableLines.push(lines[i].trim())
        i++
      }
      if (tableLines.length >= 2) {
        // 跳过分隔行 |---|---|
        const dataLines = tableLines.filter((l) => !/^\|[\s-:|]+\|?\s*$/.test(l))
        if (dataLines.length > 0) {
          const renderRow = (l: string, isHead: boolean) => {
            const cells = l.replace(/^\||\|$/g, '').split('|')
            const tag = isHead ? 'th' : 'td'
            return `<tr>${cells.map((c) => `<${tag}>${inline(c.trim())}</${tag}>`).join('')}</tr>`
          }
          out.push('<table>')
          out.push('<thead>' + renderRow(dataLines[0], true) + '</thead>')
          if (dataLines.length > 1) {
            out.push('<tbody>')
            for (let j = 1; j < dataLines.length; j++) out.push(renderRow(dataLines[j], false))
            out.push('</tbody>')
          }
          out.push('</table>')
          continue
        }
      }
      // 不是表格就当普通行
    }

    // 引用块
    if (trimmed.startsWith('> ')) {
      if (!inBq) { closeLists(); inBq = true; out.push('<blockquote>') }
      out.push(`<p>${inline(trimmed.slice(2))}</p>`)
      i++; continue
    }

    // 无序列表
    if (/^[-*]\s+/.test(trimmed)) {
      if (!inUl) { closeLists(); inUl = true; out.push('<ul>') }
      out.push(`<li>${inline(trimmed.replace(/^[-*]\s+/, ''))}</li>`)
      i++; continue
    }

    // 有序列表
    if (/^\d+\.\s+/.test(trimmed)) {
      if (!inOl) { closeLists(); inOl = true; out.push('<ol>') }
      out.push(`<li>${inline(trimmed.replace(/^\d+\.\s+/, ''))}</li>`)
      i++; continue
    }

    // 普通段落
    closeLists()
    out.push(`<p>${inline(trimmed)}</p>`)
    i++
  }
  closeLists()
  return out.join('\n')
}
