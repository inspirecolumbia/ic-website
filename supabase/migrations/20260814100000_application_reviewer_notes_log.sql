-- Replaces the single reviewer_notes text column with an append-only log:
-- multiple staff/admins can each leave their own note over the life of an
-- application, forum/chat-thread style, rather than overwriting one shared
-- field. Modeled on application_status_history's read-only-to-clients shape,
-- except inserts here come directly from staff/admin (not a trigger), so
-- this table needs its own insert policy rather than being system-only.

create table public.application_reviewer_notes (
  id uuid primary key default gen_random_uuid(),
  application_id uuid not null references public.applications (id) on delete cascade,
  author_clerk_user_id text not null,
  author_role text,
  note text not null,
  created_at timestamptz not null default now()
);

create index application_reviewer_notes_application_id_idx on public.application_reviewer_notes (application_id);
alter table public.application_reviewer_notes enable row level security;

grant select, insert on public.application_reviewer_notes to authenticated;
revoke update, delete on public.application_reviewer_notes from authenticated;

create policy "staff and admin can read reviewer notes"
on public.application_reviewer_notes for select
to authenticated
using ((select auth.jwt() ->> 'user_role') in ('staff', 'admin'));

-- author_clerk_user_id must match the caller's own sub, not just any staff
-- id -- otherwise one staff member could post a note under another's name.
create policy "staff and admin can add reviewer notes"
on public.application_reviewer_notes for insert
to authenticated
with check (
  (select auth.jwt() ->> 'user_role') in ('staff', 'admin')
  and author_clerk_user_id = (select auth.jwt() ->> 'sub')
);

-- The old single-value column this table replaces. Nothing in the app
-- layer reads or writes it anymore as of this migration.
alter table public.applications drop column reviewer_notes;
