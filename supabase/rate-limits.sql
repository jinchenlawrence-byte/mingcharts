-- ─────────────────────────────────────────────────────────────
-- 速率限制计数迁移（token 防盗用第二档，2026-10-20）
-- 幂等（CREATE ... IF NOT EXISTS / CREATE OR REPLACE），可在 Supabase SQL Editor 重复执行。
-- 【已有数据库】需在 SQL Editor 手动执行本文件一次；新建库跑 schema.sql 即已就位。
--
-- 背景：门禁（ENTITLEMENT_ENFORCE）之前 AI 端点的最大敞口是【已登录用户无限次】触发
--   （见第一档 docs/... ）。本表为「固定窗口计数」的唯一存储：
--     · bucket       = 端点/维度名（如 ai_user_min / ai_user_day / ai_force_hour）
--     · key          = u:<userId>（登录）或 ip:<sha256 前 16 位>（匿名，不存原始 IP）
--     · window_start = 窗口起点（floor(now / windowMs) * windowMs）
--     · count        = 本窗口内计数
--   计数与判定【唯一入口】在 src/lib/rateLimit.ts（checkRateLimit）——本表仅作存储，
--   路由/组件不得各自写判定（§8.5.1 同型错误防护）。
--
-- ★★ 开关：RATE_LIMIT_ENFORCE（服务端 env，默认 false）。关闭时 checkRateLimit 直接放行、
--   不查库（内测期/本地/测试零影响）；开启后（收费）才按窗口计数硬校验，超限返 429。
-- ★★ 写入走 service_role（/api/* 服务端）。RLS 开启且【无策略】⇒ anon/authenticated 不可读写。
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

-- ─────────────────────────────────────────────────────────────
-- 运维提示：行会随窗口累积，可定期清理较早的历史窗口（例：保留 7 天）——
--   DELETE FROM rate_limits WHERE window_start < now() - interval '7 days';
--   （可由 Supabase pg_cron 定时执行，或并入既有每日 cron。）
-- 校验（可选）：
--   SELECT tablename, rowsecurity FROM pg_tables WHERE tablename = 'rate_limits';  -- 期望 true
--   SELECT policyname FROM pg_policies WHERE tablename = 'rate_limits';           -- 期望空（无客户端策略）
--   -- ★ 列名是 policyname（pg_policies 视图）；polname 属于底层表 pg_policy，用它查视图会报 42703
-- ─────────────────────────────────────────────────────────────
