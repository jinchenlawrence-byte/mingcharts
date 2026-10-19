-- ─────────────────────────────────────────────────────────────
-- 会员订阅迁移（档 C，2026-10-18）
-- 幂等（ADD COLUMN IF NOT EXISTS），可在 Supabase SQL Editor 重复执行。
-- 【已有数据库】需在 SQL Editor 手动执行本文件一次；新建库按需同样跑一次。
--
-- 背景：会员状态由支付回调 webhook（subscription.* 事件）写 profiles。
--   · 到货时间/套餐/是否会员：is_member / member_plan / member_expire_at（schema.sql 与 membership.sql 已有）
--   · 本次新增：取消/恢复所需的订阅单号与自动续费标记
-- ★★ member_order_id 是 Waffo 订阅单号（ORD_xxx），【仅服务端读写】，
--    绝不下发客户端 —— 取消/恢复接口由服务端读它再调渠道，前端只收 boolean/时间。
-- ─────────────────────────────────────────────────────────────

-- 1) profiles：会员订阅三列
--    member_order_id  —— 当前有效订阅的 Waffo 单号 ORD_xxx（账号级单点，供取消/恢复定位）
--    member_auto_renew—— 是否自动续费（true=开通/已恢复；false=已请求取消）
--    member_cancel_at —— 请求取消的时间（收到 subscription.canceling 时写入；uncanceled 时清空）
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS member_order_id TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS member_auto_renew BOOLEAN;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS member_cancel_at TIMESTAMPTZ;

-- 2) payments：订阅单号审计列（每笔订阅扣款流水记录其所属订单 ORD_xxx）。
--    一次性链路不使用该列（order_id 为 NULL）。
--    幂等仍由 payments_transaction_id_key UNIQUE(transaction_id) 兜底，本列不参与判重。
ALTER TABLE payments ADD COLUMN IF NOT EXISTS order_id TEXT;
CREATE INDEX IF NOT EXISTS idx_payments_order_id ON payments(order_id);

-- ─────────────────────────────────────────────────────────────
-- 校验（可选，执行后人工核对）：
--   SELECT column_name, data_type FROM information_schema.columns
--     WHERE table_name IN ('profiles','payments')
--       AND column_name IN ('member_order_id','member_auto_renew','member_cancel_at','order_id');
-- ─────────────────────────────────────────────────────────────
