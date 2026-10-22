-- 报告分享令牌（命理师白标 v1：/r/<token> 免登录只读）
--
-- 用途：伙伴把报告发给客户，客户无需注册即可阅读，也能用浏览器「打印为 PDF」。
-- 设计取舍：
--   · 令牌存在 reports 行上（不新建表）：一份报告一个令牌，天然一对一，吊销即清空该列
--   · 32 字节随机 base64url（43 字符），唯一索引；默认 90 天过期，可随时吊销
--   · 【不加 RLS 策略】—— anon/authenticated 一律读不到该列；
--     /r/<token> 由服务端 service_role 按 token 查单行（见 src/app/r/[token]/page.tsx）
--
-- ★ 已有数据库需在 Supabase SQL Editor 补跑本文件（新建库跑 schema.sql 自然会带上）。

ALTER TABLE reports ADD COLUMN IF NOT EXISTS share_token TEXT;
ALTER TABLE reports ADD COLUMN IF NOT EXISTS share_expires_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE reports ADD COLUMN IF NOT EXISTS share_revoked_at TIMESTAMP WITH TIME ZONE;

-- 唯一索引：令牌必须全局唯一；部分索引避免大量 NULL 参与索引
CREATE UNIQUE INDEX IF NOT EXISTS idx_reports_share_token
  ON reports (share_token)
  WHERE share_token IS NOT NULL;

COMMENT ON COLUMN reports.share_token IS
  '分享令牌（base64url，32 字节）。非空即该报告存在分享链接；清空/写 revoked 即失效。';
COMMENT ON COLUMN reports.share_expires_at IS
  '分享链接过期时间；建链接时写 now()+90d。过期为 NULL 表示不过期（不建议）。';
COMMENT ON COLUMN reports.share_revoked_at IS
  '吊销时间；非空即主动失效（优先于 share_token 是否存在）。';

-- ★ 不放宽 RLS：分享页走 service_role。这里显式确认策略未被误改（幂等，仅提示）。
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'reports' AND policyname = 'reports_select_own'
  ) THEN
    RAISE NOTICE 'reports 表没有 reports_select_own 策略，请核对 schema.sql 中的 RLS 定义';
  END IF;
END $$;
