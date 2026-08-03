-- Same issue as rls_auto_enable() in the foundation branch: log_jobs_audit()
-- is SECURITY DEFINER in the API-exposed public schema, so Postgres's
-- default EXECUTE-to-PUBLIC grant makes it directly callable via
-- POST /rest/v1/rpc/log_jobs_audit by anon/authenticated, not just by the
-- trigger it's meant for. Move it to private (never exposed to the Data
-- API) and revoke EXECUTE as defense in depth. ALTER FUNCTION ... SET
-- SCHEMA preserves the trigger's binding by OID, same as the earlier fix.
create schema if not exists private;
alter function public.log_jobs_audit() set schema private;
revoke execute on function private.log_jobs_audit() from public, anon, authenticated;
