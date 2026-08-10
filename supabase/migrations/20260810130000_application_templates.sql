-- First step of a "no external Google Form needed" feature: staff pick an
-- application template per job instead of only choosing between the
-- built-in form or an external apply_url. Only one template exists for now
-- (this branch's fixed-field form, seeded below) -- a future branch adds a
-- template *builder* so staff/admin can define new ones without code
-- changes. Read/write is staff/admin only: unlike jobs, members never
-- manage postings, and the public application form doesn't need to query
-- this table yet (it still renders the one fixed field set directly).
create table public.application_templates (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_at timestamptz not null default now()
);

alter table public.application_templates enable row level security;

revoke all on public.application_templates from anon, authenticated;
grant select, insert, update, delete on public.application_templates to authenticated;

create policy "staff and admin can read templates"
on public.application_templates for select
to authenticated
using ((select auth.jwt() ->> 'user_role') in ('staff', 'admin'));

create policy "staff and admin can insert templates"
on public.application_templates for insert
to authenticated
with check ((select auth.jwt() ->> 'user_role') in ('staff', 'admin'));

create policy "staff and admin can update templates"
on public.application_templates for update
to authenticated
using ((select auth.jwt() ->> 'user_role') in ('staff', 'admin'))
with check ((select auth.jwt() ->> 'user_role') in ('staff', 'admin'));

create policy "staff and admin can delete templates"
on public.application_templates for delete
to authenticated
using ((select auth.jwt() ->> 'user_role') in ('staff', 'admin'));

insert into public.application_templates (name) values ('Associate Application');

alter table public.jobs
  add column application_template_id uuid references public.application_templates(id);

-- Backfill: every existing job that already uses the built-in form (no
-- external apply_url) gets pointed at the one template that models exactly
-- what that form renders today.
update public.jobs
set application_template_id = (select id from public.application_templates where name = 'Associate Application')
where apply_url is null;
