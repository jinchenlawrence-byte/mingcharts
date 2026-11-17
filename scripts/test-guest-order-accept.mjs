// 游客订单凭证工具（先付款后注册 · 阶段 A）验收断言
//
// 断的是什么：
//   ① 令牌：43 字符 base64url、32 字节、50 次不重复、9 类非法输入拒绝
//   ② 哈希：sha256 64 位 hex、同输入稳定、不同输入不碰撞、无法从哈希反推长度特征
//   ③ 有效期：默认 30 天、可指定；判定顺序 吊销 > 过期 > 哈希存在
//   ④ 商户单号：MCG- 生成/解析往返；现有 MC-<userId>-<ts> 必须解析为 null
//   ⑤ 开放名单：首期只开命书，其余 4 SKU 与 bundle3 一律拒绝
//   ⑥ 指纹：字段顺序无关、sku 或输入变化即变、同一输入稳定
//   ⑦ 邮箱归一：trim + lower，空串/null 归一为 null

let allPass = true
const fail = (msg) => { allPass = false; console.log('  ✗ ' + msg) }
const ok = (msg) => console.log('  ✓ ' + msg)

const {
  CLAIM_TTL_DAYS, UNCLAIMED_RETENTION_DAYS, CLAIM_TOKEN_BYTES, GUEST_ORDER_SKUS,
  GUEST_OPEN_SKUS, isGuestSkuOpen, generateClaimToken, hashClaimToken, isClaimTokenShape,
  claimExpiryFrom, isClaimWindowOpen, buildGuestMerchantOrderId, parseGuestMerchantOrderId,
  isGuestMerchantOrderId, normalizeEmail, guestInputFingerprint,
} = await import('../src/lib/guestOrder.ts')

// ---------- ① 令牌形状 ----------
console.log('—— ① 令牌形状与随机性 ——')
{
  let bad = 0
  const t = generateClaimToken()
  if (!isClaimTokenShape(t)) { bad++; fail(`生成的令牌形状不合法：${t}`) }
  if (t.length !== 43) { bad++; fail(`令牌应为 43 字符，实际 ${t.length}`) }
  if (CLAIM_TOKEN_BYTES !== 32) { bad++; fail('令牌字节数应为 32') }
  const many = new Set(Array.from({ length: 50 }, () => generateClaimToken()))
  if (many.size !== 50) { bad++; fail('50 次生成出现重复令牌（随机源有问题）') }
  for (const v of ['', 'short', t.slice(0, 42), t + 'x', '中文中文', null, undefined, 123, {}]) {
    if (isClaimTokenShape(v)) { bad++; fail(`非法令牌被放行：${JSON.stringify(v)}`) }
  }
  if (bad === 0) ok('43 字符 base64url、50 次无重复、9 类非法输入全部拒绝')
}

// ---------- ② 哈希 ----------
console.log('—— ② 令牌哈希 ——')
{
  let bad = 0
  const t = generateClaimToken()
  const h = hashClaimToken(t)
  if (!/^[0-9a-f]{64}$/.test(h)) { bad++; fail(`哈希应为 64 位小写 hex，实际 ${h}`) }
  if (h !== hashClaimToken(t)) { bad++; fail('同一令牌两次哈希不一致') }
  if (h === hashClaimToken(generateClaimToken())) { bad++; fail('不同令牌哈希相同') }
  if (h.includes(t.slice(0, 8))) { bad++; fail('哈希里出现了令牌片段（不可能是 sha256）') }
  if (bad === 0) ok('sha256 / 64 位 hex / 稳定 / 无碰撞 / 不含原文')
}

// ---------- ③ 有效期与窗口判定 ----------
console.log('—— ③ 有效期与判定顺序 ——')
{
  let bad = 0
  const NOW = new Date('2026-11-17T00:00:00Z')
  const iso = claimExpiryFrom(NOW)
  const days = (new Date(iso).getTime() - NOW.getTime()) / 86400_000
  if (Math.abs(days - CLAIM_TTL_DAYS) > 1e-9) { bad++; fail(`默认过期应为 ${CLAIM_TTL_DAYS} 天，实际 ${days}`) }
  if (CLAIM_TTL_DAYS !== 30) { bad++; fail('认领窗口应为 30 天') }
  const custom = claimExpiryFrom(NOW, 7)
  if (Math.abs((new Date(custom).getTime() - NOW.getTime()) / 86400_000 - 7) > 1e-9) { bad++; fail('自定义 7 天过期不对') }
  if (UNCLAIMED_RETENTION_DAYS !== 90) { bad++; fail('未认领保留期应为 90 天') }

  const hash = hashClaimToken(generateClaimToken())
  const future = new Date(NOW.getTime() + 86400_000).toISOString()
  const past = new Date(NOW.getTime() - 86400_000).toISOString()
  const cases = [
    ['开放中', { claim_token_hash: hash, claim_expires_at: future, claim_revoked_at: null }, true],
    ['无哈希', { claim_token_hash: null, claim_expires_at: future }, false],
    ['空行', null, false],
    ['已过期', { claim_token_hash: hash, claim_expires_at: past, claim_revoked_at: null }, false],
    ['已吊销', { claim_token_hash: hash, claim_expires_at: future, claim_revoked_at: past }, false],
    ['★ 已吊销且已过期 → 吊销优先', { claim_token_hash: hash, claim_expires_at: past, claim_revoked_at: past }, false],
  ]
  for (const [name, row, want] of cases) {
    const got = isClaimWindowOpen(row, NOW)
    if (got !== want) { bad++; fail(`${name}：isClaimWindowOpen = ${got}，应为 ${want}`) }
  }
  if (bad === 0) ok('默认 30 天、可指定、六种窗口判定全对（吊销优先）')
}

// ---------- ④ 商户单号 ----------
console.log('—— ④ 商户单号 MCG- ——')
{
  let bad = 0
  const id = '9f1d2c3b-4a5e-4f60-8b71-2c3d4e5f6a7b'
  const omer = buildGuestMerchantOrderId(id, 1763300000000)
  if (omer !== `MCG-${id}-1763300000000`) { bad++; fail(`单号格式不对：${omer}`) }
  const parsed = parseGuestMerchantOrderId(omer)
  if (!parsed || parsed.guestOrderId !== id || parsed.timestamp !== 1763300000000) {
    bad++; fail(`解析往返失败：${JSON.stringify(parsed)}`)
  }
  if (!isGuestMerchantOrderId(omer)) { bad++; fail('生成的单号未被识别为游客单') }

  // ★ 现有登录用户单号必须落到「非游客」分支
  const legacy = `MC-677830fe-c09b-4a93-8fa8-501760b37c00-1763300000000`
  if (parseGuestMerchantOrderId(legacy) !== null) { bad++; fail('MC- 前缀的历史单号被误判为游客单') }
  if (isGuestMerchantOrderId(legacy)) { bad++; fail('MC- 前缀的历史单号被 isGuestMerchantOrderId 放行') }

  for (const v of ['', 'MCG-', 'MCG-not-a-uuid-123', null, undefined, 42, {}]) {
    if (parseGuestMerchantOrderId(v) !== null) { bad++; fail(`非法单号被解析：${JSON.stringify(v)}`) }
  }
  if (bad === 0) ok('MCG- 往返正确；MC- 历史单号与 7 类非法输入全部返回 null')
}

// ---------- ⑤ 开放名单 ----------
console.log('—— ⑤ 首期开放名单 ——')
{
  let bad = 0
  if (GUEST_OPEN_SKUS.length !== 1 || GUEST_OPEN_SKUS[0] !== 'fatebook') {
    bad++; fail(`首期应只开 fatebook，实际 ${JSON.stringify(GUEST_OPEN_SKUS)}`)
  }
  if (!isGuestSkuOpen('fatebook')) { bad++; fail('fatebook 应开放') }
  for (const closed of ['annual_report', 'hemun', 'ziwei_deep', 'geo', 'bundle3', 'member_yearly', 'ask_pack', '', null]) {
    if (isGuestSkuOpen(closed)) { bad++; fail(`未开放的 SKU 被放行：${JSON.stringify(closed)}`) }
  }
  // 表 check 允许 5 个，开放名单必须是其子集
  for (const s of GUEST_OPEN_SKUS) {
    if (!GUEST_ORDER_SKUS.includes(s)) { bad++; fail(`开放 SKU ${s} 不在表约束允许值内`) }
  }
  if (bad === 0) ok('只开 fatebook；其余 4 报告、bundle3、会员、追问包全部拒绝')
}

// ---------- ⑥ 输入指纹 ----------
console.log('—— ⑥ 输入指纹 ——')
{
  let bad = 0
  const a = { birthYear: 1990, birthMonth: 5, birthDay: 12, gender: 1 }
  const b = { gender: 1, birthDay: 12, birthMonth: 5, birthYear: 1990 }
  const fa = guestInputFingerprint('fatebook', a)
  if (!/^[0-9a-f]{64}$/.test(fa)) { bad++; fail(`指纹应为 64 位 hex，实际 ${fa}`) }
  if (fa !== guestInputFingerprint('fatebook', b)) { bad++; fail('字段顺序不同导致指纹变化（应排序后摘要）') }
  if (fa !== guestInputFingerprint('fatebook', { ...a })) { bad++; fail('同一输入两次指纹不一致') }
  if (fa === guestInputFingerprint('fatebook', { ...a, birthDay: 13 })) { bad++; fail('输入变化指纹未变') }
  if (fa === guestInputFingerprint('hemun', a)) { bad++; fail('sku 不同指纹未变') }
  if (bad === 0) ok('64 位 hex、字段顺序无关、输入或 sku 变化即变')
}

// ---------- ⑦ 邮箱归一 ----------
console.log('—— ⑦ 邮箱归一 ——')
{
  let bad = 0
  const cases = [
    ['  Foo@Example.COM ', 'foo@example.com'],
    ['a@b.c', 'a@b.c'],
    ['', null],
    ['   ', null],
    [null, null],
    [undefined, null],
    [123, null],
  ]
  for (const [input, want] of cases) {
    const got = normalizeEmail(input)
    if (got !== want) { bad++; fail(`normalizeEmail(${JSON.stringify(input)}) = ${JSON.stringify(got)}，应为 ${JSON.stringify(want)}`) }
  }
  if (bad === 0) ok('trim + lower；空串/空白/null/非字符串统一为 null')
}

console.log(allPass ? '\n全部通过' : '\n存在失败项')
if (!allPass) process.exit(1)
