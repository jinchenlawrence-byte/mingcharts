-- ─────────────────────────────────────────────────────────────
-- 安全修复：关闭 charts / reports 的客户端写入面（2026-10-21）
--
-- 【问题 1】"Anonymous can insert charts"：`FOR INSERT WITH CHECK (auth.uid() IS NULL)`
--   允许任何人用公开 anon key 在未登录状态下无限量往 charts 写行（user_id=NULL）。
--   不涉及权益，但存储与配额可被刷爆。
--
-- 【问题 2】"Users can insert own reports"：`FOR INSERT WITH CHECK (auth.uid() = user_id)`
--   允许登录用户直接写 reports。别人的行仍读不到（不构成权益绕过），
--   但报告正文只应由服务端生成后落库，客户端可插即等于可刷存储。
--
-- 【为何可直接删除】应用侧写入全部走 service_role（绕过 RLS）：
--   · charts  → app/api/charts/save、app/api/unlock、app/api/paipan
--   · reports → lib/reportSave.ts、lib/reportCache.ts、webhook
--   客户端只做：charts 读 + delete；reports 读 + delete。
--   ── 因此 reports 的 SELECT / DELETE 策略必须保留，本文件不动它们。
--
-- 【幂等】DROP POLICY IF EXISTS 可重复执行。
-- 执行位置：Supabase SQL Editor（生产项目 zvqjjmyhisuotylhjjjz）
-- ─────────────────────────────────────────────────────────────

DROP POLICY IF EXISTS "Anonymous can insert charts" ON charts;
DROP POLICY IF EXISTS "Users can insert own reports" ON reports;

-- 校验（期望：charts 仅 1 条 INSERT 策略——用户插自己的；reports 0 条 INSERT）
-- select tablename, policyname, cmd from pg_policies
--  where schemaname = 'public' and tablename in ('charts','reports')
--  order by tablename, cmd;
--
-- 说明：charts 保留 "Users can insert own charts"（登录用户写自己的盘）。
--   它当前同样未被客户端使用（插入走 /api/charts/save），属纵深防御的下一档，
--   本轮按已批准的清单只删「匿名插入」与「reports 插入」两条。
