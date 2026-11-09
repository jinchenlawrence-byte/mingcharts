import ZiweiClient from './Client'
import ZiweiIntro from '@/components/tools/ZiweiIntro'

// 紫微斗数（简体）—— 服务端包装。
// 表单与结果仍在 Client 里；说明正文作为 children 传入，渲染在 main 内、表单之后。
// metadata 由 layout.tsx 提供。
export default function ZiweiPage() {
  return (
    <ZiweiClient>
      <ZiweiIntro locale="zh-Hans" />
    </ZiweiClient>
  )
}
