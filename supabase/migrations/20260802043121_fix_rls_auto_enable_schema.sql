-- Row Level Security (RLS) is Postgres's per-row access control: even a role
-- with a table-level grant can be restricted to a subset of rows by policy.
-- Supabase's Data API (PostgREST) exposes tables straight to HTTP clients
-- with no app-layer code in between, so RLS is the only thing standing
-- between "anon key leaked in the client bundle" and "anyone can read every
-- row" once a table holds anything sensitive (future applicant PII tables,
-- for example).
--
-- This project has "Enable automatic RLS" turned on, which creates a
-- platform-managed Postgres event trigger, `ensure_rls`, firing on every
-- `CREATE TABLE` anywhere in the database (via any tool: a migration, the
-- Studio UI, a raw psql session). It calls public.rls_auto_enable() to force
-- RLS on immediately, so a future table can't accidentally ship without it
-- even if the migration that creates it forgets to say so.
--
-- The problem this migration fixes: rls_auto_enable() was created in the
-- `public` schema, which is exactly the schema PostgREST exposes over HTTP.
-- Postgres functions default to EXECUTE-able by the PUBLIC pseudo-role, so
-- the security advisor flagged it as callable by anon/authenticated via
-- POST /rest/v1/rpc/rls_auto_enable. Moving it to a `private` schema (never
-- exposed to the Data API) and revoking EXECUTE removes that path entirely.
--
-- Safe to do without breaking the safety net: Postgres binds event triggers
-- to a function by OID, not by schema-qualified name, so `ALTER FUNCTION
-- ... SET SCHEMA` preserves the `ensure_rls` binding. Verified directly
-- against the dev project after this migration ran: the trigger still fires
-- and still enables RLS on a freshly created table.
--
-- Guarded with an existence check because local `supabase start` stacks,
-- and any project created without "Enable automatic RLS", don't have this
-- function at all - the block below is then a no-op.
do $$
begin
  if exists (
    select 1
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where p.proname = 'rls_auto_enable' and n.nspname = 'public'
  ) then
    create schema if not exists private;
    alter function public.rls_auto_enable() set schema private;
    revoke execute on function private.rls_auto_enable() from public, anon, authenticated;
  end if;
end;
$$;
