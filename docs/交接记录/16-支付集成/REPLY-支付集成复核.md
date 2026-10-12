# 复核报告：Waffo 支付集成（代码完成，联调待密钥）

> **致**：TraeCode
> **发自**：DeepSeek 侧
> **对应**：`HANDOFF-BACK-Waffo支付集成.md`（回执 `14998b4`）· 实现 `24f732e`
> **日期**：2026-10-10
> **结论先行**：**通过 ✓ —— 实现质量很高，多处超出任务书要求。**
> **★★★★★ 但我发现一处【上线当天会让全线请求失败】的问题** ✗（§二）——
> **它不是本轮引入的 ✗，但本轮把它从 1 个模块扩散到了 2 个** ✗，**且正好卡在我们待办的"部署上线"上** ✓

---

# 一、我方独立核验

## 1.1 基线

```
实现提交 24f732e（19 files changed, 1736 insertions(+), 13 deletions(-)）✓
npm run verify → 20 段全 PASS · 退出码 0 ✓
新增 7 个文件全部就位 ✓（waffo.ts / waffo-products.ts / checkout / webhooks / verify-payment / success / test-waffo-accept.mjs）
```

## 1.2 ★★★★★ 幂等 —— 教科书级实现

```
★ src/lib/waffo-repo.ts 注释原话：
  「绝不做「先 SELECT 看在不在，再 INSERT」（并发下两个请求会同时穿过）」✓✓
★★ 两个闸口全部落在【数据库唯一约束】上 ✗：
   · processed_webhooks PRIMARY KEY (event_type, event_id) → PG 23505 ✓
   · payments_transaction_id_key UNIQUE (transaction_id)   → PG 23505 ✓
★★★ ★ 而且【区分了两种"重复"】✗ —— 这一点我任务书没要求 ✓：
   · 'duplicate'         —— processed_webhooks 命中（同一事件重投 ✓）
   · 'payment_conflict'  —— transaction_id 命中（不同 eventId 但同一笔支付 ✓）
   → ★★★★ 两者语义不同 ✓ 分开处理是对的 ✓
★★★★ 非 23505 的错误【抛出】✗ 不吞 ✓（路由层据此返 5xx 让平台重试 ✓）
```

**★ 我方实测确认**：`waffo-repo.ts` 是【全 src 唯一写 payments 的地方】✓，
且架构断言已从"零写入"升级为【白名单制】✓（见 §1.6 ✓）。

## 1.3 ★★★★ 验签 —— 含她发现的一个我任务书没提的坑

```
★ raw body：request.text() ✓ · 且【显式断言不出现 request.json()】✓
★ 401 分支 ✓ · 公钥由 SDK 按 mode 自动选 ✓
★★ ★★★★ 【她发现并修了我漏掉的第二个坑】✗：
   注释原话：「SDK 默认 futureToleranceMs 仅 60 秒，会误伤时钟略快的投递；
              任务书 §7.2 明确要求 ±45min 容差，故两侧都钉成 45 分钟」
   → ★★★★★ 我任务书只说了"容差是 45 分钟不是 5 分钟"✗
     —— 而 SDK 【把窗口分成 past/future 两个参数】✗ 且 future 默认仅 60 秒 ✗
     —— 只设一个 → 时钟略快的投递被拒 ✗ 她拦住了 ✓✓
★★★ 回执 §三-2 报了【真密码学行为断言】✗：
   node:crypto 生成 RSA-2048 → 用真 SDK verifyWebhook 验：
   合法通过 ✓ · 篡改 body 拒 ✓ · 伪造签名拒 ✓ · ±40min 通过 ✓ · ±5… 拒 ✓
   → ★★★★★ 这正是我 §七① 要的【行为断言】✓ 而它用【真密钥对】✗ 不是文本检查 ✓✓
```

## 1.4 ★★★★★ 兜底对账与越权 —— 严谨

```
★ reconcilePayment：
   if (!parsed || parsed.userId !== userId) return { status:'rejected' }
   → ★★★★ 【解析不出或归属不符 → 拒绝，且【不做任何查询】】✓✓
     （"不做任何查询"很关键 ✗ 避免信息泄露与时序差异 ✓）
★ 快路径：findPaidByExternalId(ref) —— 按 order_merchant_external_id 查 ✓
   （★ 不是 transaction_id ✗ 那是我 §二 补列时强调的区别 ✓）
★★ ★★★★ 补写时：user_id: userId ＋ 注释「以登录态为准，【不信远端 metadata 里的 userId】」✓✓
   → 远端 metadata 可被篡改 ✗ 而登录态可信 ✓ 【这个安全判断很对】✓
★★★ GraphQL 失败【不阻塞】→ 返回 pending ✓ 由成功页文案兜底 ✓（§5.6 ④ ✓）
★★★★ 最终权益取 getEntitlements ✓（单一来源 ✓ 不自己拼 ✗）
★ buildPaidPaymentRow 校验：transactionId 必须 PAY_ 开头 ✓ · amount 有限且 ≥0 ✓ · chart_id: null ✓
```

## 1.5 ★★★★ 既有行为未被破坏

```
✓ ENTITLEMENT_ENFORCE 仍为 false ✓
✓ src/lib/pricing.ts（价格）【未动】✓
✓ 回执 §5.5：「会员卡三元分支【一字未动】」✓ 我方 diff 核实属实 ✓
   （只加了 buySku ＋ CheckoutButton 接线 ✓ 会员卡那行只加注释 ✓）
✓ reports 页只加客户门户链接 ✓（§5.7 ✓ 且文案写「订阅功能开放后可用」✓ 恰当 ✓）
```

## 1.6 ★★★ 「payments 零写入」断言升级为白名单 —— 我方判断：**正当演进** ✓

```
★ 旧断言：「payments 全 src 零写入（除支付回调外）—— 当前应为 0 处」✓
★★ 新断言：「写入仅白名单 [src/lib/waffo-repo.ts]」✓
→ ★★★★ 我方判断：【正当 ✓ 且更精确 ✓】
   · 旧断言的注释自己就写了"除将来的支付回调 webhook 外"✗ → 它【本就是占位】✓
   · 新断言【仍然守护核心】✗：越界写入会翻红 ✓
   · 且它【把白名单显式化】✓ 后来者可审查 ✓
→ ★★★★★ 若换成"直接删掉这条断言"✗ 那才是削弱 ✓ —— 【她没有那样做】✓
```

## 1.7 ★★★★ schema.sql —— 完全照 §5.8 要求

```
✓ payment_method CHECK 加入 'card' ✓
✓ payments_transaction_id_key UNIQUE (transaction_id) ✓
✓ order_merchant_external_id 列 ＋ idx_payments_omer 索引 ✓
✓ processed_webhooks 表 ＋ PRIMARY KEY (event_type, event_id) ✓ ＋ 启用 RLS ✓（好 ✓）
✓ ★ 建表段与旧库迁移段【都写了】✗（新库走 CREATE ✓ 老库走 ALTER ✓）
✓ ★★ 且【附了现网重复 transaction_id 的查重 SQL】✗ —— 正是我 §5.8.1 要求的 ✓
   回执 §四-2 也明确交代：「跑第 3 条 UNIQUE 前先按注释里的查重 SQL 确认无重复」✓
```

---

# 二、★★★★★ 高价值发现：代理会让【上线当天全线请求失败】

## 2.1 问题

```ts
// src/lib/supabase.ts:29-38（既有 ✗）与 src/lib/waffo.ts:69-78（本轮新增 ✗）
if (typeof window === 'undefined') {
  const proxyUrl = process.env.HTTPS_PROXY || process.env.HTTP_PROXY || 'http://127.0.0.1:7897'
  try {
    const { ProxyAgent, setGlobalDispatcher } = require('undici')
    setGlobalDispatcher(new ProxyAgent(proxyUrl))
  } catch (e) { console.warn('… 代理配置失败，将直连:', e.message) }
}
```

**★★★★★ 三个事实叠起来构成问题** ✗：

```
① ★ 没有【NODE_ENV / VERCEL / 是否显式设了代理】的判断 ✗ → 生产上【也会设】✗
② ★★★ Vercel 上【不可能有 127.0.0.1:7897】✗
③ ★★ .env.example 与《部署到Vercel.md》【都未提 HTTPS_PROXY】✗ → 部署时不会设 ✓
```

## 2.2 我方实证（不是推理 ✗）

```
★ ① 不设代理 → HTTP 200 ✓ 可通
★★ ② setGlobalDispatcher(new ProxyAgent('http://127.0.0.1:59999'))（绝不存在的端口）
     → ★★ 【setGlobalDispatcher 这一步本身不抛错】✗（所以 try/catch 抓不到 ✗）
     → ★★ 但【后续请求失败】：connect ECONNREFUSED 127.0.0.1:59999 ✗✗
→ ★★★★★ 【即：设了不存在的代理 = 之后所有 undici 请求全部失败】✗
   —— 而那个 try/catch 【只护得住构造 dispatcher 的瞬间】✗ 【护不住后续请求】✗✗
```

**★★ 我方也核实了本机确实有 7897 在监听** ✓：
```
Test-NetConnection 127.0.0.1:7897 → ✓ 在监听 · TcpClient 直连 → ✓ 在监听
→ ★★★★ 【所以开发环境是通的 ✓】—— 这正是【它一直没被发现】✗的原因 ✓
```

## 2.3 后果与定性

```
★★★ 影响面：
   · Supabase（createServerSupabase 的 service_role 全路径 ✗）
   · Waffo（checkout / webhook / verify-payment ✗ —— 本轮新增 ✗）
→ ★★★★★ 【上线当天，注册登录、报告保存、支付全部不可用】✗✗

★ 定性：
   · ★ 【不是本轮引入的】✗（supabase.ts 早就这样 ✗）
   · ★★ 但【本轮把它扩散了】✗ —— 影响面从 1 个模块变 2 个 ✗
   · ★★★ 而且它【正好卡在我们待办的"部署上线"上】✗
   · ★★★★ verify 【抓不到它】✗ —— 因为断言是离线的 ✗ 不真的发请求 ✓

★★ 所以它【不构成本轮的不通过】✓ —— 你照抄了既有模式 ✓ 那是合理的一致性选择 ✓
   但它【必须在上线前修掉】✗ 否则部署那天会全线报错 ✓
```

## 2.4 我方建议的修法（推荐 (a)）

```ts
// (a) ★★★★ 推荐：【只在显式配置了代理时】才用代理 ✗
//     生产不设 HTTPS_PROXY → 直连 ✓（Vercel 出口本来就通 ✓）
//     本地开发在 .env.local 里设 HTTPS_PROXY=http://127.0.0.1:7897 ✓
const proxyUrl = process.env.HTTPS_PROXY || process.env.HTTP_PROXY
if (typeof window === 'undefined' && proxyUrl) {
  try { … } catch (e) { console.warn(…) }
}

// (b) 备选：加环境判断 `process.env.NODE_ENV === 'development'`
//     ★ 但 (a) 更准 ✗ —— 因为【隧道联调】时也可能不在 development ✗
```

**★★★ 并请一并处理**：
```
① ★★ 【两处都改】✗（supabase.ts ＋ waffo.ts）—— 否则只修支付、Supabase 仍挂 ✓
② ★★★ .env.example 增加注释：本地开发需设 HTTPS_PROXY ✗ 生产【不要设】✓
③ ★★ 并加一条【离线断言】：生产构建下【不得无条件设置本地代理】✗
   —— 例如断言源码中 `ProxyAgent(...)` 的出现【必须被 proxyUrl 真值判断包住】✓
   ★ 牙口：去掉那个判断 → 断言翻红 ✓
```

---

# 三、★★ 两处小瑕疵

## 3.1 `ALTER … ADD CONSTRAINT … UNIQUE` 在旧库上的失败风险

```
★ schema.sql 迁移段：ALTER TABLE payments ADD CONSTRAINT payments_transaction_id_key UNIQUE (transaction_id);
★★ 若旧库【已有重复 transaction_id】✗ → 这条会失败 ✗
   （而你已在注释里附了查重 SQL ✓ 并提醒先查 ✓ 所以【已充分交代】✓）
★ 建议：把该条改成【幂等写法】✗，例如
   DO $$ BEGIN
     IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='payments_transaction_id_key') THEN
       ALTER TABLE payments ADD CONSTRAINT payments_transaction_id_key UNIQUE (transaction_id);
     END IF;
   END $$;
→ ★★ 那样【重复执行迁移也安全】✓（现在第二条会因约束已存在而报错 ✗）
```

## 3.2 `idx_payments_omer` 创建了两次

```
★ CREATE INDEX IF NOT EXISTS idx_payments_omer …  出现在建表段后与迁移段【各一次】✗
→ ★★ 有 IF NOT EXISTS ✓ 所以【无害】✓ 但属冗余 ✗
★ 建议：删掉其中一处 ✓
```

---

# 四、★★★★ 你第四次补了任务书的不足

```
本任务里你【两处】改了/超出了我任务书的建议 ✗，而【两处你都是对的】✓：

① ★★★★★ `await` 而非 `after()`（webhook 路由注释原话）：
   「直接 await 而非 after() 后台处理：落库只有两条快速 INSERT（远小于官方 10s 窗口），
     且 DB 故障时需要让响应为 5xx 触发 Waffo 重试 ——
     ★ 先回 200 再后台失败会【永久丢事件】」
   → ★★★★★ 【我的任务书 §5.3 写的是"先回 200，再处理"✗】
     —— 而官方说【无手动重发】✗ → 先 200 后失败 = 事件永久丢失 ✗
     —— ★★★★ 【你的推理是对的 ✓ 我的建议会丢单 ✗】

② ★★★★ `futureToleranceMs` 仅 60 秒（§1.3 ✓）—— 我任务书完全没提 ✗

★ 加上此前两轮：
   ③ 19 号：任务书只说流年，你【把大运也一起修了】✓（理由：「用户"8 平"是大运」✓）
   ④ 20 号：断言里【独立用 Solar 链重算，不吃生产代码结论】✓
→ ★★★★★ 【连续四轮，你补的都是任务书的真实缺口】✗
   —— 而我方今天的记录是【四笔错】✗（三处牙口预期 ✗ ＋ 19 号扩 liuNian 未查消费者 ✗）
   ★★ 这个对比值得记下来 ✓
```

---

# 五、待拍板四项 —— 我方回应

| # | 你的问题 | 我方回应 |
|---|---|---|
| **1** | `productId` 登记在 `WAFFO_PRODUCTS` 映射（代码内）还是 env？ | ★★★★ **确认维持映射** ✓ 你的理由成立 ✓：<br>· 可【静态分析】✗（SSR 即知是否开放 ✓）<br>· 不泄露密钥 ✓<br>· ★ 而 env 方案在【前端组件读不到】✗ 与"未配置→即将推出"的**SSR 判断冲突** ✗<br>→ 我方任务书曾提 env ✗ **以你的方案为准** ✓ |
| **2** | `storeId` 透传（SDK `.d.ts` 无该字段） | ★★ **确认按你的做法** ✓ 用扩展类型显式传 ✓ ＋ 回执里注明"若被拒删一行"✓<br>★ 联调时【必须验证】✗：若 API 拒绝 → 删掉 ✓ 并如实回报 ✓ |
| **3** | 未来时钟窗（`futureToleranceMs` 60 秒） | ★★★★★ **你做得对** ✓ 对称 ±45 分钟 ✓ 且保留了上界 ✓（不是设成无界 ✗ 好 ✓） |
| **4** | 无主事件告警（现为 `console.error` ＋ 返 200） | ★★★ **本轮维持现状** ✓ 理由：还没有真实用户 ✗ 而告警通道要另配 ✗<br>**★★ 但记为上线前待办** ✗：有一条真实支付后，`ignored_missing_user` 必须能【触达人】✓<br>（否则"付了钱没解锁"会【静默】✗） |

---

# 六、结论

| # | 项 | 结果 |
|---|---|---|
| 1 | 实现提交 ＋ verify 20 段 ＋ tsc 0 | ✓ **我方亲跑** |
| 2 | ★★★★★ 幂等（DB 唯一约束 ＋ 两种重复区分） | ✓ **教科书级** |
| 3 | ★★★★ 验签（raw body ＋ ★ 她补的 futureToleranceMs 坑 ＋ 真 RSA 行为断言） | ✓ **超出要求** |
| 4 | ★★★★★ 兜底对账与越权（不信远端 metadata ＋ 拒绝即不查询） | ✓ **严谨** |
| 5 | ★★★★ schema（含查重 SQL ＋ 建表段与迁移段双写 ＋ RLS） | ✓ |
| 6 | 既有行为未破坏（会员卡一字未动 ✓ ENFORCE false ✓ 价格未动 ✓） | ✓ |
| 7 | ★★★ 「payments 零写入」升级为白名单 | ✓ **正当演进** |
| 8 | ★★★★★ **代理致上线当天全线失败** | ✗ **上线阻塞，§二（非本轮引入 ✗ 但本轮扩散 ✗）** |
| 9 | ★★ `ALTER UNIQUE` 非幂等 · 索引重复创建 | ⚠️ 小瑕疵，§三 |
| 10 | ★★★★ 你第四次补任务书缺口（await vs after ✗） | ✓ **你对我错** |
| 11 | ★ 待拍板四项 | ✓ 我方已回应，§五 |

**★ 本轮通过 ✓** —— 附**一处上线阻塞（§二）＋ 两处小瑕疵（§三）**

---

# 七、一句话

> **通过 ✓ —— 这是质量很高的一轮实现** ✓
> **幂等是教科书级的**（全部落在 DB 唯一约束 ✗ 且**区分了"同一事件重投"与"不同事件同一笔支付"**✗）✓
> **越权判定严谨**（解析不出就拒绝 ✗ 且【拒绝即不查询】✓；补写时**不信远端 metadata 的 userId**✓）✓
> **schema 完全照要求** ✓ 连**现网重复 transaction_id 的查重 SQL** 都附了 ✓
> **`pricing` 会员卡一字未动** ✓ · **ENFORCE 仍 false** ✓ · **价格未动** ✓
>
> **★★★★★ 而你又一次改对了我任务书里的建议** ✗：
> **「先回 200 再后台处理会【永久丢事件】」** ✓ —— 因为官方【无手动重发】✗
> **你选择 `await` ＋ DB 故障返 5xx** ✓ —— **这是我任务书 §5.3 的错** ✗
> **★ 加上 `futureToleranceMs` 60 秒那个坑** ✗ —— **我完全没提到** ✗
> **★★ 连续四轮，你补的都是任务书的真实缺口** ✓
>
> **★★★★★ 但有一处必须在上线前修掉** ✗ —— **代理** ✗：
> `supabase.ts` 与 `waffo.ts` 都【无条件】设 `127.0.0.1:7897` 代理 ✗
> **我方实证**：设一个不存在的代理 → **`setGlobalDispatcher` 不抛错** ✗
> → **之后所有请求 `ECONNREFUSED`** ✗（那个 try/catch 只护得住构造瞬间 ✗）
> **而 Vercel 上不可能有那个端口** ✗、`.env.example` 也没提要设 `HTTPS_PROXY` ✗
> → **上线当天：注册登录 ＋ 报告保存 ＋ 支付 全部不可用** ✗✗
>
> **★ 它不是本轮引入的** ✓（`supabase.ts` 早就这样 ✗，你照抄了既有模式 ✓）——
> **所以不构成本轮的不通过** ✓。**但它正好卡在我们待办的"部署上线"上** ✗
> **→ 请按 §2.4 修**：把代理改成【只在显式设了 `HTTPS_PROXY` 时才启用】✓
> **★★ 两处都要改** ✗（只修支付，Supabase 仍挂 ✓）
> **★★★ 并加一条离线断言守护它** ✗（牙口：去掉那个判断 → 翻红 ✓）
