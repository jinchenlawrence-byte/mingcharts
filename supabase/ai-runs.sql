-- AI 运行观测表（2026-11-09）
-- 目的：成功与失败两条路径都留痕；失败时必须能区分
--   no_key / http_error / timeout / truncated / json_invalid / section_short / compliance / unknown
-- 并在失败时保留 token（此前失败路径 usage 被直接丢弃）。
--
-- 字段口径：
--   outcome  成功 success / 部分降级 partial（紫微）/ 失败 failure
--   reason   失败原因码；成功为 null
--   hits     合规命中词（reason=compliance 时尽量非空）
--   degraded 降级为规则版的板块数（紫微 0-12）
--   sections 板块总数（紫微 12；其余可空）
--   request_id 报告 id 或随机 UUID；deployment_id 取 Vercel 部署标识
--
-- 仅服务端 service_role 写入/读取：启用 RLS 且不建 policy。

create table if not exists public.ai_runs (
  id                bigserial primary key,
  module            text not null,
  locale            text not null default 'zh-Hans',
  outcome           text not null check (outcome in ('success', 'partial', 'failure')),
  reason            text check (reason in (
                      'no_key', 'http_error', 'timeout', 'truncated',
                      'json_invalid', 'section_short', 'compliance', 'unknown'
                    )),
  hits              text[] not null default '{}',
  degraded          integer not null default 0,
  sections          integer,
  prompt_tokens     integer not null default 0,
  completion_tokens integer not null default 0,
  total_tokens      integer not null default 0,
  duration_ms       integer,
  request_id        text,
  deployment_id     text,
  created_at        timestamptz not null default now()
);

create index if not exists idx_ai_runs_module_created  on public.ai_runs (module, created_at desc);
create index if not exists idx_ai_runs_outcome_created  on public.ai_runs (outcome, created_at desc);
create index if not exists idx_ai_runs_created          on public.ai_runs (created_at);

alter table public.ai_runs enable row level security;
-- 不建 policy：anon / authenticated 均不可读写，仅 service_role 绕过 RLS。

-- ============================================================
-- 30 天保留：可直接执行的清理语句（建议每天执行一次）
-- ============================================================
delete from public.ai_runs where created_at < now() - interval '30 days';

-- 是否需要在 Supabase 侧配定时任务？
--   需要「自动清理」就配一次；否则靠脚本/手工触发上面的 DELETE 也可以。
--   方式 A（推荐，Supabase 原生 Cron）：Dashboard → Integrations → Cron，
--     新建每日任务执行：
--       delete from public.ai_runs where created_at < now() - interval '30 days';
--   方式 B（已启用 pg_cron 扩展时，SQL Editor 执行一次）：
--     select cron.schedule(
--       'ai_runs_retention_30d',
--       '20 4 * * *',
--       $$delete from public.ai_runs where created_at < now() - interval '30 days'$$
--     );
--     -- 查看/取消：select * from cron.job;  select cron.unschedule('ai_runs_retention_30d');
--   方式 C（无 pg_cron）：GitHub Actions / 任意调度器每天用 service_role 执行上面的 DELETE。

-- ============================================================
-- 常用查询
-- ============================================================
-- 近 24 小时 reason 分布
-- select module, outcome, reason, count(*) as runs, sum(degraded) as degraded_sections,
--        sum(total_tokens) as tokens, round(avg(duration_ms)) as avg_ms
-- from public.ai_runs
-- where created_at > now() - interval '24 hours'
-- group by 1, 2, 3
-- order by 1, 4 desc;

-- 合规命中词统计（真合规命中 vs 其他失败）
-- select module, h as hit_word, count(*) as n
-- from public.ai_runs, unnest(hits) as h
-- where reason = 'compliance' and created_at > now() - interval '7 days'
-- group by 1, 2
-- order by 1, 3 desc;
