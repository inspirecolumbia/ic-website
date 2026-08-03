-- Resolves the TODO left in create_jobs_table.sql: real staff-scoped write
-- policies, now that a role model exists via Clerk. Clerk's Supabase
-- integration adds a `role: authenticated` claim to session tokens, so
-- Postgres's existing `to authenticated` targeting keeps working unchanged
-- even though these tokens aren't issued by Supabase Auth. A custom
-- `user_role` claim (mapped from Clerk publicMetadata.role) is what these
-- policies check to distinguish member/staff/admin.
--
-- Reverses the foundation branch's blanket revoke on writes: RLS now does
-- the narrowing instead of the table-level grant absence, exactly what that
-- migration's TODO comment anticipated.
grant insert, update, delete on public.jobs to authenticated;

-- Any signed-in role (member/staff/admin) can see every job regardless of
-- status, not just published ones. Combines via OR with the existing
-- "public can read published jobs" policy, no conflict: a member sees
-- published rows through the old policy and drafts through this one.
create policy "authenticated can read all jobs"
on public.jobs for select
to authenticated
using ((select auth.jwt() ->> 'user_role') in ('member', 'staff', 'admin'));

create policy "staff and admin can insert jobs"
on public.jobs for insert
to authenticated
with check ((select auth.jwt() ->> 'user_role') in ('staff', 'admin'));

create policy "staff and admin can update jobs"
on public.jobs for update
to authenticated
using ((select auth.jwt() ->> 'user_role') in ('staff', 'admin'))
with check ((select auth.jwt() ->> 'user_role') in ('staff', 'admin'));

create policy "staff and admin can delete jobs"
on public.jobs for delete
to authenticated
using ((select auth.jwt() ->> 'user_role') in ('staff', 'admin'));
