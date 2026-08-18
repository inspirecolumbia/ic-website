-- Records every email actually sent to an applicant, from either the
-- single-applicant send (EmailApplicantDialog) or the mass-email tool, so
-- staff reviewing an application can see "we already emailed them, with
-- this template" instead of guessing. Only successful sends are logged --
-- an attempted-but-failed send isn't something that actually happened to
-- the applicant, so it isn't recorded here. Append-only, same shape as
-- application_reviewer_notes: staff/admin insert directly (not via a
-- trigger), never update or delete.
create table public.application_email_log (
  id uuid primary key default gen_random_uuid(),
  application_id uuid not null references public.applications (id) on delete cascade,
  sent_by_clerk_user_id text not null,
  sent_by_role text,
  -- Resend's own template id, plus a denormalized snapshot of its name at
  -- send time -- a template can be renamed or deleted in Resend later, and
  -- history should keep showing what it was actually called when sent, not
  -- silently change or go blank.
  template_id text not null,
  template_name text not null,
  recipient_email text not null,
  created_at timestamptz not null default now()
);

create index application_email_log_application_id_idx on public.application_email_log (application_id);
alter table public.application_email_log enable row level security;

grant select, insert on public.application_email_log to authenticated;
revoke update, delete on public.application_email_log from authenticated;

create policy "staff and admin can read application email log"
on public.application_email_log for select
to authenticated
using ((select auth.jwt() ->> 'user_role') in ('staff', 'admin'));

-- sent_by_clerk_user_id must match the caller's own sub, not just any
-- staff id -- otherwise one staff member could log a send under another's
-- name, same reasoning as application_reviewer_notes' insert policy.
create policy "staff and admin can log application emails"
on public.application_email_log for insert
to authenticated
with check (
  (select auth.jwt() ->> 'user_role') in ('staff', 'admin')
  and sent_by_clerk_user_id = (select auth.jwt() ->> 'sub')
);
