-- ─────────────────────────────────────────────────────────────
-- Web Push 推送迁移（PWA + Web Push，2026-10-19）
-- 幂等（CREATE ... IF NOT EXISTS），可在 Supabase SQL Editor 重复执行。
-- 【已有数据库】需在 SQL Editor 手动执行本文件一次；新建库按需同样跑一次。
--
-- 背景：会员授权浏览器通知后，由 Vercel Cron 每天定时向「有效会员 + 已授权订阅」发送
--   「今日日运已更新」推送。本模块【只新增两张表】，绝不改动任何现有金钱链路。
--
-- ★★ endpoint 是可向该设备发推的凭据 —— 两张表【零 RLS 策略，仅 service_role】读写，
--    绝不向客户端开放任何策略（客户端只经服务端 /api/push/subscribe 登记/退订）。
-- ─────────────────────────────────────────────────────────────

-- 1) push_subscriptions：浏览器的 PushSubscription 登记（一设备一条）
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
-- ★ 同设备换账号：endpoint 唯一 → 由 upsert(onConflict:endpoint) 覆盖归属
CREATE UNIQUE INDEX IF NOT EXISTS idx_push_subs_endpoint ON push_subscriptions(endpoint);
CREATE INDEX IF NOT EXISTS idx_push_subs_user ON push_subscriptions(user_id);
-- ★ 零策略：仅 service_role
ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;

-- 2) push_logs：发送去重与结果留痕（每日每人每种 kind 至多一条）
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
-- ★ 幂等靠此唯一约束：claimDailyLog 先 INSERT，23505 即「今日已发」，绝不做「先查后写」
CREATE UNIQUE INDEX IF NOT EXISTS idx_push_logs_dedupe ON push_logs(user_id, kind, dedupe_key);
-- ★ 零策略：仅 service_role
ALTER TABLE push_logs ENABLE ROW LEVEL SECURITY;

-- ─────────────────────────────────────────────────────────────
-- 校验（可选，执行后人工核对）：
--   SELECT tablename, rowsecurity FROM pg_tables
--     WHERE tablename IN ('push_subscriptions','push_logs');
--   -- 期望两行 rowsecurity = true（无 pg_policies 行 ⇒ 零策略）
-- ─────────────────────────────────────────────────────────────
