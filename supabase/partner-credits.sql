-- 伙伴额度账本（白标 v1 最后一环：支付成功 → 入账；交付报告 → 扣减）
--
-- 为什么用【账本】（append-only）而不是一个 balance 字段：
--   ① 支付、消耗、人工调整都是"事件"，账本天然可审计、可对账，出错能追到哪一笔
--   ② 幂等靠唯一索引实现，而不是靠"先查再加"（并发下必错）
--   ③ 余额 = sum(delta)，没有第二个真相需要同步
--
-- ★ 无 RLS 策略：伙伴额度是商业数据，anon/authenticated 读不到；读写只走 service_role。

CREATE TABLE IF NOT EXISTS partner_credits (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  -- 伙伴账号（= 报告所有者）。v1 不收客户联系方式，所以只用 auth 用户 id
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  -- 正数入账、负数扣减；不允许 0 行（噪音）
  delta INTEGER NOT NULL CHECK (delta <> 0),
  reason TEXT NOT NULL CHECK (reason IN ('purchase', 'consume', 'refund', 'adjust')),
  -- 幂等键：purchase 用支付单号（PAY_xxx），consume 用报告 id，adjust 用人工备注
  ref TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ① 购买幂等：同一笔支付只入账一次（webhook 重试不会重复加额度）
CREATE UNIQUE INDEX IF NOT EXISTS idx_partner_credits_purchase_ref
  ON partner_credits (ref) WHERE reason = 'purchase' AND ref IS NOT NULL;

-- ② 消耗幂等：同一份报告只扣一次（重复交付不会多扣）
CREATE UNIQUE INDEX IF NOT EXISTS idx_partner_credits_consume_ref
  ON partner_credits (ref) WHERE reason = 'consume' AND ref IS NOT NULL;

-- ③ 退款冲抵幂等：同一笔支付只冲抵一次
CREATE UNIQUE INDEX IF NOT EXISTS idx_partner_credits_refund_ref
  ON partner_credits (ref) WHERE reason = 'refund' AND ref IS NOT NULL;

-- ④ 余额查询 / 伙伴列表用
CREATE INDEX IF NOT EXISTS idx_partner_credits_user
  ON partner_credits (user_id, created_at DESC);

ALTER TABLE partner_credits ENABLE ROW LEVEL SECURITY;

COMMENT ON TABLE partner_credits IS
  '伙伴额度账本（append-only）。余额 = SUM(delta)。写入只走 service_role：'
  '购买由 webhook 入账（reason=purchase，ref=PAY_xxx），交付由运维脚本扣减（reason=consume，ref=reportId）。';
COMMENT ON COLUMN partner_credits.delta IS
  '正=入账（份数），负=扣减。单位是"报告份数"，不是货币。';
