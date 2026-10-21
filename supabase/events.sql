-- 流量漏斗事件表（2026-10-21）：只记行为，不记命理内容与个人信息。
-- 写入一律走服务端 /api/track（service_role，绕过 RLS）；客户端 anon key 不可读写。
-- 【执行方式】SQL Editor 整段执行，可重复执行。
CREATE TABLE IF NOT EXISTS events (
  id BIGSERIAL PRIMARY KEY,
  -- 登录用户才记 user_id；匿名访问为 NULL
  user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  -- 浏览器会话 id（localStorage 生成），用于把同一访客的多步串成漏斗
  sid TEXT NOT NULL,
  -- 事件名，白名单见 src/app/api/track/route.ts
  name TEXT NOT NULL,
  path TEXT,
  -- 首次触达归因（会话内固定），用于「同一来源带来的转化」而不是「本次访问来源」
  utm_source TEXT,
  utm_medium TEXT,
  utm_campaign TEXT,
  referrer TEXT,
  props JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- RLS 开启且【不建任何策略】：anon/authenticated 均无法直接读写，仅 service_role 可写。
ALTER TABLE events ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_events_created_at ON events(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_events_name ON events(name);
CREATE INDEX IF NOT EXISTS idx_events_sid ON events(sid);

-- ─────────────────────────────────────────────────────────────
-- 漏斗查询（在 SQL Editor 里直接跑，按需改时间范围）
-- ─────────────────────────────────────────────────────────────

-- ① 近 7 天各环节次数与相对访问的转化率
-- SELECT
--   COUNT(*) FILTER (WHERE name = 'page_view')      AS 访问,
--   COUNT(*) FILTER (WHERE name = 'paipan_submit')  AS 排盘,
--   COUNT(*) FILTER (WHERE name = 'preview_view')   AS 看试读,
--   COUNT(*) FILTER (WHERE name = 'pay_click')      AS 点购买,
--   ROUND(100.0 * COUNT(*) FILTER (WHERE name = 'paipan_submit') / NULLIF(COUNT(*) FILTER (WHERE name = 'page_view'), 0), 1) AS 排盘率,
--   ROUND(100.0 * COUNT(*) FILTER (WHERE name = 'pay_click') / NULLIF(COUNT(*) FILTER (WHERE name = 'paipan_submit'), 0), 1) AS 排盘到购买率
-- FROM events WHERE created_at > NOW() - INTERVAL '7 days';

-- ② 按来源分组（首次触达归因），看哪个渠道真的带来排盘与购买
-- SELECT
--   COALESCE(NULLIF(utm_source, ''), '(direct)') AS 来源,
--   COUNT(DISTINCT sid) FILTER (WHERE name = 'page_view')     AS 访客数,
--   COUNT(DISTINCT sid) FILTER (WHERE name = 'paipan_submit') AS 排盘人数,
--   COUNT(DISTINCT sid) FILTER (WHERE name = 'pay_click')     AS 点击购买人数
-- FROM events WHERE created_at > NOW() - INTERVAL '30 days'
-- GROUP BY 1 ORDER BY 访客数 DESC;

-- ③ 逐日趋势
-- SELECT DATE(created_at) AS 日期,
--        COUNT(*) FILTER (WHERE name = 'page_view')     AS 访问,
--        COUNT(*) FILTER (WHERE name = 'paipan_submit') AS 排盘,
--        COUNT(*) FILTER (WHERE name = 'pay_click')     AS 购买点击
-- FROM events WHERE created_at > NOW() - INTERVAL '30 days'
-- GROUP BY 1 ORDER BY 1 DESC;

-- ④ 已付款（账面对账，不依赖前端事件；与上方事件互为交叉校验）
-- SELECT DATE(created_at) AS 日期, COUNT(*) AS 订单数, SUM(amount) AS 金额
-- FROM payments WHERE status = 'paid' AND created_at > NOW() - INTERVAL '30 days'
-- GROUP BY 1 ORDER BY 1 DESC;
