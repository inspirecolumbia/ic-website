-- pgTAP RLS tests for the jobs table. Run with `supabase test db`.
-- Wrapped in begin/rollback so the throwaway insert attempt never persists,
-- and so this can run repeatedly against a seeded database.
begin;
select plan(3);

-- Sanity check on the seed data itself, guards against the other two
-- assertions passing for the wrong reason (e.g. an empty table).
select is(
  (select count(*)::int from jobs where status = 'published'),
  1, 'seed contains exactly one published job'
);

-- `set local role` simulates a request authenticated as the anon Data API
-- role for the rest of this transaction, exercising RLS exactly as
-- PostgREST would.
set local role anon;
select is(
  (select count(*)::int from jobs),
  1, 'anon sees only published jobs'
);

-- 42501 is Postgres's insufficient_privilege code, expected here because we
-- revoke the INSERT grant from anon/authenticated at the table level (see
-- the create_jobs_table migration), independent of any RLS policy.
select throws_ok(
  $$ insert into jobs (slug, title, role, location, commitment_type, description, apply_url)
     values ('x','x','x','x','x','x','x') $$,
  '42501', null, 'anon cannot insert into jobs'
);

reset role;
select * from finish();
rollback;
