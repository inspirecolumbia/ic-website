-- The application form's required school/academic fields have nowhere to
-- land on the applications table yet. Nullable here (matching how `phone`
-- is already nullable) -- "required except gpa" is enforced at the app
-- layer in lib/applications.ts, same division of responsibility as the
-- existing first_name/last_name/email validation.

alter table public.applications
  add column school_email text,
  add column school text,
  add column major text,
  add column year_of_study text,
  add column gpa numeric;

-- The redacted audit trigger (20260805090100_application_audit_triggers.sql)
-- strips PII from what lands in audit_log. These new columns are personal/
-- academic info of the same sensitivity as the fields already redacted, so
-- the redaction list needs to grow with them or they'd leak into audit_log
-- unredacted. Same trigger, same signature -- just widening what it strips.
create or replace function private.log_application_audit()
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
                          - 'school_email' - 'school' - 'major' - 'year_of_study' - 'gpa'
      else null end,
    case when lower(tg_op) in ('insert', 'update')
      then to_jsonb(new) - 'first_name' - 'last_name' - 'email' - 'phone'
                          - 'school_email' - 'school' - 'major' - 'year_of_study' - 'gpa'
      else null end
  );
  return coalesce(new, old);
end;
$$;
