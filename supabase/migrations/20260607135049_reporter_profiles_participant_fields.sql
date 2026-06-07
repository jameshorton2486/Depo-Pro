begin;

alter table public.reporter_profiles
  add column if not exists initials text,
  add column if not exists realtime_capable boolean not null default false,
  add column if not exists remote_swear_authority boolean not null default false,
  add column if not exists notary_commission_expiration date,
  add column if not exists preferred_signature_block text;

commit;
