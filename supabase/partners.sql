-- 伙伴申请（/partners 落地页表单）
--
-- 为什么先落库、不先发邮件：v1 是我们人工接单，申请量小；落库不会因为邮件服务抖动丢线索，
-- 而且能直接用 SQL 看漏斗。等量大再接通知（或做后台）。
--
-- ★ 无 RLS 策略：anon/authenticated 一律读不到（只允许 service_role）——
--   申请里含联系方式，不该被任何客户端读到。

CREATE TABLE IF NOT EXISTS partner_applications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  contact_kind TEXT NOT NULL CHECK (contact_kind IN ('line', 'wechat', 'email', 'ig', 'other')),
  contact TEXT NOT NULL,
  -- 现用平台/账号（如 IG @master_xxx），选填
  channel TEXT,
  -- 每月接单量区间（枚举值见 src/lib/partnerApply.ts PARTNER_VOLUMES）
  volume TEXT NOT NULL,
  -- 客群地区（台/港/马新/北美…），选填
  region TEXT,
  note TEXT,
  status TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'contacted', 'trial', 'active', 'rejected')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_partner_applications_created
  ON partner_applications (created_at DESC);

-- 只允许 service_role 访问：开 RLS 但不建任何策略
ALTER TABLE partner_applications ENABLE ROW LEVEL SECURITY;

COMMENT ON TABLE partner_applications IS
  '命理师白标申请。写入走 service_role（/api/partner/apply），读取只在运维侧（SQL/脚本）。';
COMMENT ON COLUMN partner_applications.status IS
  'new → contacted → trial（送 2 份） → active（已付费） / rejected';
