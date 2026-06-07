begin;

alter table public.contacts
  add column if not exists details jsonb not null default '{}'::jsonb,
  add column if not exists firm_id uuid references public.firms(id);

create index if not exists contacts_firm_id_idx on public.contacts (firm_id);

alter table public.contacts
  drop constraint if exists contacts_type_check;

alter table public.contacts
  add constraint contacts_type_check
  check (
    type in (
      'attorney',
      'interpreter',
      'videographer',
      'participant',
      'firm',
      'reporter',
      'scheduler',
      'paralegal',
      'legal_assistant',
      'records_custodian',
      'corporate_representative'
    )
  );

commit;
