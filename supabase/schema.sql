-- Supabase 数据库结构
-- 在 Supabase SQL Editor 中执行以下语句

-- 用户档案表（自动触发器创建）
CREATE TABLE IF NOT EXISTS profiles (
  id UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
  email TEXT,
  is_member BOOLEAN DEFAULT FALSE,
  member_expire_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 自动创建用户档案的触发器
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email)
  VALUES (NEW.id, NEW.email);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 用户注册时自动创建档案
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 排盘记录表
CREATE TABLE IF NOT EXISTS charts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  name TEXT DEFAULT '命主',
  gender INTEGER NOT NULL CHECK (gender IN (0, 1)),
  birth_year INTEGER NOT NULL,
  birth_month INTEGER NOT NULL,
  birth_day INTEGER NOT NULL,
  birth_hour INTEGER NOT NULL,
  birth_minute INTEGER DEFAULT 0,
  birth_place TEXT,
  timezone_offset INTEGER DEFAULT 0,
  chart_data JSONB NOT NULL,
  is_paid BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 支付记录表
-- ★ Waffo 集成（HANDOFF-Waffo支付集成 §5.8）：
--   · payment_method 枚举纳入 'card'（Waffo 本轮只接卡支付；旧库需跑文件末迁移段）
--   · order_merchant_external_id：我们自己的业务单号 MC-<userId>-<ts>，
--     兜底对账快路径与反查用户共同依赖它；与 transaction_id（Waffo PAY_xxx）是两个东西
--   · transaction_id UNIQUE：幂等方案 (b) 主——并发重投靠数据库约束拒绝，严禁先查后写
CREATE TABLE IF NOT EXISTS payments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  chart_id UUID REFERENCES charts(id) ON DELETE SET NULL,
  amount DECIMAL(10, 2) NOT NULL,
  payment_type TEXT NOT NULL CHECK (payment_type IN ('single', 'monthly', 'yearly', 'lifetime')),
  -- ★ 购买的 SKU（2026-10-18）：权益归集【必须】按它判——旧实现把所有单次购买
  --   一律映射成 fatebook，导致买「紫微深度」既拿不到紫微权益、又白送一份命书。
  --   取值 = pricing.ts 的 SkuId（fatebook/annual_report/hemun/ziwei_deep/geo/bundle3…）。
  --   历史行为兼容：sku 为空（迁移前的老流水）时仍按 payment_type='single' 归集为 fatebook。
  --   【已有数据库】需在 SQL Editor 补跑（新建库跑本文件即已就位）：
  --     ALTER TABLE payments ADD COLUMN IF NOT EXISTS sku TEXT;
  sku TEXT,
  payment_method TEXT CHECK (payment_method IN ('card', 'wechat', 'alipay', 'stripe')),
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'failed', 'refunded')),
  transaction_id TEXT,
  order_merchant_external_id TEXT,
  paid_at TIMESTAMPTZ,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT payments_transaction_id_key UNIQUE (transaction_id)
);

-- ★ 已有数据库迁移：为老库补 sku 列（幂等，可重复执行；新库因上方已含该列而空跑）
ALTER TABLE payments ADD COLUMN IF NOT EXISTS sku TEXT;

-- Webhook 处理记录表：幂等方案 (a) 辅——
--   未产生权益的事件（重复投递/非支付事件）也在此留痕；(event_type,event_id) 官方保证系统内唯一
CREATE TABLE IF NOT EXISTS processed_webhooks (
  event_type TEXT NOT NULL,
  event_id TEXT NOT NULL,
  processed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (event_type, event_id)
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_charts_user_id ON charts(user_id);
CREATE INDEX IF NOT EXISTS idx_charts_created_at ON charts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_payments_user_id ON payments(user_id);
CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(status);
CREATE INDEX IF NOT EXISTS idx_payments_omer ON payments(order_merchant_external_id);
-- 命书按盘判定（HANDOFF-命书一份一付 §五）：(user_id, chart_id) 组合查更优
CREATE INDEX IF NOT EXISTS idx_payments_chart ON payments(user_id, chart_id);

-- 行级安全策略 (RLS)
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE charts ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

-- profiles: 用户只能查看自己的档案
CREATE POLICY "Users can view own profile" ON profiles
  FOR SELECT USING (auth.uid() = id);

-- ★ 安全修复（2026-10-21）：【删除】「用户可更新自己档案」策略。
--   原策略 `FOR UPDATE USING (auth.uid() = id)` 未限制列，而 profiles.is_member /
--   member_expire_at 正是权益判定的输入（entitlement.ts → entitlementsFromRows）。
--   后果：任何免费注册用户都能用公开的 anon key 直接 PATCH 自己的档案，
--   把 is_member 置 true、member_expire_at 置到 2099 年，白拿会员权益（每天/流月/交运/
--   多命盘/相似案例/历史）。应用侧从不经客户端更新 profiles（会员写入一律走 service_role），
--   故删除不影响任何功能。已有数据库补跑 supabase/profiles-rls.sql。
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
REVOKE UPDATE ON profiles FROM anon, authenticated;

-- charts: 用户只能查看/创建自己的命盘
CREATE POLICY "Users can view own charts" ON charts
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own charts" ON charts
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- ★ schema 漂移修复（2026-10-21）：生产库已有「删除自己的命盘」策略，
--   但本文件此前漏写 → 新库初始化后 /charts 的删除按钮会报错（客户端走 anon delete）。
--   以生产库现状为准补回，保持「文件 = 线上」。
CREATE POLICY "Users can delete own charts" ON charts
  FOR DELETE USING (auth.uid() = user_id);

-- payments: 用户只能查看自己的支付记录
CREATE POLICY "Users can view own payments" ON payments
  FOR SELECT USING (auth.uid() = user_id);

-- ★ 安全修复（2026-10-21）：【删除】「匿名可插入命盘」策略。
--   原策略 `FOR INSERT WITH CHECK (auth.uid() IS NULL)` 允许任何人用公开 anon key
--   在【无登录】状态下无限量往 charts 写行（user_id=NULL），存储可被刷爆。
--   应用侧所有写入一律走 service_role（/api/charts/save、/api/unlock、/api/paipan），
--   匿名用户排盘不落库，该策略未被任何客户端路径使用。
--   已有数据库补跑 supabase/lock-write-policies.sql。
DROP POLICY IF EXISTS "Anonymous can insert charts" ON charts;

-- 付费报告资产表（合婚/紫微/地理/年运/命书；命书正文存于 charts.chart_data，本表仅存指针行）
-- 写入走 service_role（绕过 RLS）；列表/详情走客户端会话 + 下方 SELECT 策略
CREATE TABLE IF NOT EXISTS reports (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  -- ★ fatebook 加入 kind（2026-10-18）：已购命书也进「我的报告」列表。
  --   【已有数据库】需在 SQL Editor 补跑（新建库跑本文件即已就位）：
  --     ALTER TABLE reports DROP CONSTRAINT reports_kind_check;
  --     ALTER TABLE reports ADD CONSTRAINT reports_kind_check
  --       CHECK (kind IN ('hemun','ziwei','geo','annual','fatebook'));
  kind TEXT NOT NULL CHECK (kind IN ('hemun', 'ziwei', 'geo', 'annual', 'fatebook')),
  title TEXT NOT NULL,
  input JSONB NOT NULL,
  result JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own reports" ON reports
  FOR SELECT USING (auth.uid() = user_id);

-- ★ 安全修复（2026-10-21）：【删除】「用户可插入自己的报告」策略。
--   原策略 `FOR INSERT WITH CHECK (auth.uid() = user_id)` 允许登录用户直接写 reports。
--   这不构成权益绕过（别人的行仍读不到），但报告正文只应由服务端生成后落库
--   （reportSave.ts 一律走 service_role），开放客户端插入等于允许刷存储。
--   客户端 /reports 页面只用 SELECT + DELETE，故只保留这两条。
--   已有数据库补跑 supabase/lock-write-policies.sql。
DROP POLICY IF EXISTS "Users can insert own reports" ON reports;

CREATE POLICY "Users can delete own reports" ON reports
  FOR DELETE USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_reports_user_id ON reports(user_id);
CREATE INDEX IF NOT EXISTS idx_reports_created_at ON reports(created_at DESC);

-- 报告缓存（HANDOFF-年运披露与报告缓存 §3.3 方案 A：报告与缓存同一份数据，不重复存）
-- cache_key = annual:v{版本}:y{目标年}:{参数摘要}（见 src/lib/reportCache.ts）；
-- 同一 (user_id, kind, cache_key) 覆盖写只保留一行（saveReport cacheKey 分支）。
-- ★ REPLY-23 复核 发现②：索引必须 UNIQUE——saveReport 是「先 SELECT 再 update/insert」，
--   普通索引下并发两请求会同时未命中、同时 insert → 同键两行（原则③要消灭的堆积挪到了并发）；
--   唯一约束由数据库层兜底，并发 loser 收 23505 后由 saveReport 降级 update。
--   （呼应 waffo-repo.ts 既有原则：绝不做「先 SELECT 看在不在，再 INSERT」而无唯一约束兜底）
-- ★ 采用【部分唯一索引】（复核认可的分支）：WHERE cache_key IS NOT NULL——
--   · cache_key IS NULL 的行（其它四模块、旧行）不进索引、可任意并存（语义显式，
--     不依赖「PG 标准 UNIQUE 允许多个 NULL」这一待实测前提——PostgREST 无 DDL 通道，
--     编程方式无法先建索引验证 NULL 语义，故选语义显式的写法）；
--   · 非 NULL 同键冲突 → PostgREST 透传 23505（waffo-repo.ts 已有同形态生产先例）。
-- ★ 已有数据库迁移（SQL Editor 按序执行；新建库跑本文件即就位）：
--     ① 先去重（有重复行建 UNIQUE 会失败）：
--        DELETE FROM reports a USING reports b
--        WHERE a.cache_key IS NOT NULL AND a.id < b.id
--          AND a.user_id = b.user_id AND a.kind = b.kind AND a.cache_key = b.cache_key;
--     ② DROP INDEX IF EXISTS idx_reports_cache;（旧的普通索引与 UNIQUE 同名冲突，须先删）
--     ③ CREATE UNIQUE INDEX 那句（如下）。
ALTER TABLE reports ADD COLUMN IF NOT EXISTS cache_key TEXT;
DROP INDEX IF EXISTS idx_reports_cache;
CREATE UNIQUE INDEX IF NOT EXISTS idx_reports_cache ON reports(user_id, kind, cache_key) WHERE cache_key IS NOT NULL;

-- ─────────────────────────────────────────────────────────────
-- Waffo 支付集成迁移（HANDOFF-Waffo支付集成 §5.8）
-- 新建库跑上方 CREATE TABLE 即已就位；【已有数据库】需在 SQL Editor 补跑本段。
-- ─────────────────────────────────────────────────────────────

-- 1) payment_method 枚举纳入 'card'（不先改，order.completed 首次写入即被 CHECK 拒绝）
ALTER TABLE payments DROP CONSTRAINT IF EXISTS payments_payment_method_check;
ALTER TABLE payments ADD CONSTRAINT payments_payment_method_check
  CHECK (payment_method IN ('card', 'wechat', 'alipay', 'stripe'));

-- 2) 业务单号列（MC-xxx；兜底对账快路径 + 反查用户）
ALTER TABLE payments ADD COLUMN IF NOT EXISTS order_merchant_external_id TEXT;
CREATE INDEX IF NOT EXISTS idx_payments_omer ON payments(order_merchant_external_id);

-- 2b) 命书按盘判定索引（HANDOFF-命书一份一付 §五）——【已有库需补跑本句】
CREATE INDEX IF NOT EXISTS idx_payments_chart ON payments(user_id, chart_id);

-- 3) transaction_id 唯一（幂等方案 b 主）。
--    ★ 现网若残留重复 transaction_id（历史 MOCK_ 假流水可能撞号），先查重：
--      SELECT transaction_id, count(*) FROM payments
--        WHERE transaction_id IS NOT NULL GROUP BY transaction_id HAVING count(*) > 1;
--    确认为内测假流水后人工清理重复行，再执行下一句；否则 ADD CONSTRAINT 会失败。
ALTER TABLE payments ADD CONSTRAINT payments_transaction_id_key UNIQUE (transaction_id);

-- 4) Webhook 处理记录表（幂等方案 a 辅）
CREATE TABLE IF NOT EXISTS processed_webhooks (
  event_type TEXT NOT NULL,
  event_id TEXT NOT NULL,
  processed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (event_type, event_id)
);
-- 仅 service_role（Webhook 处理器）读写；不向客户端开放任何策略
ALTER TABLE processed_webhooks ENABLE ROW LEVEL SECURITY;

-- ─────────────────────────────────────────────────────────────
-- Web Push 推送（PWA + Web Push，2026-10-19；与 supabase/push.sql 同段）
-- 【已有数据库】在 SQL Editor 补跑 supabase/push.sql。
-- ★ endpoint 是可发推凭据 → 两表零 RLS 策略，仅 service_role 读写。
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS push_subscriptions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  endpoint TEXT NOT NULL,
  p256dh TEXT NOT NULL,
  auth TEXT NOT NULL,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  last_ok_at TIMESTAMPTZ,
  disabled_at TIMESTAMPTZ
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_push_subs_endpoint ON push_subscriptions(endpoint);
CREATE INDEX IF NOT EXISTS idx_push_subs_user ON push_subscriptions(user_id);
ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS push_logs (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  kind TEXT NOT NULL,
  dedupe_key TEXT NOT NULL,
  status TEXT NOT NULL,
  http_status INT,
  error TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_push_logs_dedupe ON push_logs(user_id, kind, dedupe_key);
ALTER TABLE push_logs ENABLE ROW LEVEL SECURITY;

-- ─────────────────────────────────────────────────────────────
-- AI 追问（ask_pack）问答记录（2026-10-20；与 supabase/ask.sql 同段）
-- 【已有数据库】在 SQL Editor 补跑 supabase/ask.sql。
-- ★ 额度为【派生】：追问包已授予 = 已支付 ask_pack 流水数 × ASK_PACK_SIZE；
--   会员另有每月 MEMBER_ASK_PER_MONTH 次（自然月重置）——见 entitlement.askQuotaFromRows。
--   本表【只记录成功回答的行】，按 credit_source 分别计数：
--     · pack   → 终身累计    · report → 报告赠送（终身）    · member → 只计本自然月
--   拒答/失败不落行（不扣额），故行数 === 已消耗次数。
-- ★ 写入走 service_role（/api/ask 服务端）；客户端会话仅可 SELECT 自己的历史（下方策略）。
--   额度判定不读本表做权威判定，仅计数——单一判定仍在 entitlement.ts。
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS ask_messages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  -- ★ 追问常围绕某份命盘；命盘删除时置空，不连带删问答
  chart_id UUID REFERENCES charts(id) ON DELETE SET NULL,
  question TEXT NOT NULL,
  answer TEXT NOT NULL,
  -- ★ 本条消耗的是哪一类额度（2026-10-21）：pack=已购追问包（终身累计），
  --   report=报告赠送（每份单次报告赠 ASK_PER_REPORT 次，终身），
  --   member=会员每月额度（只计本自然月）。历史行默认 pack（此前无会员额度）。
  credit_source TEXT NOT NULL DEFAULT 'pack' CHECK (credit_source IN ('pack', 'member', 'report')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 【已有数据库】补列（幂等）：历史行取 default 'pack'，与旧口径完全一致
ALTER TABLE ask_messages ADD COLUMN IF NOT EXISTS credit_source TEXT NOT NULL DEFAULT 'pack'
  CHECK (credit_source IN ('pack', 'member', 'report'));

-- 【已有数据库 ★ 必跑】放开 credit_source 取值到 'report'（报告赠送额度，2026-10-21）。
--   旧库上列已存在，上面的 ADD COLUMN 不会补约束，故显式重建（动态删旧 CHECK 再建新的）。
DO $$
DECLARE c TEXT;
BEGIN
  FOR c IN
    SELECT conname FROM pg_constraint
    WHERE conrelid = 'ask_messages'::regclass
      AND contype = 'c'
      AND pg_get_constraintdef(oid) LIKE '%credit_source%'
  LOOP
    EXECUTE format('ALTER TABLE ask_messages DROP CONSTRAINT %I', c);
  END LOOP;
  ALTER TABLE ask_messages ADD CONSTRAINT ask_messages_credit_source_check
    CHECK (credit_source IN ('pack', 'member', 'report'));
END $$;

CREATE INDEX IF NOT EXISTS idx_ask_messages_user ON ask_messages(user_id);
CREATE INDEX IF NOT EXISTS idx_ask_messages_created ON ask_messages(created_at DESC);
-- 额度计数：pack 终身累计 / member 本自然月，均按 (user_id, credit_source, created_at) 过滤
CREATE INDEX IF NOT EXISTS idx_ask_messages_source ON ask_messages(user_id, credit_source, created_at DESC);

ALTER TABLE ask_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own ask messages" ON ask_messages
  FOR SELECT USING (auth.uid() = user_id);

-- ─────────────────────────────────────────────────────────────
-- 速率限制计数（token 防盗用第二档，2026-10-20；与 supabase/rate-limits.sql 同段）
-- 【已有数据库】在 SQL Editor 补跑 supabase/rate-limits.sql。
-- ★ 固定窗口计数：bucket=端点/维度名，key=u:<userId> 或 ip:<hash>，window_start=窗口起点。
--   计数与判定唯一入口在 src/lib/rateLimit.ts（checkRateLimit）；本表仅作存储。
-- ★ 写入走 service_role（RLS 开启且【无策略】⇒ anon/authenticated 不可读写；service_role 绕过 RLS）。
-- ★ 行会随窗口累积：可定期清理 window_start 早于保留期的行（见 rate-limits.sql 末尾提示）。
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS rate_limits (
  bucket TEXT NOT NULL,
  key TEXT NOT NULL,
  window_start TIMESTAMPTZ NOT NULL,
  count INT NOT NULL DEFAULT 0,
  PRIMARY KEY (bucket, key, window_start)
);

CREATE INDEX IF NOT EXISTS idx_rate_limits_window ON rate_limits(window_start);

ALTER TABLE rate_limits ENABLE ROW LEVEL SECURITY;

-- ★ 原子自增（upsert + 返回新计数，单次往返）：供 checkRateLimit 调用
CREATE OR REPLACE FUNCTION bump_rate_limit(p_bucket text, p_key text, p_window_start timestamptz)
RETURNS integer
LANGUAGE sql
SET search_path = public
AS $$
  INSERT INTO rate_limits (bucket, key, window_start, count)
  VALUES (p_bucket, p_key, p_window_start, 1)
  ON CONFLICT (bucket, key, window_start)
  DO UPDATE SET count = rate_limits.count + 1
  RETURNING count;
$$;
