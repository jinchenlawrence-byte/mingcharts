import GeoClient from './Client'
import GeoIntro from '@/components/tools/GeoIntro'

// 方位地理（简体）—— 服务端包装。
// 表单与结果仍在 Client 里；说明正文作为 children 传入，渲染在 main 内、表单之后，
// 因此会出现在服务端 HTML 中，且不改变首屏节奏。metadata 由 layout.tsx 提供。
export default function GeoPage() {
  return (
    <GeoClient>
      <GeoIntro locale="zh-Hans" />
    </GeoClient>
  )
}
