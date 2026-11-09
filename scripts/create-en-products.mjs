// ─────────────────────────────────────────────────────────────
// 运维脚本：创建【英文商品】（9 个）并发布，只打印 PROD_ 供人工粘贴进
//   src/lib/waffo-products.ts 的 WAFFO_PRODUCTS（唯一登记处）。
//
// 用法（在仓库根目录 bazi-mvp 下执行）：
//   npx tsx scripts/create-en-products.mjs --dry-run   # 只打印清单，不连渠道、不写任何数据
//   npx tsx scripts/create-en-products.mjs --create    # 真正建品（需用户看过 dry-run 清单后授权）
//
// 事实源：
//   · 名称/描述 —— src/lib/pricingEn.ts（SKU_EN / EN_PRODUCT_SKUS）
//   · 金额/类型 —— src/lib/pricing.ts（SKUS）
//   ★ 商品名不带 " · EN" 后缀，后台靠 PROD_ ID 区分中英文商品。
//
// 前置（仅 --create 需要）：.env.local 需有 WAFFO_MERCHANT_ID / WAFFO_PRIVATE_KEY /
//   WAFFO_STORE_ID / NEXT_PUBLIC_APP_URL。--dry-run 不读 env、不构造客户端。
//
// ★ 幂等提示：建品是渠道侧写操作，本脚本不去重——重复执行会多出同 name 商品。
// ★ PROD_ 是公开标识（非密钥），登记后被客户端组件安全引用。
// ─────────────────────────────────────────────────────────────
import { fileURLToPath } from 'node:url'
import { SKUS } from '../src/lib/pricing.ts'
import { SKU_EN, EN_PRODUCT_SKUS } from '../src/lib/pricingEn.ts'

const DRY_RUN = process.argv.includes('--dry-run')
const CREATE = process.argv.includes('--create')

if (!DRY_RUN && !CREATE) {
  console.error('★ 用法：npx tsx scripts/create-en-products.mjs --dry-run | --create')
  console.error('  --dry-run  只打印 9 条商品清单，不写渠道')
  console.error('  --create   真正创建并发布（须先经用户核对 dry-run 清单）')
  process.exit(1)
}
if (DRY_RUN && CREATE) {
  console.error('★ --dry-run 与 --create 只能选一个')
  process.exit(1)
}

/** 订阅 SKU 的计费周期；一次性/追问包返回 null */
function billingPeriodOf(sku) {
  if (sku === 'member_monthly') return 'monthly'
  if (sku === 'member_yearly') return 'yearly'
  return null
}

/** 渠道税类：订阅 → saas；一次性报告/追问包 → digital_goods（与既有脚本一致） */
function taxCategoryOf(sku) {
  return billingPeriodOf(sku) ? 'saas' : 'digital_goods'
}

function buildEntries() {
  return EN_PRODUCT_SKUS.map((sku) => {
    const def = SKUS[sku]
    const copy = SKU_EN[sku]
    if (!def) throw new Error(`pricing.ts 缺少 SKU：${sku}`)
    if (!copy) throw new Error(`pricingEn.ts 缺少文案：${sku}`)
    return {
      sku,
      name: copy.name,
      desc: copy.desc,
      amount: def.priceUSD,
      kind: def.kind,
      billingPeriod: billingPeriodOf(sku),
      taxCategory: taxCategoryOf(sku),
    }
  })
}

function fmtAmount(n) {
  return Number.isInteger(n) ? `${n}.00` : n.toFixed(2)
}

function printTable(entries) {
  const head = ['SKU', '商品名', '金额(USD)', '类型', '税类', '周期']
  const rows = entries.map((e) => [
    e.sku,
    e.name,
    fmtAmount(e.amount),
    e.kind,
    e.taxCategory,
    e.billingPeriod ?? '—',
  ])
  const widths = head.map((h, i) => Math.max(h.length, ...rows.map((r) => r[i].length)))
  const line = (cells) => '  ' + cells.map((c, i) => c.padEnd(widths[i])).join('  ')
  console.log('')
  console.log(line(head))
  console.log('  ' + widths.map((w) => '─'.repeat(w)).join('  '))
  rows.forEach((r) => console.log(line(r)))
  console.log('')
}

/** 渠道侧偶发 TLS 断连——重试一次，避免半途失败留下孤儿草稿 */
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

async function createAll(entries) {
  // 动态加载：--dry-run 时不触碰 env / SDK
  const { getWaffo, getWaffoStoreId } = await import('../src/lib/waffo.ts')
  const client = getWaffo()
  const storeId = getWaffoStoreId()

  for (const e of entries) {
    const prices = { USD: { amount: String(e.amount), taxCategory: e.taxCategory } }
    const isSub = e.billingPeriod !== null

    // ① 创建（tests 版本）
    const created = isSub
      ? await withRetry(() => client.subscriptionProducts.create({
          storeId, name: e.name, description: e.desc,
          billingPeriod: e.billingPeriod, prices,
        }))
      : await withRetry(() => client.onetimeProducts.create({
          storeId, name: e.name, description: e.desc, prices,
        }))
    console.log(`  · ${e.sku} 已创建 ${created.product.id}（status=${created.product.status}）`)

    // ② 发布为生产版本；生产凭证直建时没有 test 版本，跳过 publish
    let product = created.product
    try {
      const api = isSub ? client.subscriptionProducts : client.onetimeProducts
      product = (await withRetry(() => api.publish({ id: created.product.id }))).product
    } catch (err) {
      if (!String(err?.message ?? '').includes('No test version found')) throw err
      console.log('    （生产凭证直建，无 test 版本，跳过 publish）')
    }

    // ③ 确保 active
    if (product.status !== 'active') {
      const api = isSub ? client.subscriptionProducts : client.onetimeProducts
      product = (await withRetry(() => api.updateStatus({ id: product.id, status: 'active' }))).product
      console.log(`    已激活（status=${product.status}）`)
    }

    console.log(`  ${e.sku}: '${product.id}', // ${e.name} ${e.amount} USD${e.billingPeriod ? ` / ${e.billingPeriod}` : '（一次性）'}`)
  }
}

async function main() {
  const entries = buildEntries()

  // 期望恰好 9 个（伙伴包不建）；数量漂移直接报错，避免漏建/多建
  if (entries.length !== 9) {
    throw new Error(`EN_PRODUCT_SKUS 应为 9 个，实际 ${entries.length} 个`)
  }

  console.log(`\n英文商品清单（${entries.length} 个）`)
  printTable(entries)

  if (DRY_RUN) {
    console.log('★ DRY-RUN：未读取 .env.local、未连接渠道、未写入任何数据。')
    console.log('★ 以上清单经用户核对并单独授权后，再执行 --create。\n')
    return
  }

  try {
    process.loadEnvFile(fileURLToPath(new URL('../.env.local', import.meta.url)))
  } catch {
    console.error('★ 未找到 .env.local（请在本仓库根目录 bazi-mvp 下执行本脚本）')
    process.exit(1)
  }

  await createAll(entries)
  console.log('\n✅ 英文商品已创建并发布。请把上面各行粘进 src/lib/waffo-products.ts 的 WAFFO_PRODUCTS。\n')
}

main().catch((e) => {
  console.error('★ 创建英文商品失败：', e?.message ?? e)
  if (e?.cause) console.error('  cause：', e.cause?.message ?? e.cause?.code ?? e.cause)
  process.exit(1)
})
