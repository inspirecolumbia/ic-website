-- The foundation branch's "public can read published jobs" policy and this
-- branch's "authenticated can read all jobs" policy both target the
-- authenticated role for SELECT, which the advisor flags: Postgres has to
-- evaluate and OR together every permissive policy matching a role/command,
-- so two overlapping ones cost more than one. Consolidate into a single
-- select policy covering both anon and authenticated, same logic either way
-- (published, or a recognized staff role).
drop policy "public can read published jobs" on public.jobs;
drop policy "authenticated can read all jobs" on public.jobs;

create policy "read jobs"
on public.jobs for select
to anon, authenticated
using (
  status = 'published'
  or (select auth.jwt() ->> 'user_role') in ('member', 'staff', 'admin')
);
