-- Admin-only History deletion. audit_log had no delete policy at all until
-- now (deliberate, from the Authorization branch). Deleting an audit trail
-- needs its own tamper-evident record of who deleted what, so this migration
-- also adds security_events (append-only, admin-read-only, no update/delete
-- policy at all -- not reachable through the ordinary History UI) and a
-- SECURITY INVOKER function that performs the audit_log delete and the
-- security_events insert in one transaction, both governed by the RLS
-- policies below (no duplicated authorization logic, no privilege
-- escalation -- a non-admin's call fails on the insert's WITH CHECK).

create policy "admin can delete audit log"
on public.audit_log for delete
to authenticated
using ((select auth.jwt() ->> 'user_role') = 'admin');

create table public.security_events (
  id uuid primary key default gen_random_uuid(),
  event_type text not null check (event_type in ('history_bulk_delete')),
  actor_clerk_user_id text not null,
  actor_role text not null,
  deleted_count integer not null,
  deleted_ids uuid[] not null,
  filters_snapshot jsonb,
  scope text not null check (scope in ('selected', 'page', 'all_matching')),
  created_at timestamptz not null default now()
);

alter table public.security_events enable row level security;

grant select, insert on public.security_events to authenticated;
revoke update, delete on public.security_events from anon, authenticated;

create policy "admin can read security events"
on public.security_events for select
to authenticated
using ((select auth.jwt() ->> 'user_role') = 'admin');

create policy "admin can record security events"
on public.security_events for insert
to authenticated
with check (
  (select auth.jwt() ->> 'user_role') = 'admin'
  and actor_clerk_user_id = (select auth.jwt() ->> 'sub')
  and actor_role = (select auth.jwt() ->> 'user_role')
);

create function public.admin_bulk_delete_history(p_ids uuid[], p_scope text, p_filters jsonb default null)
returns integer
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_deleted_count integer;
begin
  delete from public.audit_log where id = any(p_ids);
  get diagnostics v_deleted_count = row_count;

  insert into public.security_events (event_type, actor_clerk_user_id, actor_role, deleted_count, deleted_ids, filters_snapshot, scope)
  values ('history_bulk_delete', auth.jwt() ->> 'sub', auth.jwt() ->> 'user_role', v_deleted_count, p_ids, p_filters, p_scope);

  return v_deleted_count;
end;
$$;

grant execute on function public.admin_bulk_delete_history(uuid[], text, jsonb) to authenticated;
