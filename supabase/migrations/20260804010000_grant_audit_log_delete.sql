-- create_audit_log.sql revoked insert/update/delete on audit_log from
-- authenticated (it was meant to be trigger-write-only at the time).
-- history_deletion.sql added an admin-scoped DELETE policy but missed
-- restoring the base DELETE grant -- Postgres checks table-level privileges
-- before RLS policies are even evaluated, so every delete attempt failed
-- with "permission denied for table audit_log" regardless of role or
-- policy. The DELETE policy itself already scopes this to admin only.
grant delete on public.audit_log to authenticated;
