create type public.job_status as enum ('draft', 'published', 'closed', 'archived');

create table public.jobs (
  id uuid primary key default gen_random_uuid(),
  slug text not null,
  title text not null,
  role text not null,
  location text not null,
  commitment_type text not null,
  description text not null,
  responsibilities text[] not null default '{}',
  qualifications text[] not null default '{}',
  apply_url text not null,
  status public.job_status not null default 'draft',
  display_order integer not null default 0,
  posting_date date,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint jobs_slug_unique unique (slug)
);

-- Partial index matches the exact query shape the public jobs list uses
-- (published rows, ordered for display); rows in other statuses never hit
-- this index and don't bloat it.
create index jobs_published_idx on public.jobs (display_order, published_at desc)
  where status = 'published';

-- security invoker + pinned search_path: this trigger function should run as
-- whichever role performs the update (not its owner), and an empty
-- search_path stops it from silently resolving to an attacker-controlled
-- object if someone creates a same-named function/table earlier in the path.
create function public.set_updated_at()
returns trigger language plpgsql security invoker set search_path = ''
as $$ begin new.updated_at = now(); return new; end; $$;

create trigger jobs_set_updated_at
before update on public.jobs
for each row execute function public.set_updated_at();

alter table public.jobs enable row level security;

-- Explicit grant/revoke on top of RLS, not instead of it: RLS decides which
-- rows a role can see, but the role still needs a table-level grant to query
-- at all. Revoking write grants from anon/authenticated is defense in depth,
-- if a future migration accidentally adds a permissive write policy, writes
-- still fail closed because the grant isn't there.
grant select on public.jobs to anon, authenticated;
revoke insert, update, delete on public.jobs from anon, authenticated;

create policy "public can read published jobs"
on public.jobs for select
to anon, authenticated
using (status = 'published');

-- TODO(Authorization branch): add staff-scoped write policies once a role
-- model exists. Do not copy this shape onto future applicant/application
-- tables — those need a materially stricter model.
