// ─────────────────────────────────────────────────────────────
// 一次性运维脚本（2026-10-20）：创建并发布【一次性商品】，只打印 PROD_ 供人工粘贴进
//   src/lib/waffo-products.ts 的 WAFFO_PRODUCTS（唯一登记处）。
//
// 用法（在仓库根目录 bazi-mvp 下执行）：
//   npx tsx scripts/create-onetime-products.mjs <sku> [sku...]
//   例：npx tsx scripts/create-onetime-products.mjs fatebook annual_report hemun
//
// 前置：.env.local 需有 WAFFO_MERCHANT_ID / WAFFO_PRIVATE_KEY / WAFFO_STORE_ID
//       （沿用支付通道既有配置，无新增 env）。★ 换成生产凭证即在生产环境建品。
//
// ★ 幂等提示：商品创建是渠道侧写操作，本脚本【不做】去重 —— 重复执行会在 Dashboard
//   多出一个同 name 的商品。请对照本次打印结果，把要上线的那一个 PROD_ 登记即可。
// ★ PROD_ 是公开标识（非密钥），登记进 waffo-products.ts 后可被客户端组件安全引用。
// ★ 与 create-subscription-products.mjs 对称：那里建订阅商品（subscriptionProducts），
//   这里建一次性商品（onetimeProducts）。
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

// 待创建的一次性商品（价格/名称/描述一律取自 SKUS 单一事实源，不另写字面量）
const TARGETS = process.argv.slice(2).filter((a) => !a.startsWith('-'))
if (!TARGETS.length) {
  console.error('★ 用法：npx tsx scripts/create-onetime-products.mjs <sku> [sku...]')
  console.error(`  可用 SKU：${Object.keys(SKUS).join(', ')}`)
  process.exit(1)
}

/** 渠道侧偶发 TLS 断连（ECONNRESET）—— 重试一次即可，避免半途失败留下孤儿草稿 */
async function withRetry(fn) {
  try {
    return await fn()
  } catch (e) {
    const code = e?.cause?.code ?? e?.code
    if (code !== 'ECONNRESET' && code !== 'ETIMEDOUT') throw e
    console.log(`  ↻ ${code}，重试一次…`)
    return await fn()
  }
}

async function main() {
  const client = getWaffo()
  const storeId = getWaffoStoreId()

  for (const sku of TARGETS) {
    const def = SKUS[sku]
    if (!def) {
      console.error(`★ pricing.ts 缺少 SKU：${sku}`)
      process.exit(1)
    }
    // ① 创建一次性商品（tests 版本）——金额用 display string；税类取 digital_goods（数字商品）
    const created = await withRetry(() => client.onetimeProducts.create({
      storeId,
      name: def.name,
      description: def.desc,
      prices: { USD: { amount: String(def.priceUSD), taxCategory: 'digital_goods' } },
    }))
    // ★ 立刻打印创建结果：若 publish 失败，也不会丢失已创建商品的 ID（避免重跑产生重复商品）
    console.log(`  · ${sku} 已创建 ${created.product.id}（status=${created.product.status}）`)
    // ② 发布为生产版本（未 publish 的商品不对外可用）
    //    ★ 若 .env.local 用的是【生产凭证】，新建商品本身即在生产环境、没有 test 版本，
    //      publish 会报 "No test version found" —— 此时以 create 结果为准，继续走激活。
    let product = created.product
    try {
      product = (await withRetry(() => client.onetimeProducts.publish({ id: created.product.id }))).product
    } catch (e) {
      if (!String(e?.message ?? '').includes('No test version found')) throw e
      console.log(`    （生产凭证直建，无 test 版本，跳过 publish）`)
    }
    // ③ 确保 active：仅 active 版本可对外售卖
    if (product.status !== 'active') {
      product = (await withRetry(() => client.onetimeProducts.updateStatus({
        id: product.id, status: 'active',
      }))).product
      console.log(`    已激活（status=${product.status}）`)
    }
    // ★ 逐条打印：中途失败也不丢失已创建商品的 ID
    console.log(`  ${sku}: '${product.id}', // ${def.name} ${def.priceUSD} USD（一次性）`)
  }

  console.log('\n✅ 一次性商品已创建并发布。请把上面各行粘进 src/lib/waffo-products.ts 的 WAFFO_PRODUCTS。\n')
}

main().catch((e) => {
  console.error('★ 创建一次性商品失败：', e?.message ?? e)
  if (e?.cause) console.error('  cause：', e.cause?.message ?? e.cause?.code ?? e.cause)
  process.exit(1)
})
