-- Shared Depo-Pro licensing state. These tables live in the exposed public
-- schema so the Edge Function can reach them through PostgREST. RLS and
-- explicit grants still prevent either browser role from reading them.

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
  id uuid primary key default gen_random_uuid(), user_id uuid not null references public.licensing_accounts(user_id) on delete cascade,
  fingerprint_hash text not null, display_name text not null, status text not null default 'active' check (status in ('active','revoked')),
  registered_at timestamptz not null default now(), last_seen_at timestamptz not null default now(), unique(user_id,fingerprint_hash)
);
create table if not exists public.licensing_live_sessions (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references public.licensing_accounts(user_id) on delete cascade,
  device_id uuid not null references public.licensing_devices(id), state text not null check (state in ('active','closed','stale')),
  idempotency_key uuid not null, grant_expires_at timestamptz not null, reconnect_until timestamptz not null,
  heartbeat_at timestamptz not null default now(), opened_at timestamptz not null default now(), closed_at timestamptz,
  unique(user_id,idempotency_key)
);
create unique index if not exists licensing_live_sessions_one_active_per_user on public.licensing_live_sessions(user_id) where state='active';
create index if not exists licensing_live_sessions_device_idx on public.licensing_live_sessions(device_id);
create table if not exists public.licensing_usage_ledger (
  id bigint generated always as identity primary key, user_id uuid not null references public.licensing_accounts(user_id) on delete cascade,
  session_id uuid references public.licensing_live_sessions(id), idempotency_key uuid not null unique,
  seconds integer not null check(seconds>=0), recorded_at timestamptz not null default now()
);
create index if not exists licensing_usage_ledger_user_idx on public.licensing_usage_ledger(user_id);
create index if not exists licensing_usage_ledger_session_idx on public.licensing_usage_ledger(session_id);
create table if not exists public.licensing_webhook_events (
  stripe_event_id text primary key, event_type text not null, event_created bigint not null,
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
  public.licensing_usage_ledger, public.licensing_webhook_events
  from anon, authenticated;
grant all on public.licensing_accounts, public.licensing_subscriptions,
  public.licensing_devices, public.licensing_live_sessions,
  public.licensing_usage_ledger, public.licensing_webhook_events
  to service_role;
grant usage, select on sequence public.licensing_usage_ledger_id_seq to service_role;
