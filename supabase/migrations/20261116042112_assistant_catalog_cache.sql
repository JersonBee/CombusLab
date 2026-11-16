create table combuslab_internal.assistant_catalog_cache (
  cache_key text primary key check (cache_key in ('evidence-v1', 'inventory-v1', 'test-days-psi-21-v1')),
  payload jsonb not null check (jsonb_typeof(payload) = 'object' and jsonb_typeof(payload->'rows') is not distinct from 'array'),
  expires_at timestamptz not null
);

alter table combuslab_internal.assistant_catalog_cache enable row level security;
revoke all on combuslab_internal.assistant_catalog_cache from public, anon, authenticated;
grant select, insert, update on combuslab_internal.assistant_catalog_cache to service_role;

create function public.read_assistant_catalog_cache(cache_key text)
returns jsonb
language sql stable security invoker set search_path = ''
as $$
  select cache.payload from combuslab_internal.assistant_catalog_cache as cache
  where cache.cache_key = $1 and cache.expires_at > statement_timestamp();
$$;

create function public.write_assistant_catalog_cache(cache_key text, payload jsonb)
returns void
language sql security invoker set search_path = ''
as $$
  insert into combuslab_internal.assistant_catalog_cache as cache (cache_key, payload, expires_at)
  values ($1, $2, statement_timestamp() + interval '5 minutes')
  on conflict on constraint assistant_catalog_cache_pkey do update
  set payload = excluded.payload, expires_at = excluded.expires_at
  where cache.expires_at <= statement_timestamp();
$$;

revoke execute on function public.read_assistant_catalog_cache(text) from public, anon, authenticated;
revoke execute on function public.write_assistant_catalog_cache(text, jsonb) from public, anon, authenticated;
grant execute on function public.read_assistant_catalog_cache(text) to service_role;
grant execute on function public.write_assistant_catalog_cache(text, jsonb) to service_role;
