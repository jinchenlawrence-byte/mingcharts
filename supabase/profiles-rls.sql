-- ─────────────────────────────────────────────────────────────
-- 安全修复：删除 profiles 的自助更新能力（2026-10-21）
--
-- 【问题】原策略 "Users can update own profile" 为 `FOR UPDATE USING (auth.uid() = id)`，
--   未限制可写列。而 profiles.is_member / member_expire_at 是权益判定输入
--   （entitlement.ts → entitlementsFromRows → memberSkus）。
--   后果：任何免费注册用户都能用公开的 anon key + 自己的会话 token，直接：
--     PATCH /supabase-api/rest/v1/profiles?id=eq.<自己的id>
--     body: {"is_member": true, "member_expire_at": "2099-01-01T00:00:00Z"}
--   从而白拿会员权益（daily / liuyue / jiaoyun / multi_chart / similar_cases / history）。
--   ── 注意：本漏洞不涉及报告类权益（订阅 grants 不含报告，定价方案 §4.2）。
--
-- 【为何可直接删除】应用侧从不经客户端写 profiles：
--   · 会员写入   → lib/waffo-repo.ts（service_role）
--   · 取消续费   → app/api/membership/cancel（service_role）
--   service_role 绕过 RLS，不受本改动影响。
--
-- 【幂等】DROP POLICY IF EXISTS + REVOKE 均可重复执行。
-- 执行位置：Supabase SQL Editor（生产项目 zvqjjmyhisuotylhjjjz）
-- ─────────────────────────────────────────────────────────────

DROP POLICY IF EXISTS "Users can update own profile" ON profiles;

-- 双保险：即使将来有人误建了宽松策略，表级 UPDATE 权限也已收回
REVOKE UPDATE ON profiles FROM anon, authenticated;

-- 校验（期望：0 行）
-- select policyname from pg_policies
--  where tablename = 'profiles' and cmd = 'UPDATE';
