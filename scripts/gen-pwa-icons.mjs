// PWA 图标派生（一次性运维脚本，产物已提交入库；构建期不依赖本脚本/sharp）
//
// 源：brand/final/mingcharts-logo-512.png（透明底徽标）
// 产物：
//   public/pwa/icon-192.png      —— 常规图标（any）
//   public/pwa/icon-512.png      —— 常规图标（any，安装/启动画面）
//   public/pwa/maskable-512.png  —— 满幅朱砂底 + 主体缩至安全区（圆形遮罩不裁字）
//   src/app/apple-icon.png       —— iOS 主屏图标（180）
//
// 用法：node scripts/gen-pwa-icons.mjs（或直接 `npm run gen:icons`）
// ★ 依赖 devDependency sharp；产物提交后，构建/部署不读本脚本。
import { mkdirSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const SRC = path.join(root, 'brand/final/mingcharts-logo-512.png')
// 主题色朱砂（与 manifest.ts 的 theme_color 同值）
const CINNABAR = { r: 0xa6, g: 0x2b, b: 0x1f, alpha: 1 }

const OUT_PWA = path.join(root, 'public/pwa')
mkdirSync(OUT_PWA, { recursive: true })

async function main() {
  const meta = await sharp(SRC).metadata()
  console.log(`源：${path.relative(root, SRC)}（${meta.width}x${meta.height}, alpha=${meta.hasAlpha}）`)

  // 常规图标：直接缩放
  await sharp(SRC).resize(192, 192).png().toFile(path.join(OUT_PWA, 'icon-192.png'))
  await sharp(SRC).resize(512, 512).png().toFile(path.join(OUT_PWA, 'icon-512.png'))

  // maskable：满幅朱砂底，徽标缩至安全区（~62%）居中——避免圆形遮罩裁掉主体
  const inner = Math.round(512 * 0.62)
  const logo = await sharp(SRC).resize(inner, inner).png().toBuffer()
  await sharp({
    create: { width: 512, height: 512, channels: 4, background: CINNABAR },
  })
    .composite([{ input: logo, gravity: 'centre' }])
    .png()
    .toFile(path.join(OUT_PWA, 'maskable-512.png'))

  // iOS 主屏图标（180）
  await sharp(SRC).resize(180, 180).png().toFile(path.join(root, 'src/app/apple-icon.png'))

  console.log('已生成：public/pwa/icon-192.png, icon-512.png, maskable-512.png, src/app/apple-icon.png')
}

main().catch((e) => {
  console.error('图标生成失败：', e.message)
  process.exit(1)
})
