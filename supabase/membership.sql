-- 会员订阅迁移（幂等，可在 Supabase SQL Editor 重复执行）

-- profiles 表已包含 is_member / member_expire_at 两个字段（见 schema.sql），
-- 这里补充一个记录套餐类型的字段，供状态查询与续费叠加使用。
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS member_plan TEXT;

-- 会员状态说明：
--   profiles.is_member        —— 是否为会员（布尔）
--   profiles.member_plan      —— 套餐类型（monthly / yearly）
--   profiles.member_expire_at —— 会员到期时间
--   每次开通/续费的支付流水记录在 payments 表（payment_type = monthly / yearly）
