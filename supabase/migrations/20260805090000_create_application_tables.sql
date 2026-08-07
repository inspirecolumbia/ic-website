-- Applicant submissions. First PII-bearing tables in this schema, so the
-- RLS model here is deliberately stricter than jobs' broad-read shape (see
-- the warning comment in create_jobs_table.sql). Only staff/admin can read
-- application data; anon (unauthenticated applicants) can insert only, and
-- can never read anything back.

create type public.application_status as enum (
  'submitted', 'under_review', 'interviewing', 'offer', 'hired', 'rejected', 'withdrawn'
);

create table public.applications (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references public.jobs (id),
  first_name text not null,
  last_name text not null,
  email text not null,
  phone text,
  status public.application_status not null default 'submitted',
  reviewer_notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Case-insensitive: a plain unique(job_id, email) would let Foo@x.com and
-- foo@x.com both through. Deliberately an expression index, not this repo's
-- usual `constraint applications_..._unique` naming -- don't "fix" this back.
create unique index applications_job_id_email_unique
  on public.applications (job_id, lower(email));

create index applications_job_id_idx on public.applications (job_id);
create index applications_status_idx on public.applications (status);

create trigger applications_set_updated_at
before update on public.applications
for each row execute function public.set_updated_at();

alter table public.applications enable row level security;

grant insert on public.applications to anon;
revoke select, update, delete on public.applications from anon;

create policy "anon can submit applications to published jobs"
on public.applications for insert
to anon
with check (
  exists (select 1 from public.jobs where jobs.id = job_id and jobs.status = 'published')
);

grant select on public.applications to authenticated;
grant update (status, reviewer_notes) on public.applications to authenticated;
grant delete on public.applications to authenticated; -- narrowed to admin by RLS below

create policy "staff and admin can read applications"
on public.applications for select
to authenticated
using ((select auth.jwt() ->> 'user_role') in ('staff', 'admin'));

create policy "staff and admin can update application status/notes"
on public.applications for update
to authenticated
using ((select auth.jwt() ->> 'user_role') in ('staff', 'admin'))
with check ((select auth.jwt() ->> 'user_role') in ('staff', 'admin'));

create policy "admin can delete applications"
on public.applications for delete
to authenticated
using ((select auth.jwt() ->> 'user_role') = 'admin');

-- Schema-only reference to a storage object; upload pipeline is a separate
-- later branch. storage_path is nullable and unwired to any bucket yet.
create table public.application_documents (
  id uuid primary key default gen_random_uuid(),
  application_id uuid not null references public.applications (id) on delete cascade,
  document_type text not null check (document_type in ('resume', 'cover_letter', 'other')),
  file_name text not null,
  storage_path text,
  created_at timestamptz not null default now()
);

create index application_documents_application_id_idx on public.application_documents (application_id);
alter table public.application_documents enable row level security;

grant insert on public.application_documents to anon;
revoke select, update, delete on public.application_documents from anon;
grant select on public.application_documents to authenticated;

create policy "anon can attach documents on submit"
on public.application_documents for insert
to anon
with check (true); -- application_id existence is enforced by the FK; bot/spam
                    -- protection (Turnstile) is verified server-side before
                    -- the insert happens, in a later branch.

create policy "staff and admin can read application documents"
on public.application_documents for select
to authenticated
using ((select auth.jwt() ->> 'user_role') in ('staff', 'admin'));

create table public.application_team_preferences (
  id uuid primary key default gen_random_uuid(),
  application_id uuid not null references public.applications (id) on delete cascade,
  team_name text not null,
  preference_rank integer not null check (preference_rank > 0),
  constraint application_team_preferences_application_id_rank_unique
    unique (application_id, preference_rank)
);

create index application_team_preferences_application_id_idx on public.application_team_preferences (application_id);
alter table public.application_team_preferences enable row level security;

grant insert on public.application_team_preferences to anon;
revoke select, update, delete on public.application_team_preferences from anon;
grant select on public.application_team_preferences to authenticated;

create policy "anon can submit team preferences"
on public.application_team_preferences for insert to anon with check (true);

create policy "staff and admin can read team preferences"
on public.application_team_preferences for select
to authenticated
using ((select auth.jwt() ->> 'user_role') in ('staff', 'admin'));

create table public.application_screening_answers (
  id uuid primary key default gen_random_uuid(),
  application_id uuid not null references public.applications (id) on delete cascade,
  question text not null,
  answer text not null,
  created_at timestamptz not null default now()
);

create index application_screening_answers_application_id_idx on public.application_screening_answers (application_id);
alter table public.application_screening_answers enable row level security;

grant insert on public.application_screening_answers to anon;
revoke select, update, delete on public.application_screening_answers from anon;
grant select on public.application_screening_answers to authenticated;

create policy "anon can submit screening answers"
on public.application_screening_answers for insert to anon with check (true);

create policy "staff and admin can read screening answers"
on public.application_screening_answers for select
to authenticated
using ((select auth.jwt() ->> 'user_role') in ('staff', 'admin'));

-- System-populated only: no insert grant to anon or authenticated at all.
-- The sole writer is the trigger function in the next migration.
create table public.application_status_history (
  id uuid primary key default gen_random_uuid(),
  application_id uuid not null references public.applications (id) on delete cascade,
  old_status public.application_status,
  new_status public.application_status not null,
  changed_by_clerk_user_id text not null,
  changed_by_role text,
  created_at timestamptz not null default now()
);

create index application_status_history_application_id_idx on public.application_status_history (application_id);
alter table public.application_status_history enable row level security;

grant select on public.application_status_history to authenticated;

create policy "staff and admin can read status history"
on public.application_status_history for select
to authenticated
using ((select auth.jwt() ->> 'user_role') in ('staff', 'admin'));
