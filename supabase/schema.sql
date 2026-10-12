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
  payment_method TEXT CHECK (payment_method IN ('card', 'wechat', 'alipay', 'stripe')),
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'failed', 'refunded')),
  transaction_id TEXT,
  order_merchant_external_id TEXT,
  paid_at TIMESTAMPTZ,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT payments_transaction_id_key UNIQUE (transaction_id)
);

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

-- 行级安全策略 (RLS)
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE charts ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

-- profiles: 用户只能查看/更新自己的档案
CREATE POLICY "Users can view own profile" ON profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE USING (auth.uid() = id);

-- charts: 用户只能查看/创建自己的命盘
CREATE POLICY "Users can view own charts" ON charts
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own charts" ON charts
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- payments: 用户只能查看自己的支付记录
CREATE POLICY "Users can view own payments" ON payments
  FOR SELECT USING (auth.uid() = user_id);

-- 匿名访问（未登录用户也可以排盘，但不保存记录）
-- 这个策略允许匿名用户插入charts，但user_id为NULL
CREATE POLICY "Anonymous can insert charts" ON charts
  FOR INSERT WITH CHECK (auth.uid() IS NULL);

-- 付费报告资产表（合婚/紫微/地理/年运；命书存于 charts 表）
-- 写入走 service_role（绕过 RLS）；列表/详情走客户端会话 + 下方 SELECT 策略
CREATE TABLE IF NOT EXISTS reports (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  kind TEXT NOT NULL CHECK (kind IN ('hemun', 'ziwei', 'geo', 'annual')),
  title TEXT NOT NULL,
  input JSONB NOT NULL,
  result JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own reports" ON reports
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own reports" ON reports
  FOR INSERT WITH CHECK (auth.uid() = user_id);

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
