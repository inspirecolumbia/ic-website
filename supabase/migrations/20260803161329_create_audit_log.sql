create table public.audit_log (
  id uuid primary key default gen_random_uuid(),
  table_name text not null,
  record_id uuid not null,
  action text not null check (action in ('insert', 'update', 'delete')),
  actor_clerk_user_id text not null,
  actor_role text,
  old_data jsonb,
  new_data jsonb,
  created_at timestamptz not null default now()
);

alter table public.audit_log enable row level security;

grant select on public.audit_log to authenticated;
revoke insert, update, delete on public.audit_log from anon, authenticated;

create policy "admin can read audit log"
on public.audit_log for select
to authenticated
using ((select auth.jwt() ->> 'user_role') = 'admin');

-- security definer so the trigger can write to audit_log regardless of the
-- invoking role's own grants (staff/admin only have select on audit_log,
-- same reasoning as rls_auto_enable() in the foundation branch: the function
-- itself, not the calling role, needs the privilege). Pinned empty
-- search_path to avoid the mutable-search-path advisor lint.
create function public.log_jobs_audit()
returns trigger language plpgsql security definer set search_path = ''
as $$
begin
  insert into public.audit_log (table_name, record_id, action, actor_clerk_user_id, actor_role, old_data, new_data)
  values (
    'jobs',
    coalesce(new.id, old.id),
    lower(tg_op),
    coalesce(auth.jwt() ->> 'sub', 'unknown'),
    auth.jwt() ->> 'user_role',
    case when tg_op in ('update', 'delete') then to_jsonb(old) else null end,
    case when tg_op in ('insert', 'update') then to_jsonb(new) else null end
  );
  return coalesce(new, old);
end;
$$;

create trigger jobs_audit_log
after insert or update or delete on public.jobs
for each row execute function public.log_jobs_audit();
