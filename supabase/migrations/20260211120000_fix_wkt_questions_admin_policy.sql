-- Fix: "admins manage wkt questions" policy referenced is_admin() which does not exist.
-- Replace with inline admin check (matches rest of project RLS).

drop policy if exists "admins manage wkt questions" on wkt_questions;
create policy "admins manage wkt questions"
on wkt_questions for all
to authenticated
using (exists (select 1 from profiles p where p.id = auth.uid() and p.role = 'ADMIN'))
with check (exists (select 1 from profiles p where p.id = auth.uid() and p.role = 'ADMIN'));
