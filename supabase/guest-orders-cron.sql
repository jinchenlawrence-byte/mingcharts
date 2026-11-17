-- ============================================================================
-- 游客订单补偿 · 每 10 分钟调用 /api/cron/guest-orders（Supabase pg_cron + pg_net）
--
-- 为什么不用 Vercel Cron：Hobby 套餐只允许「每天最多一次」，
--   vercel.json 里 */10 * * * * 会让整个构建失败。本文件把调度搬到数据库侧，
--   接口 /api/cron/guest-orders 的逻辑与鉴权完全不变。
--
-- ★ 执行本文件之前，必须先在 SQL Editor 里写入密钥（不要把密钥写进本文件）：
--   ① 打开 Supabase Dashboard → SQL Editor，执行以下语句（只执行一次）：
--        select vault.create_secret(
--          '<你的 CRON_SECRET>',
--          'guest_orders_cron_secret',
--          'pg_cron 调 /api/cron/guest-orders 的 Bearer 凭据'
--        );
--      <你的 CRON_SECRET> 必须与 Vercel 环境变量 CRON_SECRET 完全一致。
--   ② 若提示同名 secret 已存在，改用（覆盖值）：
--        select vault.update_secret(
--          (select id from vault.secrets where name = 'guest_orders_cron_secret'),
--          '<你的 CRON_SECRET>'
--        );
--   ③ 然后整份执行本文件；幂等，可重复执行。
--
-- 前置扩展：Database → Extensions 里启用 pg_cron 与 pg_net
--   （下面也会尝试 create extension if not exists；已启用时是 no-op）。
--
-- 排查：
--   select status, return_message, start_time from cron.job_run_details
--   where jobid = (select jobid from cron.job where jobname = 'guest-orders-every-10m')
--   order by start_time desc limit 10;
--   select status_code, content, created from net._http_response order by created desc limit 10;
--   —— 若 status_code=401，说明 Vault 里的密钥与 Vercel 的 CRON_SECRET 不一致或未写入。
-- ============================================================================

begin;

create extension if not exists pg_cron with schema pg_catalog;
create extension if not exists pg_net;

-- 幂等：先按 jobname 撤掉旧任务（不存在则跳过），再重建
do $outer$
declare
  v_job_id bigint;
begin
  select jobid into v_job_id from cron.job where jobname = 'guest-orders-every-10m';
  if v_job_id is not null then
    perform cron.unschedule(v_job_id);
  end if;
end
$outer$;

-- 每 10 分钟 POST 一次；Bearer 从 Vault 读取，文件里没有明文密钥。
-- 读不到密钥时头会退化成 "Bearer "，接口按 401 拒绝（fail-closed）。
select cron.schedule(
  'guest-orders-every-10m',
  '*/10 * * * *',
  $job$
  select net.http_post(
    url := 'https://www.mingcharts.com/api/cron/guest-orders',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || coalesce(
        (
          select decrypted_secret
          from vault.decrypted_secrets
          where name = 'guest_orders_cron_secret'
          limit 1
        ),
        ''
      )
    ),
    body := '{}'::jsonb,
    timeout_milliseconds := 30000
  );
  $job$
);

commit;

-- ── 自查 1：已建的 job 名称与调度表达式 ─────────────────────────
select jobid, jobname, schedule, active
from cron.job
where jobname = 'guest-orders-every-10m';

-- ── 自查 2：Vault 密钥是否已写入（只显示有无，不显示明文）────────
select name,
       (decrypted_secret is not null and decrypted_secret <> '') as secret_present
from vault.decrypted_secrets
where name = 'guest_orders_cron_secret';
