-- ─────────────────────────────────────────────────────────────
-- AI 追问（ask_pack）问答记录迁移（2026-10-20）
-- 幂等（CREATE ... IF NOT EXISTS），可在 Supabase SQL Editor 重复执行。
-- 【已有数据库】需在 SQL Editor 手动执行本文件一次；新建库跑 schema.sql 即已就位。
--
-- 背景：追问包（ask_pack，$4.99 / ASK_PACK_SIZE 次）购买经现有 checkout/webhook 落
--   payments(payment_type='single', sku='ask_pack')，【无需新增加额逻辑】；
--   本表只记录【成功回答】的问答，剩余次数 = 追问包已付次数 × ASK_PACK_SIZE
--   + 会员本月额度（MEMBER_ASK_PER_MONTH）− 分别按 credit_source 统计的消耗。
--
-- ★★ 额度语义：
--   · 拒答 / AI 失败 / 合规重试后放弃 → 【不落行、不扣额】；
--   · 仅「AI 成功且过合规」才落一行 → 本表行数 === 已消耗次数；
--   · credit_source 标记本条消耗的是 pack（终身）、report（报告赠送，终身）还是 member（本自然月）；
--   · 额度判定单一事实源在 src/lib/entitlement.ts（askQuotaFromRows / getAskRemaining），
--     本表仅作计数，绝不在此另立判定。
-- ★★ 写入走 service_role（/api/ask 服务端，绕过 RLS）；客户端会话仅可 SELECT 自己的历史。
--    （question/answer 为 AI 生成内容，非敏感凭据；但仍只对本人可见。）
-- ─────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS ask_messages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  -- ★ 追问常围绕某份命盘；命盘删除时置空，不连带删问答
  chart_id UUID REFERENCES charts(id) ON DELETE SET NULL,
  question TEXT NOT NULL,
  answer TEXT NOT NULL,
  -- ★ 本条消耗的额度来源（2026-10-21）：pack=追问包（终身），member=会员每月（本自然月），
  --   report=报告赠送（每购一份单次报告赠 ASK_PER_REPORT 次，终身）
  credit_source TEXT NOT NULL DEFAULT 'pack' CHECK (credit_source IN ('pack', 'member', 'report')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 【已有数据库】补列（幂等）：历史行取 default 'pack'，与旧口径完全一致
ALTER TABLE ask_messages ADD COLUMN IF NOT EXISTS credit_source TEXT NOT NULL DEFAULT 'pack'
  CHECK (credit_source IN ('pack', 'member', 'report'));

-- 【已有数据库 ★ 必跑】放开 credit_source 取值到 'report'（报告赠送额度，2026-10-21）。
--   旧库上列已存在，上面的 ADD COLUMN 不会补约束，故这里显式重建；
--   先按「定义里含 credit_source」动态删除旧 CHECK（约束名可能不同），再建新的。
DO $$
DECLARE c TEXT;
BEGIN
  FOR c IN
    SELECT conname FROM pg_constraint
    WHERE conrelid = 'ask_messages'::regclass
      AND contype = 'c'
      AND pg_get_constraintdef(oid) LIKE '%credit_source%'
  LOOP
    EXECUTE format('ALTER TABLE ask_messages DROP CONSTRAINT %I', c);
  END LOOP;
  ALTER TABLE ask_messages ADD CONSTRAINT ask_messages_credit_source_check
    CHECK (credit_source IN ('pack', 'member', 'report'));
END $$;

CREATE INDEX IF NOT EXISTS idx_ask_messages_user ON ask_messages(user_id);
CREATE INDEX IF NOT EXISTS idx_ask_messages_created ON ask_messages(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ask_messages_source ON ask_messages(user_id, credit_source, created_at DESC);

ALTER TABLE ask_messages ENABLE ROW LEVEL SECURITY;

-- ★ CREATE POLICY 不支持 IF NOT EXISTS，重复执行会报 42710 —— 先 DROP 再建以保持幂等
DROP POLICY IF EXISTS "Users can view own ask messages" ON ask_messages;
CREATE POLICY "Users can view own ask messages" ON ask_messages
  FOR SELECT USING (auth.uid() = user_id);

-- ─────────────────────────────────────────────────────────────
-- 校验（可选，执行后人工核对）：
--   SELECT tablename, rowsecurity FROM pg_tables WHERE tablename = 'ask_messages';
--   -- 期望 rowsecurity = true
--   SELECT policyname, cmd FROM pg_policies WHERE tablename = 'ask_messages';
--   -- 期望仅有 "Users can view own ask messages"（无 INSERT/UPDATE/DELETE 策略 ⇒ 客户端不可写）
--   -- ★ 列名是 policyname（pg_policies 视图）；polname 属于底层表 pg_policy，用它查视图会报 42703
-- ─────────────────────────────────────────────────────────────
