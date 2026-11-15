create schema if not exists combuslab_internal;

create table combuslab_internal.chart_assistant_quota (
  singleton boolean primary key default true check (singleton),
  minute_start timestamptz not null,
  used integer not null check (used between 1 and 12)
);

alter table combuslab_internal.chart_assistant_quota enable row level security;
revoke all on combuslab_internal.chart_assistant_quota from public, anon, authenticated;
grant usage on schema combuslab_internal to service_role;
grant select, insert, update on combuslab_internal.chart_assistant_quota to service_role;

create function public.reserve_chart_assistant_request()
returns boolean
language plpgsql
security invoker
set search_path = ''
as $$
declare
  bucket timestamptz := pg_catalog.date_trunc('minute', pg_catalog.statement_timestamp());
  reserved boolean;
begin
  insert into combuslab_internal.chart_assistant_quota as quota (singleton, minute_start, used)
  values (true, bucket, 1)
  on conflict (singleton) do update
    set minute_start = excluded.minute_start,
        used = case when quota.minute_start < excluded.minute_start then 1 else quota.used + 1 end
    where quota.minute_start < excluded.minute_start
       or (quota.minute_start = excluded.minute_start and quota.used < 12)
  returning true into reserved;

  return coalesce(reserved, false);
end;
$$;

revoke execute on function public.reserve_chart_assistant_request() from public, anon, authenticated;
grant execute on function public.reserve_chart_assistant_request() to service_role;
