-- 邀请奖励（2026-10-21）：邀请 1 位好友注册 → 邀请人得 ASK_PER_INVITE(3) 次追问（终身）。
--
-- 口径：
--   · 邀请码 = 邀请人 user id 的前 8 位（无需额外发码表）；服务端按前缀查 profiles 得到邀请人。
--   · 每人只能被邀请一次（invitee_id UNIQUE）；邀请人不能邀请自己。
--   · 额度不落在本表，而是「按行数实时折算」= count(inviter_id=me) × ASK_PER_INVITE − 已消耗(invite)。
--     好处：撤销邀请（删行）即同步扣回额度，不会出现账实不符。
--
-- 【执行方式】SQL Editor 整段执行，可重复执行。
CREATE TABLE IF NOT EXISTS invites (
  id BIGSERIAL PRIMARY KEY,
  inviter_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  invitee_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  -- 记录邀请码原文，便于事后核对是哪个码带来的
  ref_code TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  -- 一人只能被邀请一次（防重复领、防刷）
  CONSTRAINT invites_invitee_unique UNIQUE (invitee_id),
  -- 不能自己邀请自己
  CONSTRAINT invites_not_self CHECK (inviter_id <> invitee_id)
);

-- 与 events 同一安全口径：开启 RLS 且【零策略】，只有 service_role 能读写。
ALTER TABLE invites ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_invites_inviter ON invites(inviter_id);

-- ★ 必跑：把 ask_messages.credit_source 的允许值扩到包含 'invite'
--   （此前为 pack/member/report；幂等，重复执行安全）
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
  ALTER TABLE ask_messages
    ADD CONSTRAINT ask_messages_credit_source_check
    CHECK (credit_source IN ('pack', 'member', 'report', 'invite'));
END $$;

-- ── 核对查询 ──
-- 我的邀请战果：
-- SELECT i.created_at, p.email, i.ref_code
-- FROM invites i JOIN profiles p ON p.id = i.invitee_id
-- WHERE i.inviter_id = '<my-uid>' ORDER BY i.created_at DESC;
