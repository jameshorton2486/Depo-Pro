-- B.3 + B.4 verification readout (non-mutating)

do $$
declare
  r record;
begin
  raise notice '--- BUCKET AUDIT ---';
  for r in
    select id, name, public, file_size_limit, allowed_mime_types
    from storage.buckets
    where name in ('depo-audio','depo-files','depo-exports','depo-chunks')
    order by name
  loop
    raise notice 'bucket=% public=% size=% mime_count=%',
      r.name, r.public, r.file_size_limit, coalesce(array_length(r.allowed_mime_types,1),0);
  end loop;
end
$$;

do $$
declare
  r record;
begin
  raise notice '--- RLS AUDIT (public schema tables) ---';
  for r in
    select
      t.tablename,
      t.rowsecurity as rls_enabled,
      count(p.policyname) as policy_count
    from pg_tables t
    left join pg_policies p
      on t.tablename = p.tablename and t.schemaname = p.schemaname
    where t.schemaname = 'public'
    group by t.tablename, t.rowsecurity
    order by t.rowsecurity asc, t.tablename
  loop
    raise notice 'table=% rls_enabled=% policy_count=%', r.tablename, r.rls_enabled, r.policy_count;
  end loop;
end
$$;

do $$
declare
  r record;
begin
  raise notice '--- POLICY AUDIT (public schema) ---';
  for r in
    select
      tablename,
      policyname,
      cmd
    from pg_policies
    where schemaname = 'public'
    order by tablename, cmd, policyname
  loop
    raise notice 'policy table=% cmd=% name=%', r.tablename, r.cmd, r.policyname;
  end loop;
end
$$;