// ─────────────────────────────────────────────────────────────
// 一次性运维脚本（档 C，2026-10-18）：创建并发布两个【会员订阅商品】，
//   只打印 PROD_ 供人工粘贴进 src/lib/waffo-products.ts 的 WAFFO_PRODUCTS（唯一登记处）。
//
// 用法（在仓库根目录 bazi-mvp 下执行）：
//   npx tsx scripts/create-subscription-products.mjs
//
// 前置：.env.local 需有 WAFFO_MERCHANT_ID / WAFFO_PRIVATE_KEY / WAFFO_STORE_ID /
//       NEXT_PUBLIC_APP_URL（沿用支付通道既有配置，无新增 env）。
//
// ★ 幂等提示：商品创建是渠道侧写操作，本脚本【不做】去重 —— 重复执行会在 Dashboard
//   多出一个同 name 的商品。请对照本次打印结果，把要上线的那一个 PROD_ 登记即可。
// ★ PROD_ 是公开标识（非密钥），登记进 waffo-products.ts 后可被客户端组件安全引用。
// ─────────────────────────────────────────────────────────────
import { fileURLToPath } from 'node:url'
import { getWaffo, getWaffoStoreId } from '../src/lib/waffo.ts'
import { SKUS } from '../src/lib/pricing.ts'

// 先加载 .env.local（脚本独立运行，不经 Next.js 的 env 自动加载）
try {
  process.loadEnvFile(fileURLToPath(new URL('../.env.local', import.meta.url)))
} catch {
  console.error('★ 未找到 .env.local（请在本仓库根目录 bazi-mvp 下执行本脚本）')
  process.exit(1)
}

// 订阅 SKU → 渠道计费周期（与 pricing.ts 的 Sku 一一对应，价格从 SKUS 单一事实源取）
const TARGETS = [
  { sku: 'member_monthly', billingPeriod: 'monthly' },
  { sku: 'member_yearly', billingPeriod: 'yearly' },
]

async function main() {
  const client = getWaffo()
  const storeId = getWaffoStoreId()
  const results = []

  for (const { sku, billingPeriod } of TARGETS) {
    const def = SKUS[sku]
    if (!def) {
      console.error(`★ pricing.ts 缺少 SKU：${sku}`)
      process.exit(1)
    }
    // ① 创建订阅商品（tests 版本）——金额用 display string（渠道侧自行换算最小币种单位）
    const created = await client.subscriptionProducts.create({
      storeId,
      name: def.name,
      description: def.desc,
      billingPeriod,
      prices: { USD: { amount: String(def.priceUSD), taxCategory: 'saas' } },
    })
    // ② 发布为生产版本（未 publish 的商品不对外可用）
    const published = await client.subscriptionProducts.publish({ id: created.product.id })

    results.push({
      sku,
      productId: published.product.id,
      name: def.name,
      price: def.priceUSD,
      billingPeriod,
    })
  }

  console.log('\n✅ 订阅商品已创建并发布。请把下面两行粘进 src/lib/waffo-products.ts 的 WAFFO_PRODUCTS：\n')
  for (const r of results) {
    console.log(`  ${r.sku}: '${r.productId}', // ${r.name} ${r.price} USD / ${r.billingPeriod}`)
  }
  console.log('\n（登记后会员购买入口即由「即将推出」切换为可购；开闸详见 订阅模块档C 计划）\n')
}

main().catch((e) => {
  console.error('★ 创建订阅商品失败：', e?.message ?? e)
  process.exit(1)
})
