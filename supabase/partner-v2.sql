-- 伙伴自助 V2（第 34 轮）：报告状态机 + 幂等请求号 + 品牌位
-- 全部 IF NOT EXISTS，可重复执行。
-- status 默认 'ready' → 老数据语义不变；request_id 与 user_id 组成部分唯一索引，
-- 是「同一请求只扣一次额度」的唯一硬约束。

ALTER TABLE reports ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'ready';
ALTER TABLE reports ADD COLUMN IF NOT EXISTS request_id TEXT;
ALTER TABLE reports ADD COLUMN IF NOT EXISTS brand_name TEXT;
ALTER TABLE reports ADD COLUMN IF NOT EXISTS brand_contact TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS idx_reports_request_id
  ON reports (user_id, request_id)
  WHERE request_id IS NOT NULL;
