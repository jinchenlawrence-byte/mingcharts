import LiunianClient from './Client'
import LiunianIntro from '@/components/tools/LiunianIntro'

// 年运报告（简体）—— 服务端包装。
// 表单与结果仍在 Client 里；说明正文作为 children 传入，渲染在 main 内、表单之后。
// metadata 由 layout.tsx 提供。
export default function LiunianPage() {
  return (
    <LiunianClient>
      <LiunianIntro locale="zh-Hans" />
    </LiunianClient>
  )
}
