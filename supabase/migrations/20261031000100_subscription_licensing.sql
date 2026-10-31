-- Shared Depo-Pro subscription/licensing state. Server-only: no client policies.
create table if not exists public.licensing_accounts (
  user_id uuid primary key references auth.users(id) on delete cascade,
  stripe_customer_id text unique,
  created_at timestamptz not null default now()
);
create table if not exists public.licensing_subscriptions (
  user_id uuid primary key references public.licensing_accounts(user_id) on delete cascade,
  stripe_subscription_id text unique,
  state text not null default 'trial' check (state in ('trial','active','grace','canceled_at_period_end','expired','suspended')),
  trial_ends_at timestamptz not null default (now() + interval '7 days'),
  paid_through timestamptz,
  first_failure_at timestamptz,
  grace_ends_at timestamptz,
  last_stripe_event_created bigint not null default 0,
  updated_at timestamptz not null default now()
);
create table if not exists public.licensing_devices (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.licensing_accounts(user_id) on delete cascade,
  fingerprint_hash text not null,
  display_name text not null,
  status text not null default 'active' check (status in ('active','revoked')),
  registered_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  unique(user_id, fingerprint_hash)
);
create table if not exists public.licensing_live_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.licensing_accounts(user_id) on delete cascade,
  device_id uuid not null references public.licensing_devices(id),
  state text not null default 'active' check (state in ('active','closed','stale')),
  idempotency_key uuid not null,
  grant_expires_at timestamptz not null,
  reconnect_until timestamptz not null,
  heartbeat_at timestamptz not null default now(),
  opened_at timestamptz not null default now(),
  closed_at timestamptz,
  unique(user_id, idempotency_key)
);
create unique index if not exists licensing_one_active_session
  on public.licensing_live_sessions(user_id) where state='active';
create table if not exists public.licensing_usage_ledger (
  id bigint generated always as identity primary key,
  user_id uuid not null references public.licensing_accounts(user_id) on delete cascade,
  session_id uuid references public.licensing_live_sessions(id),
  idempotency_key uuid not null unique,
  seconds integer not null check (seconds >= 0),
  recorded_at timestamptz not null default now()
);
create table if not exists public.licensing_webhook_events (
  stripe_event_id text primary key,
  event_type text not null,
  event_created bigint not null,
  processed_at timestamptz not null default now()
);

alter table public.licensing_accounts enable row level security;
alter table public.licensing_subscriptions enable row level security;
alter table public.licensing_devices enable row level security;
alter table public.licensing_live_sessions enable row level security;
alter table public.licensing_usage_ledger enable row level security;
alter table public.licensing_webhook_events enable row level security;
revoke all on public.licensing_accounts, public.licensing_subscriptions,
  public.licensing_devices, public.licensing_live_sessions,
  public.licensing_usage_ledger, public.licensing_webhook_events from anon, authenticated;

create or replace function public.licensing_claim_live_session(
  p_user_id uuid, p_device_id uuid, p_idempotency_key uuid
) returns public.licensing_live_sessions
language plpgsql security definer set search_path=public,pg_temp as $$
declare result public.licensing_live_sessions;
begin
  update public.licensing_live_sessions set state='stale'
   where user_id=p_user_id and state='active' and grant_expires_at <= now();
  insert into public.licensing_live_sessions(
    user_id,device_id,idempotency_key,grant_expires_at,reconnect_until
  ) values (
    p_user_id,p_device_id,p_idempotency_key,now()+interval '24 hours',now()+interval '24 hours 10 minutes'
  ) on conflict(user_id,idempotency_key) do update set idempotency_key=excluded.idempotency_key
  returning * into result;
  return result;
exception when unique_violation then
  raise exception using errcode='P0001', message='session_conflict';
end $$;
revoke all on function public.licensing_claim_live_session(uuid,uuid,uuid) from public,anon,authenticated;
grant execute on function public.licensing_claim_live_session(uuid,uuid,uuid) to service_role;
