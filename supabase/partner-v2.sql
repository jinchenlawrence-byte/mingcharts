-- 伙伴自助 V2（第 34 轮）：报告状态机 + 幂等请求号 + 品牌位
--
-- 背景：V1 是「入账自动、扣减手动」——伙伴出报告要人工跑脚本扣额度。
-- V2 让伙伴在站上自助出报告，一次请求一份报告、一份扣减，全程无需运营在线。
--
-- 设计取舍：
--   · status 默认 'ready'：老数据语义不变（既有行全部视为已完成）；
--     新流程先落 'pending' 拿 reportId（作为扣费幂等键），成功置 'ready'，失败置 'failed'。
--   · request_id + (user_id, request_id) 部分唯一索引：防双击/重试重复扣费的【唯一硬约束】，
--     应用层只做短路与 23505 兜底，最终裁决在数据库。
--   · brand_name / brand_contact：伙伴品牌位（分享页 h1 上方），只收两个文本字段。
--
-- ★ 已有数据库需在 Supabase SQL Editor 补跑本文件（新建库跑 schema.sql 后补跑同样适用）。
-- ★ 全部 IF NOT EXISTS，可重复执行。

ALTER TABLE reports ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'ready';
ALTER TABLE reports ADD COLUMN IF NOT EXISTS request_id TEXT;
ALTER TABLE reports ADD COLUMN IF NOT EXISTS brand_name TEXT;
ALTER TABLE reports ADD COLUMN IF NOT EXISTS brand_contact TEXT;

-- 同一账号的同一个 requestId 只允许一行（NULL 行不进索引，老数据与其它模块不受影响）
CREATE UNIQUE INDEX IF NOT EXISTS idx_reports_request_id
  ON reports (user_id, request_id)
  WHERE request_id IS NOT NULL;

COMMENT ON COLUMN reports.status IS
  '报告状态：ready（可展示/可分享，默认值，老数据语义）/ pending（生成中，不可展示）/ failed（生成失败，已退额）。';
COMMENT ON COLUMN reports.request_id IS
  '伙伴自助出报告的客户端请求号（幂等键）。与 user_id 组成部分唯一索引，保证同一请求只扣一次额度。';
COMMENT ON COLUMN reports.brand_name IS
  '伙伴品牌名（≤24 字），渲染在分享页标题上方；可空。';
COMMENT ON COLUMN reports.brand_contact IS
  '伙伴联系方式（≤40 字），渲染在分享页标题上方；可空。';
