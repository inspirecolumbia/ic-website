create function private.log_application_status_change()
returns trigger language plpgsql security definer set search_path = ''
as $$
begin
  if new.status is distinct from old.status then
    insert into public.application_status_history
      (application_id, old_status, new_status, changed_by_clerk_user_id, changed_by_role)
    values (
      new.id, old.status, new.status,
      coalesce(auth.jwt() ->> 'sub', 'unknown'),
      auth.jwt() ->> 'user_role'
    );
  end if;
  return new;
end;
$$;

revoke execute on function private.log_application_status_change() from public, anon, authenticated;

create trigger applications_status_history
after update on public.applications
for each row execute function private.log_application_status_change();

-- Redacted audit trigger: unlike log_jobs_audit(), never snapshots PII
-- columns into audit_log (a second store with different retention rules).
create function private.log_application_audit()
returns trigger language plpgsql security definer set search_path = ''
as $$
begin
  insert into public.audit_log (table_name, record_id, action, actor_clerk_user_id, actor_role, old_data, new_data)
  values (
    'applications',
    coalesce(new.id, old.id),
    lower(tg_op),
    coalesce(auth.jwt() ->> 'sub', 'anon'),
    auth.jwt() ->> 'user_role',
    case when lower(tg_op) in ('update', 'delete')
      then to_jsonb(old) - 'first_name' - 'last_name' - 'email' - 'phone'
      else null end,
    case when lower(tg_op) in ('insert', 'update')
      then to_jsonb(new) - 'first_name' - 'last_name' - 'email' - 'phone'
      else null end
  );
  return coalesce(new, old);
end;
$$;

revoke execute on function private.log_application_audit() from public, anon, authenticated;

create trigger applications_audit_log
after insert or update or delete on public.applications
for each row execute function private.log_application_audit();
